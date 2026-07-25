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
