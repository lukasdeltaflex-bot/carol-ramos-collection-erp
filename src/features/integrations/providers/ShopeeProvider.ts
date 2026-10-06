import {
  MarketplaceProvider,
  SyncOptions,
  SyncResult,
  WebhookProcessResult
} from "./MarketplaceProvider";
import {
  MarketplaceAccount,
  MarketplaceChannel,
  MarketplaceItem,
  MarketplaceOrder
} from "../types/marketplaces";
import {
  getShopeeAuthUrl,
  exchangeShopeeCode,
  refreshShopeeAccessToken,
  updateShopeeStock,
  updateShopeePrice,
  fetchShopeeOrderList,
  fetchShopeeOrderDetail,
  fetchShopeeTrackingInfo
} from "@/lib/marketplaces/shopee";
import { encrypt, decrypt } from "@/lib/encryption";
import { logMarketplaceEvent } from "@/services/marketplaceLogService";
import { enqueueMarketplaceTask } from "@/services/marketplaceQueueService";

export class ShopeeProvider implements MarketplaceProvider {
  readonly channel: MarketplaceChannel = "shopee";

  private getPartnerCredentials(): { partnerId: string; partnerKey: string; redirectUri: string } {
    const partnerId = process.env.SHOPEE_PARTNER_ID && process.env.SHOPEE_PARTNER_ID.trim() !== "" 
      ? process.env.SHOPEE_PARTNER_ID 
      : null;

    if (!partnerId) {
      throw new Error("NÃO CONFIGURADO NA VERCEL: SHOPEE_PARTNER_ID ausente.");
    }
      
    const partnerKey = process.env.SHOPEE_PARTNER_KEY && process.env.SHOPEE_PARTNER_KEY.trim() !== ""
      ? process.env.SHOPEE_PARTNER_KEY 
      : null;

    if (!partnerKey) {
      throw new Error("NÃO CONFIGURADO NA VERCEL: SHOPEE_PARTNER_KEY ausente.");
    }
      
    const redirectUri = process.env.SHOPEE_REDIRECT_URI && process.env.SHOPEE_REDIRECT_URI.trim() !== ""
      ? process.env.SHOPEE_REDIRECT_URI 
      : "https://carol-ramos-collection-erp.vercel.app/api/marketplaces/shopee/auth";
      
    return { partnerId, partnerKey, redirectUri };
  }

  async getAuthUrl(tenantId: string): Promise<string> {
    try {
      console.log(`[OAUTH] [SHOPEE] Validando credenciais para tenant ${tenantId}`);
      const { partnerId, partnerKey, redirectUri } = this.getPartnerCredentials();
      
      const state = tenantId;
      console.log(`[OAUTH] [SHOPEE] Gerando URL oficial da Shopee com redirect_uri fixa: ${redirectUri} e state: ${state}`);
      
      const authUrl = getShopeeAuthUrl(partnerId, partnerKey, redirectUri, state);
      console.log(`[OAUTH] [SHOPEE] URL de autorização gerada com sucesso.`);
      
      return authUrl;
    } catch (error) {
      console.error(`[OAUTH] [SHOPEE] Falha ao gerar URL de autorização:`, error);
      throw error;
    }
  }

  async handleAuthCallback(code: string, tenantId: string, extra?: { shopId?: number } | number): Promise<MarketplaceAccount> {
    const { partnerId, partnerKey } = this.getPartnerCredentials();
    const shopId = typeof extra === "number" ? extra : extra?.shopId ? Number(extra.shopId) : 0;
    if (!shopId) {
      throw new Error("Parâmetro 'shop_id' obrigatório não foi fornecido pelo callback da Shopee.");
    }

    const tokens = await exchangeShopeeCode(partnerId, partnerKey, code, shopId);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expire_in * 1000).toISOString();
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias

    const account: MarketplaceAccount = {
      id: `shopee-${shopId}`,
      tenantId,
      channel: "shopee",
      sellerId: String(shopId),
      shopName: `Shopee Loja ${shopId}`,
      status: "connected",
      
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      accessTokenExpiresAt: expiresAt,
      refreshTokenExpiresAt: refreshExpiresAt,
      
      sourceOfTruth: "erp",
      autoSyncStock: true,
      autoSyncPrice: true,
      autoSyncOrders: true,
      
      syncedProductsCount: 0,
      importedOrdersCount: 0,
      errorsCount: 0,
      lastSyncAt: now.toISOString(),
      nextRenewalAt: expiresAt,
      
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: "system"
    };

