import { adminDb } from "@/lib/firebase/admin";
import {
  StockDeductionInput,
  StockReturnInput,
  StockAdjustmentInput,
  UnifiedStockMovement,
  StockItemSummary,
  UnifiedStockDashboardMetrics,
  PairedProductResult,
  StockChannelSyncDetail,
  StockSyncStatusType
} from "@/features/integrations/types/unified-stock";
import { Product, ProductKit } from "@/features/products/types";
import { MarketplaceItem } from "@/features/integrations/types/marketplaces";
import EventBus from "./EventBusService";
import Queue from "./QueueService";
import StockConfig from "./StockConfigService";
import { logMarketplaceEvent } from "../marketplaceLogService";
import Cache from "./CacheService";

/**
 * Serviço de Estoque Unificado (Single Source of Truth - Enterprise).
 * 
 * O ERP é a ÚNICA fonte oficial de estoque da empresa. Marketplaces não
 * possuem estoque próprio e apenas refletem o saldo disponível no ERP.
 * 
 * Reutiliza 100% das rotinas do ERP (`products`, `inventory_transactions`, `product_kits`),
 * utilizando transações atômicas do Firestore, proteção contra concorrência,
 * verificação de idempotência e disparo de eventos via EventBus.
 */
class UnifiedStockService {
  private readonly productsCol = "products";
  private readonly invTransCol = "inventory_transactions";
  private readonly kitsCol = "product_kits";
  private readonly mktItemsCol = "marketplace_items";
  private readonly movementsCol = "unified_stock_movements";

  /**
   * Baixa de Estoque (Venda Marketplace ou Venda Manual ERP / PDV)
   */
  public async deductStock(input: StockDeductionInput): Promise<UnifiedStockMovement[]> {
    const { tenantId, idempotencyKey } = input;

    // 1. Verificação de Idempotência (Evita dupla baixa por webhook)
    if (idempotencyKey) {
      const existing = await adminDb
        .collection(this.movementsCol)
        .where("tenantId", "==", tenantId)
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        await logMarketplaceEvent({
          tenantId,
          channel: input.channel || "mercado_libre",
          severity: "WARNING",
          operation: "deduct_stock_idempotent_skip",
          resource: "stock",
          message: `Baixa de estoque ignorada por idempotência: chave [${idempotencyKey}] já processada.`
        });
        const doc = existing.docs[0];
        return [{ id: doc.id, ...(doc.data() as Omit<UnifiedStockMovement, "id">) }];
      }
    }

    // 2. Resolve Pareamento de Produto (por SKU ou productId)
    const paired = await this.resolveProduct(tenantId, input.productId, input.sku, input.marketplaceSku, input.channel);
    if (!paired) {
      const errorMsg = `Produto não encontrado para pareamento (SKU: ${input.sku || input.marketplaceSku || "N/A"}, ID: ${input.productId || "N/A"}). Sem alteração de estoque.`;
      await logMarketplaceEvent({
        tenantId,
        channel: input.channel || "mercado_libre",
        severity: "ERROR",
        operation: "deduct_stock_unpaired",
        resource: "stock",
        message: errorMsg
      });
      throw new Error(errorMsg);
    }

    const config = await StockConfig.getConfig(tenantId);
    const movements: UnifiedStockMovement[] = [];
    const now = new Date().toISOString();

    // 3. Verifica se o produto é um KIT
    if (paired.isKit) {
      const kitDoc = await adminDb.collection(this.kitsCol).doc(paired.productId).get();
      if (kitDoc.exists) {
        const kit = kitDoc.data() as ProductKit;
        if (kit.items && kit.items.length > 0) {
          for (const kitItem of kit.items) {
            const qtyToDeduct = kitItem.quantity * input.quantity;
            const movement = await this.executeAtomicDeduction({
              tenantId,
              productId: kitItem.productId,
              quantity: qtyToDeduct,
              origin: input.origin,
              channel: input.channel,
              orderId: input.orderId,
              channelOrderId: input.channelOrderId,
              reason: `Baixa Kit "${paired.productName}" - ${input.reason}`,
              userId: input.userId,
              userEmail: input.userEmail,
              idempotencyKey: idempotencyKey ? `${idempotencyKey}_comp_${kitItem.productId}` : undefined,
              isKitComponent: true,
              parentKitId: paired.productId,
              allowNegative: config.allowNegativeStock
            });
            movements.push(movement);
          }
        }
      }
    } else {
      // 4. Produto Normal
      const movement = await this.executeAtomicDeduction({
        tenantId,
        productId: paired.productId,
        quantity: input.quantity,
        origin: input.origin,
        channel: input.channel,
        orderId: input.orderId,
        channelOrderId: input.channelOrderId,
        reason: input.reason,
        userId: input.userId,
        userEmail: input.userEmail,
        idempotencyKey,
        isKitComponent: false,
        allowNegative: config.allowNegativeStock
      });
      movements.push(movement);
    }

