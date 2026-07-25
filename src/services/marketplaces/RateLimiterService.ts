import { MarketplaceChannel, RateLimitStatus } from "@/features/integrations/types/marketplaces";
import MarketplaceRegistry from "./MarketplaceRegistry";

interface RateBucket {
  limit: number;
  remaining: number;
  resetTime: number; // Timestamp ms
}

/**
 * Controlador de API Rate Limit Inteligente (Enterprise Rate Limiter).
 * Evita bloqueios por excesso de requisições às APIs de Marketplaces aplicando
 * controle de tráfego, Retry Automático e Exponential Backoff por Tenant e Canal.
 */
class RateLimiterService {
  private readonly buckets: Map<string, RateBucket> = new Map();

  /**
   * Obtém ou inicializa o bucket de tráfego para a combinação Tenant + Canal.
   */
  private getBucket(tenantId: string, channel: MarketplaceChannel): RateBucket {
    const key = `${tenantId}:${channel}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);

    const config = MarketplaceRegistry.getConfig(channel).rateLimitConfig;
    const limit = config.maxCallsPerMinute;

    if (!bucket || now >= bucket.resetTime) {
      bucket = {
        limit,
        remaining: limit,
        resetTime: now + 60000 // Reset em 1 minuto
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Retorna o status atual do Rate Limit para um determinado Tenant e Canal.
   */
  public getStatus(tenantId: string, channel: MarketplaceChannel): RateLimitStatus {
    const bucket = this.getBucket(tenantId, channel);
    const config = MarketplaceRegistry.getConfig(channel).rateLimitConfig;

    return {
      limit: bucket.limit,
      remaining: bucket.remaining,
      resetTime: new Date(bucket.resetTime).toISOString(),
      priority: config.defaultPriority,
      retryCount: 0,
      isRateLimited: bucket.remaining <= 0
    };
  }

  /**
   * Executa uma chamada de API externa com controle de cota, Retry Automático
   * e Exponential Backoff sem gerar bloqueio no sistema principal.
   */
  public async executeWithRetry<T>(
    tenantId: string,
    channel: MarketplaceChannel,
    operationName: string,
    fn: () => Promise<T>,
    customMaxRetries?: number
  ): Promise<T> {
    const config = MarketplaceRegistry.getConfig(channel).rateLimitConfig;
    const maxRetries = customMaxRetries ?? config.maxRetries;
    const baseBackoffMs = config.baseBackoffMs;

    let attempt = 0;

    while (attempt <= maxRetries) {
      const bucket = this.getBucket(tenantId, channel);

      // Se estourou a cota do minuto, aguarda até o resetTime ou aplica backoff
      if (bucket.remaining <= 0) {
        const waitTime = Math.max(100, bucket.resetTime - Date.now() + 100);
        await this.sleep(waitTime);
      }

      try {
        bucket.remaining -= 1;
        return await fn();
      } catch (error: unknown) {
        attempt++;
        if (attempt > maxRetries) {
          throw new Error(`Falha definitiva na operação [${operationName}] no marketplace ${channel} após ${maxRetries} tentativas. Erro original: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Exponential backoff: baseBackoffMs * 2^(attempt - 1) + Jitter aleatório
        const backoff = baseBackoffMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        await this.sleep(backoff);
      }
    }

    throw new Error(`Operação [${operationName}] excedeu tentativas de retry no canal ${channel}.`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const RateLimiter = new RateLimiterService();
export default RateLimiter;
