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
  | "tiktok_shop"
  | "via_varejo"
  | "americanas"
  | "madeiramadeira"
  | "shein";

export type MarketplaceConnectionStatus = "connected" | "disconnected" | "expired" | "error";

export type SourceOfTruth = "erp" | "marketplace";
export type ApiVersion = "v1" | "v2" | "v3";

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: string; // ISO Date
  priority: string;
  retryCount: number;
  isRateLimited: boolean;
}

export interface MarketplaceAccount extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  sellerId: string;
  shopName: string;
  name?: string;
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
  apiVersion?: ApiVersion;
  rateLimitStatus?: RateLimitStatus;
  
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
  
  // Compatibilidade Enterprise
  title?: string;
  price?: number;
  stock?: number;
  erpItemId?: string;

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

export type MarketplaceOrderStatus = "paid" | "shipped" | "delivered" | "cancelled" | "returned" | "pending";

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
  orderStatus: MarketplaceOrderStatus;
  trackingCode?: string;
  shippedAt?: string;
  deliveredAt?: string;
  currency?: string;
  itemsCount?: number;
  
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type QueueTaskType =
  | "sync_stock"
  | "sync_price"
  | "import_order"
  | "import_orders"
  | "sync_product"
  | "export_product"
  | "process_webhook";
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

export interface MarketplaceRegistryConfig {
  channel: MarketplaceChannel;
  name: string;
  defaultApiVersion: ApiVersion;
  acceptsVideo: boolean;
  acceptsGtin: boolean;
  acceptsNcm: boolean;
  acceptsKits: boolean;
  acceptsVariations: boolean;
  maxImages: number;
  maxVideos: number;
  requireDimensions: boolean;
  requireWeight: boolean;
  requireCategory: boolean;
  specificAttributes: string[];
  rateLimitConfig: {
    maxCallsPerMinute: number;
    defaultPriority: QueueTaskPriority;
    maxRetries: number;
    baseBackoffMs: number;
  };
}

export type MarketplaceEventTopic =
  | "PEDIDO_RECEBIDO"
  | "ESTOQUE_ALTERADO"
  | "ANUNCIO_PAUSADO"
  | "PRECO_ALTERADO"
  | "ERRO_INTEGRACAO"
  | "TOKEN_EXPIRANDO"
  | "ETIQUETA_DISPONIVEL"
  | "PAGAMENTO_APROVADO"
  | "PEDIDO_CANCELADO"
  | "INCIDENTE_REGISTRADO";

export interface EventBusMessage<T = Record<string, unknown>> {
  id: string;
  topic: MarketplaceEventTopic;
  tenantId: string;
  channel?: MarketplaceChannel;
  payload: T;
  timestamp: string; // ISO Date
}

export interface DeadLetterQueueTask extends MarketplaceInventoryQueue {
  failedReason: string;
  stackTrace?: string;
  movedToDlqAt: string; // ISO Date
}

export type IncidentSeverity = "INFO" | "AVISO" | "ATENCAO" | "CRITICO";
export type IncidentStatus = "open" | "investigating" | "resolved" | "ignored";

export interface IncidentTicket extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  resourceType?: "order" | "product" | "auth" | "queue" | "webhook";
  resourceId?: string;
  apiVersion?: ApiVersion;
  httpCode?: number;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CacheEntityType = "products" | "orders" | "dashboard" | "finance" | "config" | "sync";

export interface CacheTTLConfig {
  entityType: CacheEntityType;
  ttlSeconds: number;
}

export interface ProfitSimulation {
  id?: string;
  tenantId: string;
  channel: MarketplaceChannel;
  productName: string;
  buyPrice: number;
  sellPrice: number;
  freightCost: number;
  taxPercentage: number;
  commissionPercentage: number;
  commissionFixed: number;
  packagingCost: number;
  operationalCost: number;
  variableCost: number;
  desiredMarginPercentage: number;
  totalCosts: number;
  netProfit: number;
  actualMarginPercentage: number;
  roiPercentage: number;
  minSellPrice: number;
  idealSellPrice: number;
  recommendedSellPrice: number;
  createdAt?: string;
}

export interface AutomationRule extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  name: string;
  trigger: "ESTOQUE_ZERO" | "ESTOQUE_POSITIVO" | "PEDIDO_PAGO" | "NF_EMITIDA" | "ETIQUETA_CRIADA";
  action: "PAUSAR_ANUNCIO" | "REATIVAR_ANUNCIO" | "EMITIR_NF" | "ATUALIZAR_MARKETPLACE" | "ATUALIZAR_RASTREIO";
  isActive: boolean;
  channel?: MarketplaceChannel;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditIssueType =
  | "product_no_image"
  | "product_no_category"
  | "price_incorrect"
  | "price_below_margin"
  | "sku_duplicate"
  | "ean_invalid"
  | "gtin_invalid"
  | "stock_negative"
  | "title_short"
  | "description_poor"
  | "photos_insufficient"
  | "weight_missing"
  | "dimensions_missing"
  | "category_invalid"
  | "ad_paused"
  | "token_expiring"
  | "webhook_error"
  | "queue_stalled"
  | "sync_delayed";

export interface MarketplaceAuditIssue extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  channel: MarketplaceChannel;
  issueType: AuditIssueType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  resourceId: string;
  resourceName: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOrderDetails extends MarketplaceOrder {
  customerCpfCnpj?: string;
  customerCity?: string;
  customerState?: string;
  customerAddress?: string;
  freightAmount?: number;
  taxAmount?: number;
  commissionAmount?: number;
  netProfitAmount?: number;
  invoiceNumber?: string;
  invoiceKey?: string;
  shippingLabelUrl?: string;
  notes?: string;
  timeline: {
    status: string;
    label: string;
    timestamp: string;
    isCompleted: boolean;
  }[];
}

export interface ProductAdEditorData {
  productId: string;
  externalItemId?: string;
  channel: MarketplaceChannel;
  title: string;
  description: string;
  category: string;
  photos: string[];
  videos: string[];
  price: number;
  promoPrice?: number;
  stock: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  ncm?: string;
  gtin?: string;
  warranty?: string;
  condition?: "new" | "used";
  attributes: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

export type MarketplacePermission =
  | "view_marketplace"
  | "edit_marketplace"
  | "delete_marketplace"
  | "sync_marketplace"
  | "reconnect_marketplace"
  | "publish_ad"
  | "edit_ad"
  | "delete_ad"
  | "emit_nfe"
  | "generate_label"
  | "edit_prices"
  | "view_finance_marketplace"
  | "view_audit_marketplace"
  | "view_logs_marketplace"
  | "use_ai_marketplace"
  | "use_simulator"
  | "manage_automations";

