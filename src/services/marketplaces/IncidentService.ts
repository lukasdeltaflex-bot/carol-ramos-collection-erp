import { adminDb } from "@/lib/firebase/admin";
import {
  IncidentSeverity,
  IncidentStatus,
  IncidentTicket,
  MarketplaceChannel
} from "@/features/integrations/types/marketplaces";
import EventBus from "./EventBusService";

export interface CreateIncidentInput {
  tenantId: string;
  channel: MarketplaceChannel;
  severity: IncidentSeverity;
  title: string;
  description: string;
  resourceType?: "order" | "product" | "auth" | "queue" | "webhook";
  resourceId?: string;
  httpCode?: number;
}

/**
 * Serviço da Central de Incidentes Enterprise (Ponto Central de Incidentes).
 * Gerencia alertas de estabilidade e falhas operacionais com categorização por severidade
 * (Info, Aviso, Atenção, Crítico), trilha de auditoria e resolução manual com isolamento por Tenant.
 */
class IncidentService {
  private readonly collectionName = "marketplace_incidents";

  /**
   * Registra um novo incidente operacional e publica alerta no EventBus.
   */
  public async createIncident(input: CreateIncidentInput): Promise<string> {
    const now = new Date().toISOString();
    const ticket: Omit<IncidentTicket, "id"> = {
      tenantId: input.tenantId,
      channel: input.channel,
      severity: input.severity,
      status: "open" as IncidentStatus,
      title: input.title,
      description: input.description,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      httpCode: input.httpCode,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await adminDb.collection(this.collectionName).add(ticket);

    // Dispara evento no barramento se for ATENÇÃO ou CRÍTICO
    if (input.severity === "ATENCAO" || input.severity === "CRITICO") {
      await EventBus.publish({
        id: `inc_${docRef.id}`,
        topic: "INCIDENTE_REGISTRADO",
        tenantId: input.tenantId,
        channel: input.channel,
        payload: { ticketId: docRef.id, title: input.title, severity: input.severity },
        timestamp: now
      });
    }

    return docRef.id;
  }

  /**
   * Resolve manualmente ou ignora um ticket de incidente no sistema.
   */
  public async resolveIncident(
    tenantId: string,
    ticketId: string,
    resolutionNotes: string,
    userEmail: string,
    newStatus: "resolved" | "ignored" = "resolved"
  ): Promise<void> {
    const docRef = adminDb.collection(this.collectionName).doc(ticketId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Incidente não encontrado com ID: ${ticketId}`);
    }

    const data = doc.data() as IncidentTicket;
    if (data.tenantId !== tenantId) {
      throw new Error("Acesso negado: Tentativa de resolver incidente de outro Tenant.");
    }

    const now = new Date().toISOString();
    await docRef.update({
      status: newStatus,
      resolvedAt: now,
      resolvedBy: userEmail,
      resolutionNotes,
      updatedAt: now
    });
  }

  /**
   * Lista incidentes ativos ou históricos por Tenant com filtros opcionais de canal e severidade.
   */
  public async listIncidents(
    tenantId: string,
    options?: {
      channel?: MarketplaceChannel;
      severity?: IncidentSeverity;
      status?: IncidentStatus;
      limit?: number;
    }
  ): Promise<IncidentTicket[]> {
    let query: FirebaseFirestore.Query = adminDb
      .collection(this.collectionName)
      .where("tenantId", "==", tenantId);

    if (options?.channel) {
      query = query.where("channel", "==", options.channel);
    }
    if (options?.severity) {
      query = query.where("severity", "==", options.severity);
    }
    if (options?.status) {
      query = query.where("status", "==", options.status);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(options?.limit ?? 50).get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<IncidentTicket, "id">)
    }));
  }
}

export const Incident = new IncidentService();
export default Incident;
