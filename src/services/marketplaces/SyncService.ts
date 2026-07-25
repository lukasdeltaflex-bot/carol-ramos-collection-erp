import { MarketplaceChannel } from "@/features/integrations/types/marketplaces";
import Marketplace from "./MarketplaceService";
import Queue from "./QueueService";
import { logMarketplaceEvent } from "../marketplaceLogService";
import EventBus from "./EventBusService";

export interface SyncResult {
  tenantId: string;
  channel?: MarketplaceChannel;
  enqueuedTasksCount: number;
  timestamp: string;
}

/**
 * Serviço Orquestrador de Sincronização Omnichannel (Enterprise Sync Service).
 * Coordena sincronizações em lote (Estoque, Preços, Pedidos e Produtos) entre
 * o ERP e os marketplaces sem travar a thread principal via filas assíncronas.
 */
class SyncService {
  /**
   * Dispara sincronização geral de todas as contas conectadas de um Tenant.
   */
  public async triggerFullSync(tenantId: string): Promise<SyncResult> {
    const accounts = await Marketplace.listAccounts(tenantId);
    const connectedAccounts = accounts.filter(acc => acc.status === "connected");

    let totalEnqueued = 0;
    const now = new Date().toISOString();

    for (const account of connectedAccounts) {
      if (account.autoSyncStock) {
        await Queue.enqueue(
          tenantId,
          account.channel,
          "sync_stock",
          { accountId: account.id, sellerId: account.sellerId },
          `sync_stock_${account.id}_${Date.now()}`
        );
        totalEnqueued++;
      }

      if (account.autoSyncPrice) {
        await Queue.enqueue(
          tenantId,
          account.channel,
          "sync_price",
          { accountId: account.id, sellerId: account.sellerId },
          `sync_price_${account.id}_${Date.now()}`
        );
        totalEnqueued++;
      }

      if (account.autoSyncOrders) {
        await Queue.enqueue(
          tenantId,
          account.channel,
          "import_order",
          { accountId: account.id, sellerId: account.sellerId },
          `import_orders_${account.id}_${Date.now()}`
        );
        totalEnqueued++;
      }
    }

    await logMarketplaceEvent({
      tenantId,
      channel: "mercado_libre", // Canal de referência para log de hub
      severity: "INFO",
      operation: "full_sync_trigger",
      resource: "sync",
      message: `Sincronização geral disparada para ${connectedAccounts.length} contas conectadas. ${totalEnqueued} tarefas geradas.`
    });

    return {
      tenantId,
      enqueuedTasksCount: totalEnqueued,
      timestamp: now
    };
  }

  /**
   * Dispara sincronização rápida de estoque para um item específico em todos os canais.
   */
  public async syncProductStockAcrossChannels(tenantId: string, productId: string, newStock: number): Promise<void> {
    const accounts = await Marketplace.listAccounts(tenantId);
    const connectedAccounts = accounts.filter(acc => acc.status === "connected" && acc.autoSyncStock);

    for (const account of connectedAccounts) {
      await Queue.enqueue(
        tenantId,
        account.channel,
        "sync_stock",
        { productId, newStock, accountId: account.id },
        `stock_${productId}_${account.channel}_${Date.now()}`,
        "high"
      );
    }

    await EventBus.publish({
      id: `stock_event_${productId}_${Date.now()}`,
      topic: "ESTOQUE_ALTERADO",
      tenantId,
      payload: { productId, newStock, channelsCount: connectedAccounts.length },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Dispara sincronização de preço para um item específico em todos os canais.
   */
  public async syncProductPriceAcrossChannels(tenantId: string, productId: string, newPrice: number): Promise<void> {
    const accounts = await Marketplace.listAccounts(tenantId);
    const connectedAccounts = accounts.filter(acc => acc.status === "connected" && acc.autoSyncPrice);

    for (const account of connectedAccounts) {
      await Queue.enqueue(
        tenantId,
        account.channel,
        "sync_price",
        { productId, newPrice, accountId: account.id },
        `price_${productId}_${account.channel}_${Date.now()}`,
        "high"
      );
    }

    await EventBus.publish({
      id: `price_event_${productId}_${Date.now()}`,
      topic: "PRECO_ALTERADO",
      tenantId,
      payload: { productId, newPrice, channelsCount: connectedAccounts.length },
      timestamp: new Date().toISOString()
    });
  }
}

export const Sync = new SyncService();
export default Sync;
