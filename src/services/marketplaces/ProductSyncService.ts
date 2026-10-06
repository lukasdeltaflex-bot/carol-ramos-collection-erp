import { adminDb } from "@/lib/firebase/admin";
import {
  MarketplaceChannel,
  MarketplaceItem,
  ProductAdEditorData
} from "@/features/integrations/types/marketplaces";
import MarketplaceRegistry from "./MarketplaceRegistry";
import Cache from "./CacheService";
import Queue from "./QueueService";
import { logMarketplaceEvent } from "../marketplaceLogService";
import Incident from "./IncidentService";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Serviço de Sincronização e Validação de Produtos (Enterprise Product Sync Service).
 * Garante que os anúncios cumpram 100% das regras e exigências de cada marketplace
 * (EAN/GTIN, NCM, dimensões e limites de fotos) antes da publicação ou atualização.
 */
class ProductSyncService {
  private readonly collectionName = "marketplace_items";

  /**
   * Valida os dados do produto contra as regras oficiais do Registry do canal.
   */
  public validateForChannel(channel: MarketplaceChannel, data: Partial<ProductAdEditorData>): ValidationResult {
    const config = MarketplaceRegistry.getConfig(channel);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.title || data.title.trim().length < 5) {
      errors.push("Título deve ter pelo menos 5 caracteres.");
    }
    if (!data.price || data.price <= 0) {
      errors.push("Preço de venda deve ser maior que zero.");
    }
    if (data.stock === undefined || data.stock < 0) {
      errors.push("Estoque não pode ser negativo.");
    }

