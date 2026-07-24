import { BaseDocument } from "@/types/shared";

export type MarketplaceChannel =
  | "shopee"
  | "mercado_libre"
  | "amazon"
  | "magalu"
  | "nuvemshop"
  | "shopify"
  | "woocommerce"
  | "tray"
  | "tiktok_shop";

export type MarketplaceConnectionStatus = "connected" | "disconnected" | "expired" | "error";

export type SourceOfTruth = "erp" | "marketplace";

export interface MarketplaceAccount extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  sellerId: string;
  shopName: string;
  status: MarketplaceConnectionStatus;
  
  // Encrypted OAuth Tokens (AES-256-GCM)
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt?: string;  // ISO Date
  refreshTokenExpiresAt?: string; // ISO Date
  
  // Configuration
  sourceOfTruth: SourceOfTruth;
  autoSyncStock: boolean;
  autoSyncPrice: boolean;
  autoSyncOrders: boolean;
  
  // Métricas de Sincronização
  syncedProductsCount: number;
  importedOrdersCount: number;
  errorsCount: number;
  lastSyncAt?: string;
  nextRenewalAt?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface MarketplaceItem extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  productId: string;            // ID do produto no ERP local
  productSku?: string;          // SKU local do ERP
  productName: string;
  channel: MarketplaceChannel;
  sellerId: string;
  
  // IDs externos no Marketplace
  externalItemId: string;       // item_id da Shopee ou MLB... do Mercado Livre
  externalVariationId?: string; // model_id da Shopee ou id de variação do Meli
  externalSku?: string;
  
  syncedPrice: number;
  syncedStock: number;
  status: "active" | "paused" | "error";
  syncStatusMessage?: string;
  lastSyncAt?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type WebhookProcessStatus = "pending" | "processed" | "failed" | "duplicate";

export interface MarketplaceWebhookLog extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  sellerId?: string;
  topic: string;
  idempotencyKey: string;       // Hash único para prevenção de duplicidade
  payload: any;
  status: WebhookProcessStatus;
  errorMessage?: string;
  attempts: number;
  receivedAt: string;
  processedAt?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type LogSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface MarketplaceSyncHistory extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  severity: LogSeverity;
  operation: string;            // Ex: "sync_stock", "import_order", "oauth_refresh"
  resource: string;             // Ex: "products", "orders", "webhooks"
  message: string;
  details?: any;
  durationMs?: number;
  httpCode?: number;
  userEmail?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface MarketplaceOrder extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  sellerId: string;
  externalOrderId: string;      // ID original do pedido no Marketplace
  internalSaleId?: string;     // ID da Venda gerada no ERP (`sales`)
  
  customerName: string;
  customerDocument?: string;
  items: {
    productId?: string;
    productSku?: string;
    externalItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  
  totalAmount: number;
  shippingFee: number;
  paymentMethod: string;
  orderStatus: "paid" | "shipped" | "delivered" | "cancelled" | "returned";
  trackingCode?: string;
  shippedAt?: string;
  
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type QueueTaskType = "sync_stock" | "sync_price" | "import_order" | "export_product" | "process_webhook";
export type QueueTaskPriority = "urgent" | "high" | "normal" | "low";
export type QueueTaskStatus = "pending" | "processing" | "completed" | "failed";

export interface MarketplaceInventoryQueue extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  taskType: QueueTaskType;
  priority: QueueTaskPriority;
  status: QueueTaskStatus;
  
  payload: any;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;        // ISO Date com Exponential Backoff
  lastError?: string;
  
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
  createdBy?: string;
}
