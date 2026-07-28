"use server";

import { FinancialMarketplace } from "@/services/marketplaces/FinancialMarketplaceService";
import { Orders } from "@/services/marketplaces/OrderService";
import { ProductSync } from "@/services/marketplaces/ProductSyncService";
import { Pricing } from "@/services/marketplaces/PricingService";
import { AiMarketplace } from "@/services/marketplaces/AiMarketplaceService";
import { Incident } from "@/services/marketplaces/IncidentService";
import { Observability } from "@/services/marketplaces/ObservabilityService";
import { Logs } from "@/services/marketplaces/LogService";
import Queue from "@/services/marketplaces/QueueService";
import { Marketplace } from "@/services/marketplaces/MarketplaceService";
import { MarketplaceChannel } from "@/features/integrations/types/marketplaces";

// TAB 1: Dashboard / Resumo Executivo
export async function getExecutiveReportAction(tenantId: string) {
  try {
    const report = await FinancialMarketplace.getExecutiveReport(tenantId);
    return { success: true, data: report };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 2: Accounts / Conexões
export async function listAccountsAction(tenantId: string) {
  try {
    const data = await Marketplace.listAccounts(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 2: Sincronização - dispara tarefas na fila do SyncService
export async function triggerFullSyncAction(tenantId: string) {
  try {
    const { Sync } = await import("@/services/marketplaces/SyncService");
    const result = await Sync.triggerFullSync(tenantId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function triggerChannelSyncAction(
  tenantId: string,
  channel: MarketplaceChannel,
  syncType: "stock" | "price" | "orders"
) {
  try {
    const { Sync } = await import("@/services/marketplaces/SyncService");
    const accounts = await Marketplace.listAccounts(tenantId);
    const account = accounts.find((a) => a.channel === channel && a.status === "connected");
    if (!account) throw new Error(`Nenhuma conta ${channel} conectada encontrada.`);

    if (syncType === "stock") {
      // Enfileira sync de estoque para todos os produtos do canal
      const { default: Queue } = await import("@/services/marketplaces/QueueService");
      await Queue.enqueue(
        tenantId,
        channel,
        "sync_stock",
        { accountId: account.id, sellerId: account.sellerId, mode: "all" },
        `manual_stock_${channel}_${Date.now()}`
      );
    } else if (syncType === "price") {
      const { default: Queue } = await import("@/services/marketplaces/QueueService");
      await Queue.enqueue(
        tenantId,
        channel,
        "sync_price",
        { accountId: account.id, sellerId: account.sellerId, mode: "all" },
        `manual_price_${channel}_${Date.now()}`
      );
    } else if (syncType === "orders") {
      const { default: Queue } = await import("@/services/marketplaces/QueueService");
      await Queue.enqueue(
        tenantId,
        channel,
        "import_order",
        { accountId: account.id, sellerId: account.sellerId },
        `manual_orders_${channel}_${Date.now()}`
      );
    }

    return { success: true, data: { channel, syncType, enqueuedAt: new Date().toISOString() } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


// TAB 3: Pedidos (OrderService)
export async function listOrdersAction(tenantId: string, options?: any) {
  try {
    const data = await Orders.listOrders(tenantId, options);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrderDetailsAction(tenantId: string, orderId: string) {
  try {
    const data = await Orders.getOrderDetails(tenantId, orderId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 4: Produtos (ProductSyncService)
export async function listItemsAction(tenantId: string, channel?: MarketplaceChannel) {
  try {
    const data = await ProductSync.listItems(tenantId, channel);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 5: Precificação e Simulador (PricingService)
export async function listSimulationsAction(tenantId: string) {
  try {
    const data = await Pricing.listSimulations(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function simulatePricingAction(tenantId: string, sellPrice: number, buyPrice: number, channel: MarketplaceChannel) {
  try {
    const simulation = Pricing.calculate({
      tenantId,
      channel,
      productName: "Produto simulado",
      buyPrice,
      sellPrice,
    });
    return { success: true, data: simulation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function saveSimulationAction(simulationData: any) {
  try {
    const data = await Pricing.saveSimulation(simulationData);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 6: IA (AiMarketplaceService)
export async function getAiExecutiveSummaryAction(tenantId: string) {
  try {
    const data = await AiMarketplace.getExecutiveSummary(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSmartAlertsAction(tenantId: string) {
  try {
    const data = await AiMarketplace.getSmartAlerts(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 7: Observabilidade (ObservabilityService)
export async function getMetricsAction(tenantId: string) {
  try {
    const data = await Observability.getMetrics(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 8: Incidentes (IncidentService)
export async function listIncidentsAction(tenantId: string) {
  try {
    const data = await Incident.listIncidents(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 9: Logs (LogService)
export async function getRecentLogsAction(tenantId: string, limit?: number) {
  try {
    const data = await Logs.getRecentLogs(tenantId, { limitCount: limit });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listAuditIssuesAction(tenantId: string) {
  try {
    const data = await Logs.listAuditIssues(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 10: Fila / Queue (QueueService)
export async function getQueueStatsAction(tenantId: string) {
  try {
    const data = await Queue.getStats(tenantId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// TAB 11: Estoque Unificado / Single Source of Truth (UnifiedStockService & StockConfigService)
export async function getUnifiedStockDataAction(tenantId: string) {
  try {
    const { UnifiedStock } = await import("@/services/marketplaces/UnifiedStockService");
    const [metrics, summaries] = await Promise.all([
      UnifiedStock.getDashboardMetrics(tenantId),
      UnifiedStock.getStockSummaries(tenantId),
    ]);
    return { success: true, data: { metrics, summaries } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adjustStockAction(
  tenantId: string,
  productId: string,
  newStock: number,
  reason: string,
  userId?: string,
  userEmail?: string
) {
  try {
    const { UnifiedStock } = await import("@/services/marketplaces/UnifiedStockService");
    const movement = await UnifiedStock.adjustStock({
      tenantId,
      productId,
      newStock,
      reason,
      userId,
      userEmail,
      origin: "adjustment",
    });
    return { success: true, data: movement };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncProductStockAction(tenantId: string, productId: string) {
  try {
    const { UnifiedStock } = await import("@/services/marketplaces/UnifiedStockService");
    const doc = await (await import("@/lib/firebase/admin")).adminDb
      .collection("products")
      .doc(productId)
      .get();
    
    if (!doc.exists) throw new Error("Produto não encontrado.");
    const prod = doc.data() as any;
    
    const count = await UnifiedStock.triggerSmartSyncForProduct(tenantId, productId, prod.currentStock || 0);
    return { success: true, data: { syncedChannelsCount: count } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductStockHistoryAction(tenantId: string, productId?: string) {
  try {
    const { UnifiedStock } = await import("@/services/marketplaces/UnifiedStockService");
    const movements = await UnifiedStock.getStockMovements(tenantId, productId, 50);
    return { success: true, data: movements };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTenantStockConfigAction(tenantId: string) {
  try {
    const { StockConfig } = await import("@/services/marketplaces/StockConfigService");
    const config = await StockConfig.getConfig(tenantId);
    return { success: true, data: config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantStockConfigAction(tenantId: string, updates: any) {
  try {
    const { StockConfig } = await import("@/services/marketplaces/StockConfigService");
    const config = await StockConfig.updateConfig(tenantId, updates);
    return { success: true, data: config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

