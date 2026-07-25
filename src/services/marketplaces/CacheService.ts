import { CacheEntityType, CacheTTLConfig } from "@/features/integrations/types/marketplaces";
import EventBus from "./EventBusService";

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Timestamp ms
  tenantId: string;
  entityType: CacheEntityType;
}

/**
 * Serviço de Cache Inteligente em Memória (Enterprise Caching - Ponto Cache Inteligente).
 * Otimiza chamadas ao Firestore e às APIs de Marketplaces aplicando regras de TTL
 * por tipo de entidade e invalidação proativa via EventBus.
 * - Produtos: 5 min | Pedidos: 1 min | Dashboard: 30 seg
 * - Financeiro: 5 min | Configurações: 30 min | Sync: 30 seg
 */
class CacheService {
  private readonly store: Map<string, CacheEntry<unknown>> = new Map();
  private readonly ttls: Map<CacheEntityType, number> = new Map([
    ["products", 300],    // 5 min em segundos
    ["orders", 60],       // 1 min em segundos
    ["dashboard", 30],    // 30 seg em segundos
    ["finance", 300],     // 5 min em segundos
    ["config", 1800],     // 30 min em segundos
    ["sync", 30]          // 30 seg em segundos
  ]);

  constructor() {
    this.setupAutoInvalidation();
  }

  /**
   * Configura invalidação automática de cache quando eventos relevantes ocorrem no sistema.
   */
  private setupAutoInvalidation(): void {
    // Quando entra novo pedido, limpa cache de orders, dashboard e finance
    EventBus.subscribe("PEDIDO_RECEBIDO", message => {
      this.invalidateByEntity(message.tenantId, "orders");
      this.invalidateByEntity(message.tenantId, "dashboard");
      this.invalidateByEntity(message.tenantId, "finance");
    });

    // Quando altera estoque ou preço, limpa cache de products e dashboard
    EventBus.subscribe("ESTOQUE_ALTERADO", message => {
      this.invalidateByEntity(message.tenantId, "products");
      this.invalidateByEntity(message.tenantId, "dashboard");
    });

    EventBus.subscribe("PRECO_ALTERADO", message => {
      this.invalidateByEntity(message.tenantId, "products");
    });
  }

  /**
   * Define um TTL customizado para uma entidade (em segundos).
   */
  public setTTLConfig(config: CacheTTLConfig): void {
    this.ttls.set(config.entityType, config.ttlSeconds);
  }

  /**
   * Obtém um dado do cache ou executa a função de busca e armazena com TTL inteligente.
   */
  public async getOrFetch<T>(
    tenantId: string,
    entityType: CacheEntityType,
    cacheKey: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const fullKey = `${tenantId}:${entityType}:${cacheKey}`;
    const now = Date.now();
    const entry = this.store.get(fullKey) as CacheEntry<T> | undefined;

    if (entry && now < entry.expiresAt) {
      return entry.data;
    }

    // Cache miss ou expirado: busca o dado original
    const data = await fetchFn();
    const ttlSeconds = this.ttls.get(entityType) ?? 60;
    
    this.store.set(fullKey, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      tenantId,
      entityType
    });

    return data;
  }

  /**
   * Invalida todas as chaves de cache para um determinado Tenant e Tipo de Entidade.
   */
  public invalidateByEntity(tenantId: string, entityType: CacheEntityType): void {
    const prefix = `${tenantId}:${entityType}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalida uma chave de cache específica.
   */
  public invalidateKey(tenantId: string, entityType: CacheEntityType, cacheKey: string): void {
    this.store.delete(`${tenantId}:${entityType}:${cacheKey}`);
  }

  /**
   * Limpa todo o cache em memória (útil em testes ou logouts globais).
   */
  public clearAll(): void {
    this.store.clear();
  }
}

export const Cache = new CacheService();
export default Cache;
