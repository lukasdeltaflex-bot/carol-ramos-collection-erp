import { adminDb } from "@/lib/firebase/admin";
import {
  LogSeverity,
  MarketplaceAccount,
  MarketplaceAuditIssue,
  MarketplaceChannel,
  MarketplaceItem
} from "@/features/integrations/types/marketplaces";
import { logMarketplaceEvent } from "../marketplaceLogService";
import MarketplaceRegistry from "./MarketplaceRegistry";
import Cache from "./CacheService";

export interface LogFilterOptions {
  channel?: MarketplaceChannel;
  severity?: LogSeverity;
  operation?: string;
  limitCount?: number;
}

/**
 * Serviço de Logs Estruturados e Auditoria Inteligente (Enterprise Log & Audit Scanner).
 * Grava histórico detalhado de sincronizações (via marketplaceLogService) e realiza
 * varreduras automáticas nos anúncios para identificar inconsistências (fotos faltando,
 * NCM ausente, estoque negativo ou tokens próximos ao vencimento).
 */
class LogService {
  private readonly auditCollectionName = "marketplace_audit_issues";

  /**
   * Grava um log auditable no sistema.
   */
  public async log(
    tenantId: string,
    channel: MarketplaceChannel,
    severity: LogSeverity,
    operation: string,
    resource: string,
    message: string,
    details?: Record<string, unknown>,
    durationMs?: number,
    httpCode?: number,
    userEmail?: string
  ): Promise<string> {
    return await logMarketplaceEvent({
      tenantId,
      channel,
      severity,
      operation,
      resource,
      message,
      details,
      durationMs,
      httpCode,
      userEmail
    });
  }

  /**
   * Lista o histórico recente de logs de sincronização do Tenant.
   */
  public async getRecentLogs(tenantId: string, options?: LogFilterOptions): Promise<Record<string, unknown>[]> {
    let query: FirebaseFirestore.Query = adminDb
      .collection("marketplace_sync_history")
      .where("tenantId", "==", tenantId);

    if (options?.channel) {
      query = query.where("channel", "==", options.channel);
    }
    if (options?.severity) {
      query = query.where("severity", "==", options.severity);
    }
    if (options?.operation) {
      query = query.where("operation", "==", options.operation);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(options?.limitCount ?? 50).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Executa a Varredura de Auditoria Inteligente (Audit Scanner - Ponto Auditoria Inteligente).
   * Inspeciona todas as contas e produtos cadastrados apontando riscos e inconformidades.
   */
  public async runAuditScanner(tenantId: string): Promise<MarketplaceAuditIssue[]> {
    const issues: Omit<MarketplaceAuditIssue, "id">[] = [];
    const now = new Date().toISOString();

    // 1. Inspeciona Contas (Tokens Expirando ou Desconectados)
    const accountsSnap = await adminDb.collection("marketplace_accounts").where("tenantId", "==", tenantId).get();
    accountsSnap.forEach(doc => {
      const acc = doc.data() as MarketplaceAccount;
      if (acc.status === "expired" || acc.status === "error") {
        issues.push({
          tenantId,
          channel: acc.channel,
          issueType: "token_expiring",
          severity: "CRITICO",
          title: `Conta do ${acc.channel} Desconectada`,
          description: `A autenticação do lojista (${acc.shopName || acc.sellerId}) venceu ou falhou. Sincronização interrompida.`,
          resourceId: doc.id,
          resourceName: acc.shopName || acc.sellerId,
          isResolved: false,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // 2. Inspeciona Produtos (Estoque Negativo, Preço Zerado, Sem Categoria)
    const itemsSnap = await adminDb.collection("marketplace_items").where("tenantId", "==", tenantId).get();
    itemsSnap.forEach(doc => {
      const item = doc.data() as MarketplaceItem;
      const ch = item.channel || "mercado_libre";
      const stock = item.stock ?? item.syncedStock ?? 0;
      const price = item.price ?? item.syncedPrice ?? 0;
      const title = item.title || item.productName || "Anúncio";

      if (stock < 0) {
        issues.push({
          tenantId,
          channel: ch,
          issueType: "stock_negative",
          severity: "ATENCAO",
          title: `Estoque Negativo (${stock}) no Anúncio`,
          description: `O item [${title}] está com quantidade negativa, risco de cancelamento por falta de estoque.`,
          resourceId: doc.id,
          resourceName: title,
          isResolved: false,
          createdAt: now,
          updatedAt: now
        });
      }

      if (price <= 0) {
        issues.push({
          tenantId,
          channel: ch,
          issueType: "price_incorrect",
          severity: "CRITICO",
          title: `Preço Zerado ou Inválido`,
          description: `O item [${title}] possui preço R$ ${price}, impedindo a venda ou causando prejuízos.`,
          resourceId: doc.id,
          resourceName: title,
          isResolved: false,
          createdAt: now,
          updatedAt: now
        });
      }

      if (item.status === "paused") {
        issues.push({
          tenantId,
          channel: ch,
          issueType: "ad_paused",
          severity: "AVISO",
          title: `Anúncio Pausado na Plataforma`,
          description: `O anúncio [${title}] está pausado. Verifique se foi intencional ou falta de estoque.`,
          resourceId: doc.id,
          resourceName: title,
          isResolved: false,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // Grava os novos problemas de auditoria encontrados (substituindo antigos em aberto do mesmo tipo/recurso)
    const batch = adminDb.batch();
    const createdIssues: MarketplaceAuditIssue[] = [];

    for (const issue of issues) {
      const docRef = adminDb.collection(this.auditCollectionName).doc();
      batch.set(docRef, issue);
      createdIssues.push({ id: docRef.id, ...issue });
    }

    if (issues.length > 0) {
      await batch.commit();
    }

    Cache.invalidateByEntity(tenantId, "dashboard");
    return createdIssues;
  }

  /**
   * Resolve um problema de auditoria após correção do usuário.
   */
  public async resolveAuditIssue(tenantId: string, issueId: string): Promise<void> {
    const docRef = adminDb.collection(this.auditCollectionName).doc(issueId);
    const doc = await docRef.get();
    if (!doc.exists) return;

    const data = doc.data() as MarketplaceAuditIssue;
    if (data.tenantId !== tenantId) return;

    await docRef.update({
      isResolved: true,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Lista pendências de auditoria ativas no Tenant.
   */
  public async listAuditIssues(tenantId: string, resolved = false): Promise<MarketplaceAuditIssue[]> {
    const snapshot = await adminDb
      .collection(this.auditCollectionName)
      .where("tenantId", "==", tenantId)
      .where("isResolved", "==", resolved)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<MarketplaceAuditIssue, "id">)
    }));
  }
}

export const Logs = new LogService();
export default Logs;