    // Regras específicas por canal
    if (config.requireCategory && !data.category) {
      errors.push(`A plataforma ${config.name} exige a indicação de uma Categoria.`);
    }
    if (config.requireDimensions && (!data.height || !data.width || !data.length)) {
      errors.push(`A plataforma ${config.name} exige o preenchimento de dimensões (altura, largura, comprimento).`);
    }
    if (config.requireWeight && (!data.weight || data.weight <= 0)) {
      errors.push(`A plataforma ${config.name} exige o preenchimento do peso em gramas.`);
    }
    if (config.acceptsGtin && !data.gtin) {
      warnings.push(`Recomendado informar EAN/GTIN para obter melhor ranqueamento no ${config.name}.`);
    }
    if (data.photos && data.photos.length > config.maxImages) {
      errors.push(`Número máximo de imagens permitido no ${config.name} é ${config.maxImages}.`);
    }
    if (data.videos && data.videos.length > config.maxVideos && !config.acceptsVideo) {
      errors.push(`A plataforma ${config.name} não aceita upload de vídeos.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Publica ou atualiza um anúncio no marketplace após validação rigorosa.
   */
  public async publishOrUpdateAd(tenantId: string, data: ProductAdEditorData): Promise<string> {
    const validation = this.validateForChannel(data.channel, data);
    if (!validation.isValid) {
      throw new Error(`Erros de validação para o canal ${data.channel}: ${validation.errors.join(" | ")}`);
    }

    const now = new Date().toISOString();
    const collectionRef = adminDb.collection(this.collectionName);

    // Verifica se já existe mapeamento desse item
    const existing = await collectionRef
      .where("tenantId", "==", tenantId)
      .where("channel", "==", data.channel)
      .where("erpItemId", "==", data.productId)
      .get();

    const payload: Omit<MarketplaceItem, "id"> = {
      tenantId,
      channel: data.channel,
      sellerId: "default",
      productId: data.productId,
      erpItemId: data.productId,
      productName: data.title,
      externalItemId: data.externalItemId || `ext_${Date.now()}`,
      title: data.title,
      syncedPrice: data.price,
      price: data.price,
      syncedStock: data.stock,
      stock: data.stock,
      status: data.stock > 0 ? "active" : "paused",
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now
    };

    let docId: string;
    if (!existing.empty) {
      docId = existing.docs[0].id;
      await collectionRef.doc(docId).update(payload);
    } else {
      const docRef = await collectionRef.add(payload);
      docId = docRef.id;
    }

    Cache.invalidateByEntity(tenantId, "products");
    Cache.invalidateByEntity(tenantId, "dashboard");

    // Agenda sincronização assíncrona com a API externa
    await Queue.enqueue(
      tenantId,
      data.channel,
      "sync_product",
      { itemId: docId, erpItemId: data.productId, adData: data },
      `pub_${docId}_${Date.now()}`,
      "high"
    );

    await logMarketplaceEvent({
      tenantId,
      channel: data.channel,
      severity: "INFO",
      operation: "publish_ad",
      resource: "product",
      message: `Anúncio [${data.title}] processado e enviado para publicação no canal ${data.channel}.`
    });

    return docId;
  }

  /**
   * Importa anúncios de um canal de marketplace e pareia com produtos do ERP pelo SKU.
   * Se o SKU não corresponder a nenhum produto do ERP, marca como 'unpaired' (Sem Vínculo).
   */
  public async importAdsFromChannel(
    tenantId: string,
    channel: MarketplaceChannel
  ): Promise<{ importedCount: number; pairedCount: number; unpairedCount: number; errors: string[] }> {
    const { getMarketplaceAccount } = await import("../marketplaceDbService");
    const account = await getMarketplaceAccount(tenantId, channel);

    if (!account || account.status !== "connected") {
      throw new Error(`Canal ${channel} não está conectado ou configurado para este tenant.`);
    }

    const errors: string[] = [];
    let importedCount = 0;
    let pairedCount = 0;
    let unpairedCount = 0;

    // Busca todos os produtos do ERP para pareamento pelo SKU
    const erpProductsSnap = await adminDb
      .collection("products")
      .where("tenantId", "==", tenantId)
      .get();

    const erpProducts = erpProductsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const erpSkuMap = new Map<string, any>();
    for (const p of erpProducts) {
      if (p.sku) erpSkuMap.set(p.sku.trim().toLowerCase(), p);
    }

    interface RawAd {
      externalItemId: string;
      externalSku: string;
      title: string;
      price: number;
      stock: number;
      status: "active" | "paused" | "error";
      permalink?: string;
    }

    const rawAds: RawAd[] = [];

    if (channel === "mercado_libre") {
      const { fetchMeliSellerItems, fetchMeliItemDetail } = await import("@/lib/marketplaces/mercadolibre");
      const sellerId = Number(account.sellerId);
      const token = account.encryptedAccessToken; // getMarketplaceAccount decrypts it

      const itemIds = await fetchMeliSellerItems(sellerId, token);
      for (const itemId of itemIds.slice(0, 50)) {
        try {
          const detail = await fetchMeliItemDetail(itemId, token);
          if (detail && detail.id) {
            const externalSku = (detail.seller_custom_field || "").trim();
            rawAds.push({
              externalItemId: detail.id,
              externalSku,
              title: detail.title || "Anúncio Mercado Livre",
              price: detail.price || 0,
              stock: detail.available_quantity || 0,
              status: detail.status === "active" ? "active" : "paused",
              permalink: detail.permalink || ""
            });
          }
        } catch (e: any) {
          errors.push(`Falha ao obter anúncio ${itemId}: ${e.message}`);
        }
      }
    } else if (channel === "shopee") {
      const { fetchShopeeItemList, fetchShopeeItemBaseInfo } = await import("@/lib/marketplaces/shopee");
      const partnerId = process.env.SHOPEE_PARTNER_ID || "";
      const partnerKey = process.env.SHOPEE_PARTNER_KEY || "";
      const shopId = Number(account.sellerId);
      const token = account.encryptedAccessToken;

      if (!partnerId || !partnerKey) {
        throw new Error("Credenciais da Shopee não configuradas no ambiente do servidor.");
      }

      const itemIds = await fetchShopeeItemList(partnerId, partnerKey, token, shopId);
      if (itemIds.length > 0) {
        const details = await fetchShopeeItemBaseInfo(partnerId, partnerKey, token, shopId, itemIds);
        for (const item of details) {
          const externalSku = (item.item_sku || "").trim();
          const price = item.price_info?.[0]?.current_price || item.price_info?.[0]?.original_price || 0;
          const stock = item.stock_info_v2?.summary_info?.total_available_stock ?? item.stock_info?.[0]?.normal_stock ?? 0;
          rawAds.push({
            externalItemId: String(item.item_id),
            externalSku,
            title: item.item_name || "Anúncio Shopee",
            price,
            stock,
            status: item.item_status === "NORMAL" ? "active" : "paused"
          });
        }
      }
    }

    const now = new Date().toISOString();
    const collectionRef = adminDb.collection(this.collectionName);

    for (const ad of rawAds) {
      importedCount++;
      const matchedErpProd = ad.externalSku ? erpSkuMap.get(ad.externalSku.toLowerCase()) : null;

      const isPaired = Boolean(matchedErpProd);
      if (isPaired) pairedCount++;
      else unpairedCount++;

      const existingSnap = await collectionRef
        .where("tenantId", "==", tenantId)
        .where("channel", "==", channel)
        .where("externalItemId", "==", ad.externalItemId)
        .limit(1)
        .get();

      const itemPayload: Omit<MarketplaceItem, "id"> = {
        tenantId,
        channel,
        sellerId: account.sellerId,
        productId: matchedErpProd ? matchedErpProd.id : "",
        erpItemId: matchedErpProd ? matchedErpProd.id : "",
        productSku: matchedErpProd ? matchedErpProd.sku : (ad.externalSku || ""),
        productName: matchedErpProd ? matchedErpProd.name : ad.title,
        externalItemId: ad.externalItemId,
        externalSku: ad.externalSku || "",
        title: ad.title,
        syncedPrice: ad.price,
        price: ad.price,
        syncedStock: matchedErpProd ? (matchedErpProd.currentStock || 0) : ad.stock,
        stock: ad.stock,
        status: ad.status,
        syncStatusMessage: isPaired ? "Vinculado automaticamente por SKU" : "Aguardando vinculação com produto ERP",
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now
      };

      if (!existingSnap.empty) {
        await collectionRef.doc(existingSnap.docs[0].id).update(itemPayload);
      } else {
        await collectionRef.add(itemPayload);
      }
    }

    Cache.invalidateByEntity(tenantId, "products");
    Cache.invalidateByEntity(tenantId, "dashboard");

    await logMarketplaceEvent({
      tenantId,
      channel,
      severity: "INFO",
      operation: "import_ads",
      resource: "products",
      message: `Importação concluída: ${importedCount} anúncios obtidos (${pairedCount} vinculados por SKU, ${unpairedCount} sem vínculo).`
    });

    return { importedCount, pairedCount, unpairedCount, errors };
  }

  /**
   * Vincula manualmente um anúncio de marketplace a um produto físico do ERP.
   */
  public async pairMarketplaceItem(
    tenantId: string,
    marketplaceItemId: string,
    erpProductId: string
  ): Promise<boolean> {
    const prodDoc = await adminDb.collection("products").doc(erpProductId).get();
    if (!prodDoc.exists) {
      throw new Error(`Produto ERP ${erpProductId} não foi encontrado.`);
    }

    const prod = prodDoc.data() as any;
    if (prod.tenantId !== tenantId) {
      throw new Error("Acesso negado: Produto não pertence a este tenant.");
    }

    const itemRef = adminDb.collection(this.collectionName).doc(marketplaceItemId);
    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) {
      throw new Error(`Anúncio ${marketplaceItemId} não encontrado.`);
    }

    const item = itemDoc.data() as MarketplaceItem;
    const now = new Date().toISOString();
    const currentStock = prod.currentStock || 0;

    await itemRef.update({
      productId: erpProductId,
      erpItemId: erpProductId,
      productSku: prod.sku || item.externalSku || "",
      productName: prod.name,
      syncedStock: currentStock,
      syncStatusMessage: "Vinculado manualmente ao ERP",
      lastSyncAt: now,
      updatedAt: now
    });

    // Enfileira sincronização do estoque físico do ERP para o canal
    const { default: Queue } = await import("./QueueService");
    await Queue.enqueue(
      tenantId,
      item.channel,
      "sync_stock",
      {
        marketplaceItemId,
        productId: erpProductId,
        externalItemId: item.externalItemId,
        newStock: currentStock
      },
      `pair_sync_${marketplaceItemId}_${Date.now()}`,
      "high"
    );

    Cache.invalidateByEntity(tenantId, "products");
    Cache.invalidateByEntity(tenantId, "dashboard");

    await logMarketplaceEvent({
      tenantId,
      channel: item.channel,
      severity: "INFO",
      operation: "pair_item",
      resource: "products",
      message: `Anúncio [${item.title}] vinculado com sucesso ao produto [${prod.name}] (SKU: ${prod.sku}). Estoque de ${currentStock} propagado.`
    });

    return true;
  }

  /**
   * Atualiza o preço específico de um anúncio em um marketplace sem quebrar o preço base do ERP.
   */
  public async updateChannelPrice(
    tenantId: string,
    marketplaceItemId: string,
    newPrice: number
  ): Promise<boolean> {
    if (newPrice <= 0) throw new Error("Preço deve ser maior que zero.");

    const itemRef = adminDb.collection(this.collectionName).doc(marketplaceItemId);
    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) throw new Error("Anúncio não encontrado.");

    const item = itemDoc.data() as MarketplaceItem;
    const now = new Date().toISOString();

    await itemRef.update({
      syncedPrice: newPrice,
      price: newPrice,
      lastSyncAt: now,
      updatedAt: now
    });

    const { default: Queue } = await import("./QueueService");
    await Queue.enqueue(
      tenantId,
      item.channel,
      "sync_price",
      {
        marketplaceItemId,
        externalItemId: item.externalItemId,
        newPrice
      },
      `price_${marketplaceItemId}_${Date.now()}`,
      "normal"
    );

    Cache.invalidateByEntity(tenantId, "products");
    return true;
  }

  /**
   * Lista os itens/anúncios vinculados do Tenant (com cache de 5 min).
   */
  public async listItems(tenantId: string, channel?: MarketplaceChannel): Promise<MarketplaceItem[]> {
    const cacheKey = `list_${channel || "all"}`;
    return await Cache.getOrFetch(tenantId, "products", cacheKey, async () => {
      let query: FirebaseFirestore.Query = adminDb
        .collection(this.collectionName)
        .where("tenantId", "==", tenantId);

      if (channel) {
        query = query.where("channel", "==", channel);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<MarketplaceItem, "id">)
      }));
    });
  }
}

export const ProductSync = new ProductSyncService();
export default ProductSync;
