import { EventBusMessage, MarketplaceEventTopic } from "@/features/integrations/types/marketplaces";

type EventCallback = (message: EventBusMessage) => void | Promise<void>;

/**
 * Barramento de Eventos Enterprise (Event Driven Architecture - Ponto Event Bus).
 * Elimina dependências diretas entre serviços. Permite disparar eventos assíncronos
 * em cascata: PedidoRecebido -> Financeiro -> Estoque -> Dashboard -> Notificações -> IA -> Auditoria -> Logs.
 */
class EventBusService {
  private readonly listeners: Map<MarketplaceEventTopic, EventCallback[]> = new Map();
  private readonly allTopicListeners: EventCallback[] = [];

  /**
   * Inscreve um serviço para escutar um tópico específico de evento do Marketplace.
   */
  public subscribe(topic: MarketplaceEventTopic, callback: EventCallback): () => void {
    const currentListeners = this.listeners.get(topic) || [];
    currentListeners.push(callback);
    this.listeners.set(topic, currentListeners);

    // Retorna função de unsubscribe
    return () => {
      const updated = (this.listeners.get(topic) || []).filter(cb => cb !== callback);
      this.listeners.set(topic, updated);
    };
  }

  /**
   * Inscreve um serviço para escutar ABSOLUTAMENTE TODOS os eventos disparados (ex: LogService ou Auditoria).
   */
  public subscribeAll(callback: EventCallback): () => void {
    this.allTopicListeners.push(callback);
    return () => {
      const idx = this.allTopicListeners.indexOf(callback);
      if (idx !== -1) {
        this.allTopicListeners.splice(idx, 1);
      }
    };
  }

  /**
   * Publica um evento no barramento acionando todos os ouvintes inscritos
   * de forma assíncrona, isolada e segura por erro.
   */
  public async publish<T = Record<string, unknown>>(message: EventBusMessage<T>): Promise<void> {
    const topicListeners = this.listeners.get(message.topic) || [];
    const targetListeners = [...topicListeners, ...this.allTopicListeners];

    if (targetListeners.length === 0) {
      return;
    }

    // Executa listeners em paralelo com tratamento individual de erros para não quebrar a cadeia
    await Promise.allSettled(
      targetListeners.map(async listener => {
        try {
          await listener(message as EventBusMessage<Record<string, unknown>>);
        } catch (error: unknown) {
          console.error(`[EventBus] Erro ao processar listener no tópico [${message.topic}] para tenant [${message.tenantId}]:`, error);
        }
      })
    );
  }
}

export const EventBus = new EventBusService();
export default EventBus;
