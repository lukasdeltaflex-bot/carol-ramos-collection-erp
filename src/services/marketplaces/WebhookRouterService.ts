import { MarketplaceChannel, WebhookProcessStatus } from "@/features/integrations/types/marketplaces";
import EventBus from "./EventBusService";

export interface WebhookHandlerResult {
  status: WebhookProcessStatus;
  channel: MarketplaceChannel;
  idempotencyKey: string;
  topic: string;
  errorMessage?: string;
  processedPayload?: Record<string, unknown>;
}

export interface WebhookChannelHandler {
  readonly channel: MarketplaceChannel;
  canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean;
  process(tenantId: string, headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult>;
}

// 1. ML Handler
class WebhookMLHandler implements WebhookChannelHandler {
  readonly channel = "mercado_libre" as const;
  public canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(headers["x-meli-signature"] || payload["topic"] || payload["resource"]?.toString().startsWith("/orders/") || payload["resource"]?.toString().startsWith("/items/"));
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const topic = String(payload["topic"] || "items");
    const resourceId = String(payload["resource"] || payload["_id"] || `meli_${Date.now()}`);
    const idempotencyKey = `meli_${tenantId}_${resourceId}_${payload["sent"] || Date.now()}`;

    if (topic === "orders") {
      await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    } else if (topic === "items") {
      await EventBus.publish({ id: idempotencyKey, topic: "ESTOQUE_ALTERADO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    }

    return { status: "processed", channel: this.channel, idempotencyKey, topic, processedPayload: payload };
  }
}

// 2. Shopee Handler
class WebhookShopeeHandler implements WebhookChannelHandler {
  readonly channel = "shopee" as const;
  public canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(headers["authorization"]?.includes("shopee") || payload["shop_id"] || payload["code"] === 3 || payload["code"] === 4);
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const code = Number(payload["code"] || 0);
    const shopId = String(payload["shop_id"] || "shopee");
    const idempotencyKey = `shopee_${tenantId}_${shopId}_${payload["timestamp"] || Date.now()}`;
    const topic = code === 3 ? "orders" : "items";

    if (code === 3) {
      await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    }

    return { status: "processed", channel: this.channel, idempotencyKey, topic, processedPayload: payload };
  }
}

// 3. Amazon Handler
class WebhookAmazonHandler implements WebhookChannelHandler {
  readonly channel = "amazon" as const;
  public canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(headers["x-amz-sns-message-type"] || payload["NotificationType"] || payload["EventTime"]);
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const notifType = String(payload["NotificationType"] || "ORDER_CHANGE");
    const idempotencyKey = `amz_${tenantId}_${payload["NotificationId"] || Date.now()}`;
    if (notifType.includes("ORDER")) {
      await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    }
    return { status: "processed", channel: this.channel, idempotencyKey, topic: notifType, processedPayload: payload };
  }
}

// 4. Magalu Handler
class WebhookMagaluHandler implements WebhookChannelHandler {
  readonly channel = "magalu" as const;
  public canHandle(_headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(payload["id_magalu"] || payload["order_magalu"] || payload["seller_id_magalu"]);
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const idempotencyKey = `magalu_${tenantId}_${payload["id"] || Date.now()}`;
    await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    return { status: "processed", channel: this.channel, idempotencyKey, topic: "order_update", processedPayload: payload };
  }
}

// 5. Americanas Handler
class WebhookAmericanasHandler implements WebhookChannelHandler {
  readonly channel = "americanas" as const;
  public canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(headers["x-skyhub-signature"] || payload["seller_id"] || payload["b2w_order_id"]);
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const idempotencyKey = `americanas_${tenantId}_${payload["code"] || Date.now()}`;
    await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    return { status: "processed", channel: this.channel, idempotencyKey, topic: "order", processedPayload: payload };
  }
}

