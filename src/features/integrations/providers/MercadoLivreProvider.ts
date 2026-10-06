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
  getMeliAuthUrl,
  exchangeMeliCode,
  refreshMeliAccessToken,
  fetchMeliSellerItems,
  updateMeliItemStock,
  updateMeliItemPrice,
  fetchMeliOrders,
  fetchMeliShipment
} from "@/lib/marketplaces/mercadolibre";
import { encrypt, decrypt } from "@/lib/encryption";
import { logMarketplaceEvent } from "@/services/marketplaceLogService";
import { enqueueMarketplaceTask } from "@/services/marketplaceQueueService";

export class MercadoLivreProvider implements MarketplaceProvider {
  readonly channel: MarketplaceChannel = "mercado_libre";

  private getAppCredentials(): { appId: string; clientSecret: string; redirectUri: string } {
    const appId = process.env.MELI_APP_ID && process.env.MELI_APP_ID.trim() !== ""
      ? process.env.MELI_APP_ID
      : null;

    if (!appId) {
      throw new Error("NÃO CONFIGURADO NA VERCEL: MELI_APP_ID ausente.");
    }

    const clientSecret = process.env.MELI_CLIENT_SECRET && process.env.MELI_CLIENT_SECRET.trim() !== ""
      ? process.env.MELI_CLIENT_SECRET.trim()
      : null;

    if (!clientSecret) {
      throw new Error("NÃO CONFIGURADO NA VERCEL: MELI_CLIENT_SECRET ausente.");
    }

    const redirectUri = process.env.MELI_REDIRECT_URI && process.env.MELI_REDIRECT_URI.trim() !== ""
      ? process.env.MELI_REDIRECT_URI
      : "https://carol-ramos-collection-erp.vercel.app/api/marketplaces/mercadolibre/auth";

    return { appId, clientSecret, redirectUri };
  }

  async getAuthUrl(tenantId: string): Promise<string> {
    try {
      console.log(`[OAUTH] [MERCADO LIVRE] Validando credenciais para tenant ${tenantId}`);
      const { appId, redirectUri } = this.getAppCredentials();
      
      const state = tenantId;
      console.log(`[OAUTH] [MERCADO LIVRE] Gerando URL oficial com redirect_uri fixa: ${redirectUri} e state: ${state}`);
      
      const authUrl = getMeliAuthUrl(appId, redirectUri, state);
      console.log(`[OAUTH] [MERCADO LIVRE] URL de autorização gerada com sucesso.`);
      
      return authUrl;
    } catch (error) {
      console.error(`[OAUTH] [MERCADO LIVRE] Falha ao gerar URL de autorização:`, error);
      throw error;
    }
  }

  async handleAuthCallback(code: string, tenantId: string): Promise<MarketplaceAccount> {
    const { appId, clientSecret, redirectUri } = this.getAppCredentials();

    const tokens = await exchangeMeliCode(appId, clientSecret, code, redirectUri);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();
    const refreshExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 meses

    const account: MarketplaceAccount = {
      id: `meli-${tokens.user_id}`,
      tenantId,
      channel: "mercado_libre",
      sellerId: String(tokens.user_id),
      shopName: `Mercado Livre Vendedor ${tokens.user_id}`,
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
      channel: "mercado_libre",
      severity: "INFO",
      operation: "oauth_connect",
      resource: "account",
      message: `Conta Mercado Livre ID ${tokens.user_id} conectada com sucesso via OAuth 2.0.`
    });

