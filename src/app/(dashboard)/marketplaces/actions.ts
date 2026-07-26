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