    await logMarketplaceEvent({
      tenantId,
      channel: "shopee",
      severity: "INFO",
      operation: "oauth_connect",
      resource: "account",
      message: `Loja Shopee ID ${shopId} conectada com sucesso via OAuth 2.0.`
    });

    return account;
  }

  async refreshTokens(account: MarketplaceAccount): Promise<MarketplaceAccount> {
    const { partnerId, partnerKey } = this.getPartnerCredentials();
    const rawRefreshToken = decrypt(account.encryptedRefreshToken);

    const tokens = await refreshShopeeAccessToken(partnerId, partnerKey, rawRefreshToken, Number(account.sellerId));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expire_in * 1000).toISOString();

    const updatedAccount: MarketplaceAccount = {
      ...account,
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      accessTokenExpiresAt: expiresAt,
      nextRenewalAt: expiresAt,
      status: "connected",
      updatedAt: now.toISOString()
    };

    await logMarketplaceEvent({
      tenantId: account.tenantId,
      channel: "shopee",
      severity: "INFO",
      operation: "oauth_refresh",
      resource: "tokens",
      message: `Access Token da Shopee renovado automaticamente com sucesso.`
    });

    return updatedAccount;
  }

  async syncProducts(account: MarketplaceAccount, options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    await logMarketplaceEvent({
      tenantId: account.tenantId,
      channel: "shopee",
      severity: "INFO",
      operation: "sync_products",
      resource: "products",
      message: `Iniciando sincronização incremental de produtos para Shopee (Shop ID: ${account.sellerId}).`
    });

    // Enfileira a tarefa de sincronização de produtos
    await enqueueMarketplaceTask({
      tenantId: account.tenantId,
      channel: "shopee",
      taskType: "export_product",
      priority: "normal",
      payload: { options },
      idempotencyKey: `shopee_sync_prod_${account.tenantId}_${Date.now()}`
    });

    return {
      success: true,
      processedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: []
    };
  }

  async syncStock(account: MarketplaceAccount, items: MarketplaceItem[]): Promise<SyncResult> {
    const rawToken = decrypt(account.encryptedAccessToken);
    const shopId = Number(account.sellerId);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    if (rawToken && shopId) {
      try {
        const { partnerId, partnerKey } = this.getPartnerCredentials();
        for (const item of items) {
          try {
            const ok = await updateShopeeStock(partnerId, partnerKey, rawToken, shopId, Number(item.externalItemId), item.syncedStock);
            if (ok) successCount++;
            else failCount++;
          } catch (err: any) {
            failCount++;
            errors.push(`Item ${item.externalItemId}: ${err.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Erro de credenciais Shopee: ${err.message}`);
      }
    }

    await enqueueMarketplaceTask({
      tenantId: account.tenantId,
      channel: "shopee",
      taskType: "sync_stock",
      priority: "high",
      payload: { itemsCount: items.length, successCount },
      idempotencyKey: `shopee_sync_stock_${account.tenantId}_${Date.now()}`
    });

    return {
      success: failCount === 0,
      processedCount: items.length,
      updatedCount: successCount,
      failedCount: failCount,
      errors
    };
  }

  async syncPrices(account: MarketplaceAccount, items: MarketplaceItem[]): Promise<SyncResult> {
    const rawToken = decrypt(account.encryptedAccessToken);
    const shopId = Number(account.sellerId);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    if (rawToken && shopId) {
      try {
        const { partnerId, partnerKey } = this.getPartnerCredentials();
        for (const item of items) {
          try {
            const ok = await updateShopeePrice(partnerId, partnerKey, rawToken, shopId, Number(item.externalItemId), item.syncedPrice);
            if (ok) successCount++;
            else failCount++;
          } catch (err: any) {
            failCount++;
            errors.push(`Item ${item.externalItemId}: ${err.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Erro de credenciais Shopee: ${err.message}`);
      }
    }

    await enqueueMarketplaceTask({
      tenantId: account.tenantId,
      channel: "shopee",
      taskType: "sync_price",
      priority: "normal",
      payload: { itemsCount: items.length, successCount },
      idempotencyKey: `shopee_sync_price_${account.tenantId}_${Date.now()}`
    });

    return {
      success: failCount === 0,
      processedCount: items.length,
      updatedCount: successCount,
      failedCount: failCount,
      errors
    };
  }

  async fetchOrders(account: MarketplaceAccount, sinceDate?: Date): Promise<MarketplaceOrder[]> {
    try {
      const rawToken = decrypt(account.encryptedAccessToken);
      const shopId = Number(account.sellerId);
      if (!shopId || !rawToken) return [];

      const { partnerId, partnerKey } = this.getPartnerCredentials();
      const timeFrom = sinceDate ? Math.floor(sinceDate.getTime() / 1000) : undefined;
      const orderSnList = await fetchShopeeOrderList(partnerId, partnerKey, rawToken, shopId, { timeFrom });

      if (orderSnList.length === 0) return [];

      const shopeeOrders = await fetchShopeeOrderDetail(partnerId, partnerKey, rawToken, shopId, orderSnList);
      const orders: MarketplaceOrder[] = [];

      for (const sOrder of shopeeOrders) {
        const orderSn = String(sOrder.order_sn);

        let trackingCode = "";
        try {
          const track = await fetchShopeeTrackingInfo(partnerId, partnerKey, rawToken, shopId, orderSn);
          if (track && track.tracking_number) {
            trackingCode = track.tracking_number;
          }
        } catch {
          // non-fatal
        }

        const items = (sOrder.item_list || []).map((it: any) => ({
          externalItemId: String(it.item_id || ""),
          productSku: it.item_sku || it.model_sku || "",
          name: it.item_name || "Item Shopee",
          quantity: it.model_quantity_purchased || 1,
          unitPrice: it.model_discounted_price || 0
        }));

        let orderStatus: MarketplaceOrder["orderStatus"] = "pending";
        const statusStr = (sOrder.order_status || "").toUpperCase();
        if (statusStr === "READY_TO_SHIP" || statusStr === "PROCESSED") orderStatus = "paid";
        else if (statusStr === "SHIPPED") orderStatus = "shipped";
        else if (statusStr === "COMPLETED") orderStatus = "delivered";
        else if (statusStr === "CANCELLED") orderStatus = "cancelled";

        orders.push({
          id: `shopee_order_${orderSn}`,
          tenantId: account.tenantId,
          channel: "shopee",
          sellerId: account.sellerId,
          externalOrderId: orderSn,
          customerName: sOrder.buyer_username || sOrder.recipient_address?.name || "Comprador Shopee",
          customerDocument: "",
          items,
          totalAmount: sOrder.total_amount || 0,
          shippingFee: sOrder.estimated_shipping_fee || 0,
          paymentMethod: sOrder.payment_method || "shopee_pay",
          orderStatus,
          trackingCode: trackingCode || undefined,
          idempotencyKey: `shopee_${account.tenantId}_${orderSn}`,
          createdAt: sOrder.create_time ? new Date(sOrder.create_time * 1000).toISOString() : new Date().toISOString(),
          updatedAt: sOrder.update_time ? new Date(sOrder.update_time * 1000).toISOString() : new Date().toISOString()
        });
      }

      await logMarketplaceEvent({
        tenantId: account.tenantId,
        channel: "shopee",
        severity: "INFO",
        operation: "fetch_orders",
        resource: "orders",
        message: `${orders.length} pedidos obtidos da Shopee.`
      });

      return orders;
    } catch (err: any) {
      console.error("[ShopeeProvider fetchOrders error]", err);
      return [];
    }
  }

  async handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult> {
    const idempotencyKey = `shopee_wh_${payload?.code || payload?.ordersn || Date.now()}`;
    const topic = payload?.code ? `event_${payload.code}` : "order_status_update";

    return {
      status: "processed",
      idempotencyKey,
      topic,
      orderId: payload?.ordersn
    };
  }
}
