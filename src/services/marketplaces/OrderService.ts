import { adminDb } from "@/lib/firebase/admin";
import {
  MarketplaceChannel,
  MarketplaceOrder,
  MarketplaceOrderDetails,
  MarketplaceOrderStatus
} from "@/features/integrations/types/marketplaces";
import Cache from "./CacheService";
import EventBus from "./EventBusService";
import { logMarketplaceEvent } from "../marketplaceLogService";
import Queue from "./QueueService";

/**
 * Serviço de Gestão de Pedidos Omnichannel (Enterprise Order Service).
 * Gerencia importação, consulta com cache e cálculo financeiro detalhado de cada pedido
 * dos 9 marketplaces, disparando automações como NF-e e Etiquetas de Rastreio.
 */
class OrderService {
  private readonly collectionName = "marketplace_orders";

  /**
   * Importa ou atualiza um pedido no Firestore e publica evento no barramento.
   */
  public async saveOrder(tenantId: string, orderData: Omit<MarketplaceOrder, "id"> & { id?: string }): Promise<string> {
    const now = new Date().toISOString();
    const collectionRef = adminDb.collection(this.collectionName);

    // Procura por pedido existente usando externalOrderId e channel
    const existing = await collectionRef
      .where("tenantId", "==", tenantId)
      .where("externalOrderId", "==", orderData.externalOrderId)
      .where("channel", "==", orderData.channel)
      .get();

    const payload: Omit<MarketplaceOrder, "id"> = {
      tenantId,
      channel: orderData.channel,
      sellerId: orderData.sellerId || "default",
      externalOrderId: orderData.externalOrderId,
      orderStatus: orderData.orderStatus,
      totalAmount: orderData.totalAmount,
      shippingFee: orderData.shippingFee || 0,
      paymentMethod: orderData.paymentMethod || "marketplace",
      customerName: orderData.customerName || "Cliente Marketplace",
      items: orderData.items || [],
      idempotencyKey: orderData.idempotencyKey || `ord_${orderData.externalOrderId}_${Date.now()}`,
      currency: orderData.currency || "BRL",
      itemsCount: orderData.itemsCount || (orderData.items ? orderData.items.length : 1),
      createdAt: orderData.createdAt || now,
      updatedAt: now,
      shippedAt: orderData.shippedAt || "",
      deliveredAt: orderData.deliveredAt || ""
    };

    let docId: string;
    if (!existing.empty) {
      docId = existing.docs[0].id;
      await collectionRef.doc(docId).update(payload);
    } else {
      const docRef = await collectionRef.add(payload);
      docId = docRef.id;
    }

    Cache.invalidateByEntity(tenantId, "orders");
    Cache.invalidateByEntity(tenantId, "dashboard");

    await EventBus.publish({
      id: `ord_${docId}_${now}`,
      topic: "PEDIDO_RECEBIDO",
      tenantId,
      channel: orderData.channel,
      payload: { orderId: docId, externalOrderId: orderData.externalOrderId, totalAmount: orderData.totalAmount },
      timestamp: now
    });

    return docId;
  }

  /**
   * Lista pedidos do Tenant com paginação e filtros por canal ou status (com cache de 1 min).
   */
  public async listOrders(
    tenantId: string,
    options?: {
      channel?: MarketplaceChannel;
      status?: MarketplaceOrderStatus;
      limit?: number;
    }
  ): Promise<MarketplaceOrder[]> {
    const cacheKey = `list_${options?.channel || "all"}_${options?.status || "all"}_${options?.limit || 50}`;
    return await Cache.getOrFetch(tenantId, "orders", cacheKey, async () => {
      let query: FirebaseFirestore.Query = adminDb
        .collection(this.collectionName)
        .where("tenantId", "==", tenantId);

      if (options?.channel) {
        query = query.where("channel", "==", options.channel);
      }
      if (options?.status) {
        query = query.where("orderStatus", "==", options.status);
      }

      const snapshot = await query.orderBy("createdAt", "desc").limit(options?.limit ?? 50).get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<MarketplaceOrder, "id">)
      }));
    });
  }

  /**
   * Retorna os detalhes enriquecidos de um pedido específico incluindo linha do tempo e financeiro.
   */
  public async getOrderDetails(tenantId: string, orderId: string): Promise<MarketplaceOrderDetails | null> {
    const docRef = adminDb.collection(this.collectionName).doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const data = doc.data() as MarketplaceOrder;
    if (data.tenantId !== tenantId) return null;

    // Estimativas financeiras para a visão 360 do pedido
    const freightAmount = data.totalAmount * 0.12;
    const commissionAmount = data.totalAmount * (data.channel === "mercado_libre" ? 0.16 : 0.14);
    const taxAmount = data.totalAmount * 0.08;
    const netProfitAmount = data.totalAmount - freightAmount - commissionAmount - taxAmount;

    return {
      ...data,
      id: doc.id,
      freightAmount: Math.round(freightAmount * 100) / 100,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      netProfitAmount: Math.round(netProfitAmount * 100) / 100,
      timeline: [
        { status: "paid", label: "Pagamento Aprovado no Marketplace", timestamp: data.createdAt, isCompleted: true },
        { status: "invoiced", label: "Nota Fiscal Emitida (NF-e)", timestamp: data.updatedAt, isCompleted: Boolean(data.shippedAt) },
        { status: "shipped", label: "Pedido Despachado à Transportadora", timestamp: data.shippedAt || "", isCompleted: Boolean(data.shippedAt) },
        { status: "delivered", label: "Entregue ao Comprador", timestamp: data.deliveredAt || "", isCompleted: Boolean(data.deliveredAt) }
      ]
    };
  }

  /**
   * Altera o status do pedido e dispara ações automáticas (ex: gerar NF-e quando pago).
   */
  public async updateOrderStatus(tenantId: string, orderId: string, newStatus: MarketplaceOrderStatus): Promise<void> {
    const docRef = adminDb.collection(this.collectionName).doc(orderId);
    const doc = await docRef.get();
    if (!doc.exists) return;

    const data = doc.data() as MarketplaceOrder;
    if (data.tenantId !== tenantId) return;

    const now = new Date().toISOString();
    const updatePayload: Partial<MarketplaceOrder> = {
      orderStatus: newStatus,
      updatedAt: now
    };

    if (newStatus === "shipped" && !data.shippedAt) updatePayload.shippedAt = now;
    if (newStatus === "delivered" && !data.deliveredAt) updatePayload.deliveredAt = now;

    await docRef.update(updatePayload);
    Cache.invalidateByEntity(tenantId, "orders");

    if (newStatus === "shipped") {
      await logMarketplaceEvent({
        tenantId,
        channel: data.channel,
        severity: "INFO",
        operation: "order_shipped",
        resource: "order",
        message: `Pedido ${data.externalOrderId} foi marcado como enviado.`
      });
    }

    // Se aprovou pagamento, agenda emissão automática de NF-e via fila
    if (newStatus === "paid" || newStatus === "pending") {
      await Queue.enqueue(
        tenantId,
        data.channel,
        "import_order",
        { orderId, action: "emit_nfe" },
        `nfe_${orderId}_${Date.now()}`,
        "high"
      );
    }
  }
}

export const Orders = new OrderService();
export default Orders;
