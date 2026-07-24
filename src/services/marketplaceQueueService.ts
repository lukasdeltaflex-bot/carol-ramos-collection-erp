import { adminDb } from "@/lib/firebase/admin";
import {
  MarketplaceChannel,
  MarketplaceInventoryQueue,
  QueueTaskPriority,
  QueueTaskStatus,
  QueueTaskType
} from "@/features/integrations/types/marketplaces";
import { logMarketplaceEvent } from "./marketplaceLogService";

export interface AddQueueTaskInput {
  tenantId: string;
  channel: MarketplaceChannel;
  taskType: QueueTaskType;
  priority?: QueueTaskPriority;
  payload: any;
  idempotencyKey: string;
  maxAttempts?: number;
}

/**
 * Calcula o próximo intervalo de retry usando Exponential Backoff.
 * @param attempt Número da tentativa atual (1, 2, 3...)
 * @returns Timestamp ISO em que a tarefa deve ser tentada novamente
 */
export function calculateExponentialBackoff(attempt: number): string {
  // Base: 2s, 4s, 8s, 16s, 32s... + Jitter aleatório de 0-500ms
  const delayMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
  const nextDate = new Date(Date.now() + delayMs);
  return nextDate.toISOString();
}

/**
 * Adiciona uma nova tarefa à fila de inventário/marketplaces com verificação de Idempotência.
 */
export async function enqueueMarketplaceTask(input: AddQueueTaskInput): Promise<string> {
  const { tenantId, channel, taskType, priority = "normal", payload, idempotencyKey, maxAttempts = 5 } = input;

  try {
    // Check de Idempotência: Se a tarefa já existe com esse idempotencyKey em estado pending/completed
    const existing = await adminDb
      .collection("marketplace_inventory_queue")
      .where("tenantId", "==", tenantId)
      .where("idempotencyKey", "==", idempotencyKey)
      .get();

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      const data = existingDoc.data() as MarketplaceInventoryQueue;
      if (data.status === "completed" || data.status === "pending" || data.status === "processing") {
        console.log(`[Queue Idempotency] Tarefa ${idempotencyKey} ignorada por duplicidade (Status: ${data.status}).`);
        return existingDoc.id;
      }
    }

    const now = new Date().toISOString();
    const newTask: Omit<MarketplaceInventoryQueue, "id"> = {
      tenantId,
      channel,
      taskType,
      priority,
      status: "pending" as QueueTaskStatus,
      payload,
      attempts: 0,
      maxAttempts,
      nextAttemptAt: now,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
      createdBy: "system"
    };

    const docRef = await adminDb.collection("marketplace_inventory_queue").add(newTask);
    return docRef.id;
  } catch (error: any) {
    console.error("[Queue Error] Falha ao enfileirar tarefa:", error);
    await logMarketplaceEvent({
      tenantId,
      channel,
      severity: "ERROR",
      operation: "enqueue_task",
      resource: "queue",
      message: `Erro ao adicionar tarefa à fila: ${error.message || "Erro desconhecido"}`
    });
    throw error;
  }
}

/**
 * Marca uma tarefa da fila como concluída com sucesso.
 */
export async function completeQueueTask(taskId: string): Promise<void> {
  const now = new Date().toISOString();
  await adminDb.collection("marketplace_inventory_queue").doc(taskId).update({
    status: "completed",
    updatedAt: now,
    executedAt: now
  });
}

/**
 * Registra falha de execução de tarefa e aplica Exponential Backoff ou marca como FAILED definitivo.
 */
export async function failQueueTask(taskId: string, error: any): Promise<void> {
  const taskRef = adminDb.collection("marketplace_inventory_queue").doc(taskId);
  const doc = await taskRef.get();
  if (!doc.exists) return;

  const data = doc.data() as MarketplaceInventoryQueue;
  const currentAttempts = data.attempts + 1;
  const errMsg = error.message || String(error);
  const now = new Date().toISOString();

  if (currentAttempts >= data.maxAttempts) {
    // Limite máximo atingido: falha definitiva
    await taskRef.update({
      status: "failed",
      attempts: currentAttempts,
      lastError: errMsg,
      updatedAt: now
    });

    await logMarketplaceEvent({
      tenantId: data.tenantId,
      channel: data.channel,
      severity: "CRITICAL",
      operation: data.taskType,
      resource: "queue",
      message: `Tarefa ${taskId} falhou definitivamente após ${currentAttempts} tentativas. Erro: ${errMsg}`
    });
  } else {
    // Aplica Exponential Backoff para próxima tentativa
    const nextAttemptAt = calculateExponentialBackoff(currentAttempts);
    await taskRef.update({
      status: "pending",
      attempts: currentAttempts,
      nextAttemptAt,
      lastError: errMsg,
      updatedAt: now
    });

    await logMarketplaceEvent({
      tenantId: data.tenantId,
      channel: data.channel,
      severity: "WARNING",
      operation: data.taskType,
      resource: "queue",
      message: `Tentativa ${currentAttempts}/${data.maxAttempts} falhou. Próxima execução agendada para ${nextAttemptAt}. Erro: ${errMsg}`
    });
  }
}
