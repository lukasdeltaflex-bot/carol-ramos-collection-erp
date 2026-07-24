import { NextResponse } from "next/server";
import { logMarketplaceWebhook } from "@/services/marketplaceDbService";
import { enqueueMarketplaceTask } from "@/services/marketplaceQueueService";
import { logMarketplaceEvent } from "@/services/marketplaceLogService";
import { verifyShopeeWebhookSign } from "@/lib/marketplaces/shopee";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      body = { raw: rawBody };
    }

    const signature = req.headers.get("authorization") || req.headers.get("x-shopee-signature") || "";
    const partnerKey = process.env.SHOPEE_PARTNER_KEY || "shopee_partner_key_secret_2026";
    const requestUrl = req.url;

    // Se estiver em ambiente real com assinatura configurada, valida HMAC
    if (signature && partnerKey && process.env.NODE_ENV === "production") {
      const isValid = verifyShopeeWebhookSign(requestUrl, rawBody, partnerKey, signature);
      if (!isValid) {
        console.warn("[Shopee Webhook] Assinatura HMAC inválida recusada.");
        return NextResponse.json({ error: "Assinatura HMAC inválida" }, { status: 401 });
      }
    }

    const shopId = body.shop_id || body.data?.shop_id || "default_shop";
    const tenantId = body.tenantId || "default_tenant";
    const eventCode = body.code || body.event_type || 3; // 3 = Order Status Update
    const orderSn = body.data?.ordersn || body.ordersn || `order_${Date.now()}`;
    const idempotencyKey = `shopee_wh_${shopId}_${eventCode}_${orderSn}`;

    // Registra o webhook no Firestore com idempotência
    await logMarketplaceWebhook({
      tenantId,
      channel: "shopee",
      sellerId: String(shopId),
      topic: `shopee_code_${eventCode}`,
      idempotencyKey,
      payload: body,
      status: "pending",
      attempts: 0,
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Enfileira para processamento assíncrono
    await enqueueMarketplaceTask({
      tenantId,
      channel: "shopee",
      taskType: "process_webhook",
      priority: "urgent",
      payload: { shopId, eventCode, orderSn, body },
      idempotencyKey
    });

    const durationMs = Date.now() - startTime;
    await logMarketplaceEvent({
      tenantId,
      channel: "shopee",
      severity: "INFO",
      operation: "webhook_received",
      resource: "webhooks",
      message: `Webhook da Shopee recebido com sucesso (Evento: ${eventCode}, Pedido: ${orderSn}).`,
      durationMs,
      httpCode: 200
    });

    // Retorna HTTP 200 OK imediatamente para a Shopee
    return NextResponse.json({ code: 0, message: "Webhook recebido com sucesso" });
  } catch (error: any) {
    console.error("[Shopee Webhook Route Error]:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao processar webhook" }, { status: 500 });
  }
}
