import { adminDb } from "@/lib/firebase/admin";
import { MarketplaceChannel, LogSeverity } from "@/features/integrations/types/marketplaces";

export interface LogEntryInput {
  tenantId: string;
  channel: MarketplaceChannel;
  severity: LogSeverity;
  operation: string;
  resource: string;
  message: string;
  details?: any;
  durationMs?: number;
  httpCode?: number;
  userEmail?: string;
}

/**
 * Serviço de Registro de Logs Estruturados de Marketplaces.
 * Salva histórico auditável no Firestore com suporte a severidades INFO, WARNING, ERROR, CRITICAL.
 */
export async function logMarketplaceEvent(entry: LogEntryInput): Promise<string> {
  try {
    const now = new Date().toISOString();
    const docRef = await adminDb.collection("marketplace_sync_history").add({
      tenantId: entry.tenantId,
      channel: entry.channel,
      severity: entry.severity,
      operation: entry.operation,
      resource: entry.resource,
      message: entry.message,
      details: entry.details || null,
      durationMs: entry.durationMs || null,
      httpCode: entry.httpCode || null,
      userEmail: entry.userEmail || "system",
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error("[Marketplace Log Error] Falha ao registrar log no Firestore:", error, entry);
    return "";
  }
}