// 6. Via Varejo Handler
class WebhookViaHandler implements WebhookChannelHandler {
  readonly channel = "via_varejo" as const;
  public canHandle(_headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(payload["idPedidoViaVarejo"] || payload["idLojista"] || payload["origem"] === "VIA_VAREJO");
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const idempotencyKey = `via_${tenantId}_${payload["idPedidoViaVarejo"] || Date.now()}`;
    await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    return { status: "processed", channel: this.channel, idempotencyKey, topic: "order_via", processedPayload: payload };
  }
}

// 7. MadeiraMadeira Handler
class WebhookMadeiraMadeiraHandler implements WebhookChannelHandler {
  readonly channel = "madeiramadeira" as const;
  public canHandle(_headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(payload["id_madeira"] || payload["order_madeira"]);
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const idempotencyKey = `madeira_${tenantId}_${payload["id_madeira"] || Date.now()}`;
    await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    return { status: "processed", channel: this.channel, idempotencyKey, topic: "order_madeira", processedPayload: payload };
  }
}

// 8. TikTok Shop Handler
class WebhookTikTokHandler implements WebhookChannelHandler {
  readonly channel = "tiktok_shop" as const;
  public canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(headers["x-tts-signature"] || payload["shop_id"]?.toString().startsWith("tts_") || payload["type"]?.toString().startsWith("ORDER_"));
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const idempotencyKey = `tiktok_${tenantId}_${payload["id"] || Date.now()}`;
    await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    return { status: "processed", channel: this.channel, idempotencyKey, topic: "tiktok_event", processedPayload: payload };
  }
}

// 9. Shein Handler
class WebhookSheinHandler implements WebhookChannelHandler {
  readonly channel = "shein" as const;
  public canHandle(headers: Record<string, string>, payload: Record<string, unknown>): boolean {
    return Boolean(headers["x-shein-sign"] || payload["open_id"] || payload["event_type"]?.toString().startsWith("SHEIN_"));
  }
  public async process(tenantId: string, _headers: Record<string, string>, payload: Record<string, unknown>): Promise<WebhookHandlerResult> {
    const idempotencyKey = `shein_${tenantId}_${payload["event_id"] || Date.now()}`;
    await EventBus.publish({ id: idempotencyKey, topic: "PEDIDO_RECEBIDO", tenantId, channel: this.channel, payload, timestamp: new Date().toISOString() });
    return { status: "processed", channel: this.channel, idempotencyKey, topic: "shein_event", processedPayload: payload };
  }
}

/**
 * Roteador Central de Webhooks (Enterprise Webhook Router - Ponto Webhook Router).
 * Inspeciona os cabeçalhos e corpo da requisição para rotear automaticamente
 * para o Handler oficial sem espalhar endpoints pela aplicação.
 */
class WebhookRouterService {
  private readonly handlers: WebhookChannelHandler[] = [
    new WebhookMLHandler(),
    new WebhookShopeeHandler(),
    new WebhookAmazonHandler(),
    new WebhookMagaluHandler(),
    new WebhookAmericanasHandler(),
    new WebhookViaHandler(),
    new WebhookMadeiraMadeiraHandler(),
    new WebhookTikTokHandler(),
    new WebhookSheinHandler(),
  ];

  public async routeAndProcess(
    tenantId: string,
    headers: Record<string, string>,
    payload: Record<string, unknown>,
    explicitChannel?: MarketplaceChannel
  ): Promise<WebhookHandlerResult> {
    // Se canal for explícito, tenta achar o handler correspondente
    if (explicitChannel) {
      const handler = this.handlers.find(h => h.channel === explicitChannel);
      if (handler) {
        return await handler.process(tenantId, headers, payload);
      }
    }

    // Identificação automática por assinatura ou formato de payload
    for (const handler of this.handlers) {
      if (handler.canHandle(headers, payload)) {
        return await handler.process(tenantId, headers, payload);
      }
    }

    // Se não reconheceu nenhum, cai no fallback seguro (meli por padrão ou genérico)
    const fallback = this.handlers[0];
    return await fallback.process(tenantId, headers, payload);
  }
}

export const WebhookRouter = new WebhookRouterService();
export default WebhookRouter;
