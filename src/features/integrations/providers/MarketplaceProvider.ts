import {
  MarketplaceAccount,
  MarketplaceChannel,
  MarketplaceItem,
  MarketplaceOrder,
  WebhookProcessStatus
} from "../types/marketplaces";

export interface SyncOptions {
  sinceDate?: Date;
  incrementalOnly?: boolean;
  itemIds?: string[];
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

export interface WebhookProcessResult {
  status: WebhookProcessStatus;
  idempotencyKey: string;
  topic: string;
  orderId?: string;
  errorMessage?: string;
}

/**
 * Interface comum para todos os conectores de Marketplace do ERP Carol Ramos Collection.
 * Permite adicionar novos canais (Shopee, Mercado Livre, Amazon, Magalu, Nuvemshop)
 * sem alterar a lógica de negócios do ERP.
 */
export interface MarketplaceProvider {
  /** Identificador único do canal (ex: 'shopee', 'mercado_libre') */
  readonly channel: MarketplaceChannel;

  /** Gera a URL de autorização OAuth 2.0 para o vendedor autorizar a loja */
  getAuthUrl(tenantId: string): Promise<string>;

  /** Processa o código de autorização OAuth retornado pelo callback */
  handleAuthCallback(code: string, tenantId: string): Promise<MarketplaceAccount>;

  /** Renova os Access Tokens usando o Refresh Token (com criptografia AES-256-GCM) */
  refreshTokens(account: MarketplaceAccount): Promise<MarketplaceAccount>;

  /** Sincroniza produtos do ERP para o Marketplace */
  syncProducts(account: MarketplaceAccount, options?: SyncOptions): Promise<SyncResult>;

  /** Sincroniza estoque físico do ERP para o Marketplace */
  syncStock(account: MarketplaceAccount, items: MarketplaceItem[]): Promise<SyncResult>;

  /** Sincroniza preços de tabela do ERP para o Marketplace */
  syncPrices(account: MarketplaceAccount, items: MarketplaceItem[]): Promise<SyncResult>;

  /** Busca pedidos recentes diretamente do Marketplace */
  fetchOrders(account: MarketplaceAccount, sinceDate?: Date): Promise<MarketplaceOrder[]>;

  /** Processa um webhook recebido de forma assíncrona e rápida */
  handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult>;
}