    // 5. Invalida cache de estoque para o tenant
    Cache.invalidateByEntity(tenantId, "products");

    return movements;
  }

  /**
   * Devolução de Estoque (Cancelamento ou Estorno de Pedido)
   */
  public async returnStock(input: StockReturnInput): Promise<UnifiedStockMovement[]> {
    const { tenantId, idempotencyKey } = input;

    if (idempotencyKey) {
      const existing = await adminDb
        .collection(this.movementsCol)
        .where("tenantId", "==", tenantId)
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        const doc = existing.docs[0];
        return [{ id: doc.id, ...(doc.data() as Omit<UnifiedStockMovement, "id">) }];
      }
    }

    const paired = await this.resolveProduct(tenantId, input.productId, input.sku, undefined, input.channel);
    if (!paired) {
      throw new Error(`Produto não encontrado para devolução de estoque.`);
    }

    const movements: UnifiedStockMovement[] = [];

    if (paired.isKit) {
      const kitDoc = await adminDb.collection(this.kitsCol).doc(paired.productId).get();
      if (kitDoc.exists) {
        const kit = kitDoc.data() as ProductKit;
        if (kit.items) {
          for (const kitItem of kit.items) {
            const qtyToReturn = kitItem.quantity * input.quantity;
            const movement = await this.executeAtomicAddition({
              tenantId,
              productId: kitItem.productId,
              quantity: qtyToReturn,
              type: "return",
              origin: input.origin,
              channel: input.channel,
              orderId: input.orderId,
              channelOrderId: input.channelOrderId,
              reason: `Devolução Kit "${paired.productName}" - ${input.reason}`,
              userId: input.userId,
              idempotencyKey: idempotencyKey ? `${idempotencyKey}_comp_${kitItem.productId}` : undefined,
              isKitComponent: true,
              parentKitId: paired.productId
            });
            movements.push(movement);
          }
        }
      }
    } else {
      const movement = await this.executeAtomicAddition({
        tenantId,
        productId: paired.productId,
        quantity: input.quantity,
        type: "return",
        origin: input.origin,
        channel: input.channel,
        orderId: input.orderId,
        channelOrderId: input.channelOrderId,
        reason: input.reason,
        userId: input.userId,
        idempotencyKey,
        isKitComponent: false
      });
      movements.push(movement);
    }

    Cache.invalidateByEntity(tenantId, "products");
    return movements;
  }

  /**
   * Ajuste Manual de Estoque (com Motivo, Usuário e Data)
   */
  public async adjustStock(input: StockAdjustmentInput): Promise<UnifiedStockMovement> {
    const { tenantId, productId, newStock, reason, userId, userEmail, origin = "adjustment" } = input;

    const prodRef = adminDb.collection(this.productsCol).doc(productId);
    const prodDoc = await prodRef.get();

    if (!prodDoc.exists) {
      throw new Error(`Produto ${productId} não encontrado para ajuste de estoque.`);
    }

    const prod = prodDoc.data() as Product;

    if (prod.tenantId !== tenantId) {
      throw new Error(`Acesso negado: Produto não pertence ao tenant ${tenantId}`);
    }

    const previousStock = prod.currentStock || 0;
    const delta = newStock - previousStock;

    if (delta === 0) {
      throw new Error(`O novo estoque (${newStock}) é idêntico ao estoque atual (${previousStock}). Nenhuma alteração realizada.`);
    }

    const now = new Date().toISOString();
    const type = delta > 0 ? "in" : "out";
    const qtyChange = Math.abs(delta);

    // Transação Atômica no Firestore
    await adminDb.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(prodRef);
      if (!freshDoc.exists) throw new Error("Produto inexistente durante ajuste.");
      const freshProd = freshDoc.data() as Product;

      const updatedCurrent = freshProd.currentStock + delta;
      const updatedAvailable = (freshProd.availableStock || freshProd.currentStock) + delta;

      transaction.update(prodRef, {
        currentStock: updatedCurrent,
        availableStock: Math.max(0, updatedAvailable),
        updatedAt: now
      });
    });

    // 1. Grava no ERP `inventory_transactions`
    await adminDb.collection(this.invTransCol).add({
      tenantId,
      productId,
      locationId: "loja-fisica",
      type: type === "in" ? "in" : "adjustment",
      quantity: qtyChange,
      costPriceAtTime: prod.costPrice || 0,
      reason: `Ajuste Manual: ${reason}`,
      createdAt: now
    });

    // 2. Grava no Histórico de Auditoria do Estoque Unificado
    const movementPayload: Omit<UnifiedStockMovement, "id"> = {
      tenantId,
      productId,
      productSku: prod.sku,
      productName: prod.name,
      previousStock,
      newStock,
      quantityChanged: delta,
      type: "adjustment",
      origin,
      reason,
      userId,
      userEmail,
      timestamp: now,
      createdAt: now
    };

    const movRef = await adminDb.collection(this.movementsCol).add(movementPayload);
    const movement: UnifiedStockMovement = { id: movRef.id, ...movementPayload };

    // 3. Publica evento no EventBus
    await EventBus.publish({
      id: `evt_stock_adj_${productId}_${Date.now()}`,
      topic: "ESTOQUE_ALTERADO",
      tenantId,
      payload: {
        productId,
        productSku: prod.sku,
        productName: prod.name,
        previousStock,
        newStock,
        quantityChanged: delta,
        reason,
        origin,
        userId,
        timestamp: now
      },
      timestamp: now
    });

    // 4. Sincronização Inteligente com os Marketplaces publicados
    await this.triggerSmartSyncForProduct(tenantId, productId, newStock);

    Cache.invalidateByEntity(tenantId, "products");
    return movement;
  }

  /**
   * Baixa Atômica Interna (para produto individual)
   */
  private async executeAtomicDeduction(params: {
    tenantId: string;
    productId: string;
    quantity: number;
    origin: StockDeductionInput["origin"];
    channel?: StockDeductionInput["channel"];
    orderId?: string;
    channelOrderId?: string;
    reason: string;
    userId?: string;
    userEmail?: string;
    idempotencyKey?: string;
    isKitComponent?: boolean;
    parentKitId?: string;
    allowNegative?: boolean;
  }): Promise<UnifiedStockMovement> {
    const { tenantId, productId, quantity, origin, channel, orderId, channelOrderId, reason, userId, userEmail, idempotencyKey, isKitComponent, parentKitId, allowNegative } = params;
    const prodRef = adminDb.collection(this.productsCol).doc(productId);

    let previousStock = 0;
    let newStock = 0;
    let productSku = "";
    let productName = "";
    let costPrice = 0;
    const now = new Date().toISOString();

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(prodRef);
      if (!doc.exists) {
        throw new Error(`Produto ID ${productId} não foi localizado no cadastro do ERP.`);
      }

      const prod = doc.data() as Product;
      previousStock = prod.currentStock || 0;
      productSku = prod.sku || "";
      productName = prod.name || "";
      costPrice = prod.costPrice || 0;

      newStock = previousStock - quantity;

      if (!allowNegative && newStock < 0) {
        throw new Error(`Estoque insuficiente para o produto "${productName}" (SKU: ${productSku}). Estoque atual: ${previousStock}, Solicitado: ${quantity}.`);
      }

      const updatedAvailable = Math.max(0, (prod.availableStock || previousStock) - quantity);

      transaction.update(prodRef, {
        currentStock: newStock,
        availableStock: updatedAvailable,
        updatedAt: now
      });
    });

    // Registra transação de estoque no ERP
    await adminDb.collection(this.invTransCol).add({
      tenantId,
      productId,
      locationId: "loja-fisica",
      type: "out",
      quantity,
      costPriceAtTime: costPrice,
      reason,
      createdAt: now
    });

    // Registra movimento no Estoque Unificado (Auditoria)
    const movData: Omit<UnifiedStockMovement, "id"> = {
      tenantId,
      productId,
      productSku,
      productName,
      previousStock,
      newStock,
      quantityChanged: -quantity,
      type: "out",
      origin,
      channel,
      orderId,
      channelOrderId,
      reason,
      userId,
      userEmail,
      idempotencyKey,
      isKitComponent,
      parentKitId,
      timestamp: now,
      createdAt: now
    };

    const movRef = await adminDb.collection(this.movementsCol).add(movData);

    // Publica Evento no EventBus
    await EventBus.publish({
      id: `evt_stock_deduct_${productId}_${Date.now()}`,
      topic: "ESTOQUE_ALTERADO",
      tenantId,
      channel,
      payload: {
        productId,
        productSku,
        productName,
        previousStock,
        newStock,
        quantityChanged: -quantity,
        origin,
        orderId,
        timestamp: now
      },
      timestamp: now
    });

    // Sincronização inteligente apenas para marketplaces onde o produto está publicado
    await this.triggerSmartSyncForProduct(tenantId, productId, newStock);

    return { id: movRef.id, ...movData };
  }

  /**
   * Adição Atômica Interna (para devoluções/cancelamentos)
   */
  private async executeAtomicAddition(params: {
    tenantId: string;
    productId: string;
    quantity: number;
    type: "in" | "return";
    origin: StockReturnInput["origin"];
    channel?: StockReturnInput["channel"];
    orderId?: string;
    channelOrderId?: string;
    reason: string;
    userId?: string;
    idempotencyKey?: string;
    isKitComponent?: boolean;
    parentKitId?: string;
  }): Promise<UnifiedStockMovement> {
    const { tenantId, productId, quantity, type, origin, channel, orderId, channelOrderId, reason, userId, idempotencyKey, isKitComponent, parentKitId } = params;
    const prodRef = adminDb.collection(this.productsCol).doc(productId);

    let previousStock = 0;
    let newStock = 0;
    let productSku = "";
    let productName = "";
    let costPrice = 0;
    const now = new Date().toISOString();

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(prodRef);
      if (!doc.exists) {
        throw new Error(`Produto ID ${productId} não foi localizado no ERP.`);
      }

      const prod = doc.data() as Product;
      previousStock = prod.currentStock || 0;
      productSku = prod.sku || "";
      productName = prod.name || "";
      costPrice = prod.costPrice || 0;

      newStock = previousStock + quantity;
      const updatedAvailable = (prod.availableStock || previousStock) + quantity;

      transaction.update(prodRef, {
        currentStock: newStock,
        availableStock: updatedAvailable,
        updatedAt: now
      });
    });

    await adminDb.collection(this.invTransCol).add({
      tenantId,
      productId,
      locationId: "loja-fisica",
      type: "return",
      quantity,
      costPriceAtTime: costPrice,
      reason,
      createdAt: now
    });

    const movData: Omit<UnifiedStockMovement, "id"> = {
      tenantId,
      productId,
      productSku,
      productName,
      previousStock,
      newStock,
      quantityChanged: quantity,
      type: "return",
      origin,
      channel,
      orderId,
      channelOrderId,
      reason,
      userId,
      idempotencyKey,
      isKitComponent,
      parentKitId,
      timestamp: now,
      createdAt: now
    };

    const movRef = await adminDb.collection(this.movementsCol).add(movData);

    await EventBus.publish({
      id: `evt_stock_return_${productId}_${Date.now()}`,
      topic: "ESTOQUE_ALTERADO",
      tenantId,
      channel,
      payload: {
        productId,
        productSku,
        productName,
        previousStock,
        newStock,
        quantityChanged: quantity,
        origin,
        orderId,
        timestamp: now
      },
      timestamp: now
    });

    await this.triggerSmartSyncForProduct(tenantId, productId, newStock);

    return { id: movRef.id, ...movData };
  }

  /**
   * Sincronização Inteligente: identifica quais canais possuem este produto anunciado
   * e enfileira atualização de estoque APENAS para esses canais específicos.
   */
  public async triggerSmartSyncForProduct(tenantId: string, productId: string, newStock: number): Promise<number> {
    // Busca anúncios ativos do produto
    const itemsSnapshot = await adminDb
      .collection(this.mktItemsCol)
      .where("tenantId", "==", tenantId)
      .where("erpItemId", "==", productId)
      .get();

    if (itemsSnapshot.empty) {
      // Produto não anunciado em nenhum marketplace
      return 0;
    }

    let enqueuedCount = 0;
    const now = new Date().toISOString();

    for (const doc of itemsSnapshot.docs) {
      const item = doc.data() as MarketplaceItem;
      if (item.status === "active") {
        // Enfileira sincronização de estoque no QueueService
        await Queue.enqueue(
          tenantId,
          item.channel,
          "sync_stock",
          {
            marketplaceItemId: doc.id,
            productId,
            externalItemId: item.externalItemId,
            newStock
          },
          `stock_${productId}_${item.channel}_${Date.now()}`,
          "high"
        );

        // Atualiza a visualização do anúncio no Firestore
        await doc.ref.update({
          syncedStock: newStock,
          lastSyncAt: now,
          updatedAt: now
        });

        enqueuedCount++;
      }
    }

    return enqueuedCount;
  }

  /**
   * Auxiliar: Resolve o pareamento entre um SKU de marketplace/ERP e o cadastro do ERP.
   */
  public async resolveProduct(
    tenantId: string,
    productId?: string,
    sku?: string,
    marketplaceSku?: string,
    channel?: string
  ): Promise<PairedProductResult | null> {
    // 1. Por productId direto
    if (productId) {
      const doc = await adminDb.collection(this.productsCol).doc(productId).get();
      if (doc.exists) {
        const prod = doc.data() as Product;
        if (prod.tenantId === tenantId) {
          return {
            productId: doc.id,
            productSku: prod.sku,
            productName: prod.name,
            erpStock: prod.currentStock || 0,
            isKit: prod.isKit || false
          };
        }
      }
    }

    const searchSku = sku || marketplaceSku;

    // 2. Por SKU direto no cadastro de produtos do ERP
    if (searchSku) {
      const skuSnap = await adminDb
        .collection(this.productsCol)
        .where("tenantId", "==", tenantId)
        .where("sku", "==", searchSku)
        .limit(1)
        .get();

      if (!skuSnap.empty) {
        const doc = skuSnap.docs[0];
        const prod = doc.data() as Product;
        return {
          productId: doc.id,
          productSku: prod.sku,
          productName: prod.name,
          erpStock: prod.currentStock || 0,
          isKit: prod.isKit || false
        };
      }
    }

    // 3. Por tabela de pareamento de anúncios (`marketplace_items`)
    if (searchSku) {
      let query = adminDb
        .collection(this.mktItemsCol)
        .where("tenantId", "==", tenantId);

      const itemsSnap = await query.get();
      const matched = itemsSnap.docs.find(d => {
        const data = d.data() as MarketplaceItem;
        return data.productSku === searchSku || data.externalSku === searchSku || data.externalItemId === searchSku;
      });

      if (matched) {
        const item = matched.data() as MarketplaceItem;
        const targetProductId = item.erpItemId || item.productId;

        if (targetProductId) {
          const pDoc = await adminDb.collection(this.productsCol).doc(targetProductId).get();
          if (pDoc.exists) {
            const prod = pDoc.data() as Product;
            return {
              productId: pDoc.id,
              productSku: prod.sku,
              productName: prod.name,
              erpStock: prod.currentStock || 0,
              isKit: prod.isKit || false,
              marketplaceItemId: matched.id,
              marketplaceSku: item.externalSku,
              channel: item.channel
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Busca histórico imutável de movimentações de estoque para o produto ou tenant.
   */
  public async getStockMovements(
    tenantId: string,
    productId?: string,
    limitCount = 50
  ): Promise<UnifiedStockMovement[]> {
    let query: FirebaseFirestore.Query = adminDb
      .collection(this.movementsCol)
      .where("tenantId", "==", tenantId);

    if (productId) {
      query = query.where("productId", "==", productId);
    }

    const snap = await query.orderBy("timestamp", "desc").limit(limitCount).get();

    return snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<UnifiedStockMovement, "id">)
    }));
  }

  /**
   * Retorna resumo consolidado de estoque de todos os produtos do ERP e seus status de sync.
   */
  public async getStockSummaries(tenantId: string): Promise<StockItemSummary[]> {
    return await Cache.getOrFetch(tenantId, "products", "summaries_all", async () => {
      // 1. Busca todos os produtos do ERP
      const prodsSnap = await adminDb
        .collection(this.productsCol)
        .where("tenantId", "==", tenantId)
        .get();

      const products = prodsSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Product, "id">)
      }));

      // 2. Busca todos os anúncios integrados em marketplaces
      const itemsSnap = await adminDb
        .collection(this.mktItemsCol)
        .where("tenantId", "==", tenantId)
        .get();

      const mktItems = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<MarketplaceItem, "id">)
      }));

      // Map de productId -> Array de anúncios de marketplaces
      const itemsByProduct = new Map<string, typeof mktItems>();
      for (const item of mktItems) {
        const pId = item.erpItemId || item.productId;
        if (pId) {
          const list = itemsByProduct.get(pId) || [];
          list.push(item);
          itemsByProduct.set(pId, list);
        }
      }

      const result: StockItemSummary[] = products.map(prod => {
        const matchedItems = itemsByProduct.get(prod.id) || [];
        const erpStock = prod.currentStock || 0;

        const channelsDetail: StockChannelSyncDetail[] = matchedItems.map(item => {
          let syncStatus: StockSyncStatusType = "synced";
          if (item.status === "error") syncStatus = "error";
          else if (item.syncedStock !== erpStock) syncStatus = "pending";

          return {
            channel: item.channel,
            marketplaceItemId: item.id,
            externalSku: item.externalSku,
            syncedStock: item.syncedStock ?? item.stock ?? 0,
            syncStatus,
            lastSyncAt: item.lastSyncAt,
            errorMessage: item.syncStatusMessage
          };
        });

        let overallStatus: StockSyncStatusType = "synced";
        if (matchedItems.length === 0) {
          overallStatus = "unpaired";
        } else if (channelsDetail.some(c => c.syncStatus === "error")) {
          overallStatus = "error";
        } else if (channelsDetail.some(c => c.syncStatus === "pending")) {
          overallStatus = "pending";
        }

        return {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          erpStock,
          reservedStock: prod.reservedStock || 0,
          availableStock: prod.availableStock ?? erpStock,
          minStock: prod.minStock || 0,
          isKit: !!prod.isKit,
          channels: channelsDetail,
          overallStatus,
          lastSyncAt: channelsDetail[0]?.lastSyncAt
        };
      });

      return result;
    });
  }

  /**
   * Métricas do Dashboard de Estoque Unificado
   */
  public async getDashboardMetrics(tenantId: string): Promise<UnifiedStockDashboardMetrics> {
    const summaries = await this.getStockSummaries(tenantId);

    let totalSynced = 0;
    let totalPending = 0;
    let totalErrors = 0;
    let totalUnpaired = 0;
    let totalKits = 0;

    for (const s of summaries) {
      if (s.isKit) totalKits++;
      if (s.overallStatus === "synced") totalSynced++;
      else if (s.overallStatus === "pending") totalPending++;
      else if (s.overallStatus === "error") totalErrors++;
      else if (s.overallStatus === "unpaired") totalUnpaired++;
    }

    // Contagem de movimentos hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const movSnap = await adminDb
      .collection(this.movementsCol)
      .where("tenantId", "==", tenantId)
      .where("timestamp", ">=", today.toISOString())
      .get();

    return {
      totalErpProducts: summaries.length,
      totalSyncedProducts: totalSynced,
      totalPendingSync: totalPending,
      totalSyncErrors: totalErrors,
      totalUnpairedProducts: totalUnpaired,
      totalKitsCount: totalKits,
      totalStockMovementsToday: movSnap.size,
      lastGlobalSyncAt: new Date().toISOString()
    };
  }
}

export const UnifiedStock = new UnifiedStockService();
export default UnifiedStock;