    return account;
  }

  async refreshTokens(account: MarketplaceAccount): Promise<MarketplaceAccount> {
    const { appId, clientSecret } = this.getAppCredentials();
    const rawRefreshToken = decrypt(account.encryptedRefreshToken);

    const tokens = await refreshMeliAccessToken(appId, clientSecret, rawRefreshToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();

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
      channel: "mercado_libre",
      severity: "INFO",
      operation: "oauth_refresh",
      resource: "tokens",
      message: `Access Token do Mercado Livre renovado com sucesso.`
    });

    return updatedAccount;
  }

  async syncProducts(account: MarketplaceAccount, options?: SyncOptions): Promise<SyncResult> {
    await logMarketplaceEvent({
      tenantId: account.tenantId,
      channel: "mercado_libre",
      severity: "INFO",
      operation: "sync_products",
      resource: "products",
      message: `Iniciando sincronização incremental de produtos para Mercado Livre (Seller ID: ${account.sellerId}).`
    });

    await enqueueMarketplaceTask({
      tenantId: account.tenantId,
      channel: "mercado_libre",
      taskType: "export_product",
      priority: "normal",
      payload: { options },
      idempotencyKey: `meli_sync_prod_${account.tenantId}_${Date.now()}`
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
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const ok = await updateMeliItemStock(item.externalItemId, item.syncedStock, rawToken);
        if (ok) successCount++;
        else failCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Item ${item.externalItemId}: ${err.message}`);
      }
    }

    await enqueueMarketplaceTask({
      tenantId: account.tenantId,
      channel: "mercado_libre",
      taskType: "sync_stock",
      priority: "high",
      payload: { itemsCount: items.length, successCount },
      idempotencyKey: `meli_sync_stock_${account.tenantId}_${Date.now()}`
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
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const ok = await updateMeliItemPrice(item.externalItemId, item.syncedPrice, rawToken);
        if (ok) successCount++;
        else failCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Item ${item.externalItemId}: ${err.message}`);
      }
    }

    await enqueueMarketplaceTask({
      tenantId: account.tenantId,
      channel: "mercado_libre",
      taskType: "sync_price",
      priority: "normal",
      payload: { itemsCount: items.length, successCount },
      idempotencyKey: `meli_sync_price_${account.tenantId}_${Date.now()}`
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
      const sellerId = Number(account.sellerId);
      if (!sellerId || !rawToken) return [];

      const meliOrders = await fetchMeliOrders(sellerId, rawToken, { sinceDate, limit: 50 });
      const orders: MarketplaceOrder[] = [];

      for (const mOrder of meliOrders) {
        const orderId = String(mOrder.id);
        const buyer = mOrder.buyer || {};
        const customerName = `${buyer.first_name || ""} ${buyer.last_name || ""}`.trim() || buyer.nickname || "Comprador Mercado Livre";
        const document = buyer.billing_info?.doc_number || "";

        let trackingCode = "";
        if (mOrder.shipping?.id) {
          try {
            const ship = await fetchMeliShipment(mOrder.shipping.id, rawToken);
            if (ship) {
              trackingCode = ship.tracking_number || ship.substatus || ship.status || "";
            }
          } catch {
            // non-fatal
          }
        }

        const items = (mOrder.order_items || []).map((it: any) => ({
          externalItemId: it.item?.id || "",
          productSku: it.item?.seller_custom_field || it.item?.seller_sku || "",
          name: it.item?.title || "Item Mercado Livre",
          quantity: it.quantity || 1,
          unitPrice: it.unit_price || 0
        }));

        let orderStatus: MarketplaceOrder["orderStatus"] = "pending";
        if (mOrder.status === "paid") orderStatus = "paid";
        else if (mOrder.status === "cancelled") orderStatus = "cancelled";
        else if (mOrder.shipping?.status === "shipped") orderStatus = "shipped";
        else if (mOrder.shipping?.status === "delivered") orderStatus = "delivered";

        orders.push({
          id: `meli_order_${orderId}`,
          tenantId: account.tenantId,
          channel: "mercado_libre",
          sellerId: account.sellerId,
          externalOrderId: orderId,
          customerName,
          customerDocument: document,
          items,
          totalAmount: mOrder.total_amount || 0,
          shippingFee: mOrder.shipping_cost || 0,
          paymentMethod: mOrder.payments?.[0]?.payment_method_id || "mercadopago",
          orderStatus,
          trackingCode: trackingCode || undefined,
          idempotencyKey: `meli_${account.tenantId}_${orderId}`,
          createdAt: mOrder.date_created || new Date().toISOString(),
          updatedAt: mOrder.last_updated || new Date().toISOString()
        });
      }

      await logMarketplaceEvent({
        tenantId: account.tenantId,
        channel: "mercado_libre",
        severity: "INFO",
        operation: "fetch_orders",
        resource: "orders",
        message: `${orders.length} pedidos obtidos do Mercado Livre.`
      });

      return orders;
    } catch (err: any) {
      console.error("[MercadoLivreProvider fetchOrders error]", err);
      return [];
    }
  }

  async handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult> {
    const topic = payload?.topic || "orders";
    const resource = payload?.resource || "";
    const idempotencyKey = `meli_wh_${payload?.id || payload?.user_id || Date.now()}_${topic}`;

    return {
      status: "processed",
      idempotencyKey,
      topic,
      orderId: resource.replace("/orders/", "")
    };
  }
}
