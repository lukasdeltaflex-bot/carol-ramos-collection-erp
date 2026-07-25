import { adminDb } from "@/lib/firebase/admin";
import EventBus from "./EventBusService";
import { logMarketplaceEvent } from "../marketplaceLogService";

/**
 * Serviço de Notificações e Alertas em Tempo Real (Enterprise Notifications).
 * Conecta-se diretamente ao EventBus para disparar avisos automáticos sobre
 * estoque zerado, tokens prestes a expirar, novos pedidos pagos e incidentes operacionais.
 */
class NotificationMarketplaceService {
  private readonly collectionName = "notifications";

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Alerta de Pedido Recebido
    EventBus.subscribe("PEDIDO_RECEBIDO", async message => {
      const payload = message.payload as Record<string, unknown>;
      await this.createNotification(
        message.tenantId,
        "Novos Pedidos no Marketplace",
        `Pedido ${payload["externalOrderId"] || message.id} recebido no canal ${message.channel || "Hub"}.`,
        "info",
        "/marketplaces?tab=orders"
      );
    });

    // Alerta de Token Expirando
    EventBus.subscribe("TOKEN_EXPIRANDO", async message => {
      const payload = message.payload as Record<string, unknown>;
      await this.createNotification(
        message.tenantId,
        "Atenção: Token de Conexão Expirando/Expirado",
        `A conta ${payload["shopName"] || message.channel} precisa ser reconectada imediatamente para não interromper as vendas.`,
        "warning",
        "/marketplaces?tab=overview"
      );
    });

    // Alerta de Incidente Crítico
    EventBus.subscribe("INCIDENTE_REGISTRADO", async message => {
      const payload = message.payload as Record<string, unknown>;
      const severity = String(payload["severity"] || "CRITICO");
      await this.createNotification(
        message.tenantId,
        `Alerta Operacional: ${payload["title"] || "Incidente Detectado"}`,
        `Verifique a Central de Incidentes para detalhes e resolução do caso.`,
        severity === "CRITICO" ? "error" : "warning",
        "/marketplaces?tab=incidents"
      );
    });
  }

  /**
   * Cria uma notificação oficial no sistema para o usuário/tenant.
   */
  public async createNotification(
    tenantId: string,
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    link?: string
  ): Promise<void> {
    try {
      await adminDb.collection(this.collectionName).add({
        tenantId,
        title,
        message,
        type,
        link: link || null,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("[NotificationService] Erro ao salvar notificação:", error);
      await logMarketplaceEvent({
        tenantId,
        channel: "mercado_libre",
        severity: "WARNING",
        operation: "create_notification",
        resource: "notification",
        message: `Falha ao criar notificação do sistema: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
}

export const NotificationMarketplace = new NotificationMarketplaceService();
export default NotificationMarketplace;
