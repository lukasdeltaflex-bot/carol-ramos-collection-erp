import { NextResponse } from "next/server";
import { logMarketplaceWebhook } from "@/services/marketplaceDbService";
import { enqueueMarketplaceTask } from "@/services/marketplaceQueueService";
import { logMarketplaceEvent } from "@/services/marketplaceLogService";

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

    const topic = body.topic || "orders";
    const userId = body.user_id || "default_user";
    const resource = body.resource || "";
    const tenantId = body.tenantId || "default_tenant";
    const idempotencyKey = `meli_wh_${userId}_${topic}_${resource.replace(/\//g, "_")}`;

    // 1. Grava no log de webhooks no Firestore
    await logMarketplaceWebhook({
      tenantId,
      channel: "mercado_libre",
      sellerId: String(userId),
      topic: `meli_${topic}`,
      idempotencyKey,
      payload: body,
      status: "pending",
      attempts: 0,
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Enfileira a tarefa assíncrona com prioridade urgente
    await enqueueMarketplaceTask({
      tenantId,
      channel: "mercado_libre",
      taskType: topic === "orders" ? "import_order" : "sync_stock",
      priority: "urgent",
      payload: { userId, topic, resource, body },
      idempotencyKey
    });

    const durationMs = Date.now() - startTime;
    await logMarketplaceEvent({
      tenantId,
      channel: "mercado_libre",
      severity: "INFO",
      operation: "webhook_received",
      resource: "webhooks",
      message: `Webhook do Mercado Livre recebido (Tópico: ${topic}, Recurso: ${resource}).`,
      durationMs,
      httpCode: 200
    });

    // 3. Responde HTTP 200 OK em menos de 200ms (Requisito obrigatório do Mercado Livre)
    return NextResponse.json({ status: "OK", message: "Notificação recebida com sucesso" });
  } catch (error: any) {
    console.error("[Mercado Livre Webhook Route Error]:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao processar webhook" }, { status: 500 });
  }
}
