import { adminDb } from "@/lib/firebase/admin";
import { MarketplaceChannel, MarketplaceOrder } from "@/features/integrations/types/marketplaces";
import Cache from "./CacheService";

export interface ChannelFinancialSummary {
  channel: MarketplaceChannel;
  grossRevenue: number;
  netRevenueEstimate: number;
  ordersCount: number;
  averageTicket: number;
  estimatedCommissions: number;
  estimatedTaxes: number;
  estimatedFreight: number;
}

export interface ExecutiveFinancialReport {
  tenantId: string;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalOrdersCount: number;
  overallAverageTicket: number;
  byChannel: ChannelFinancialSummary[];
  period: "today" | "month" | "year" | "all";
  generatedAt: string;
}

/**
 * Serviço Financeiro Enterprise de Marketplaces (Ponto Financeiro & Dashboard).
 * Agrega receitas brutas e líquidas, calcula provisões de taxas de comissão,
 * impostos e frete e fornece relatórios consolidados por canal para tomada de decisão.
 */
class FinancialMarketplaceService {
  /**
   * Gera o relatório financeiro executivo do Tenant para um determinado período.
   */
  public async getExecutiveReport(tenantId: string, period: "today" | "month" | "year" | "all" = "month"): Promise<ExecutiveFinancialReport> {
    const cacheKey = `fin_report_${period}`;
    return await Cache.getOrFetch(tenantId, "finance", cacheKey, async () => {
      let query: FirebaseFirestore.Query = adminDb.collection("marketplace_orders").where("tenantId", "==", tenantId);

      const now = new Date();
      if (period === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.where("createdAt", ">=", startOfDay);
      } else if (period === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.where("createdAt", ">=", startOfMonth);
      } else if (period === "year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
        query = query.where("createdAt", ">=", startOfYear);
      }

      const snapshot = await query.get();
      const channelMap = new Map<MarketplaceChannel, { gross: number; count: number }>();

      let totalGross = 0;
      let totalCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data() as MarketplaceOrder;
        const amount = Number(data.totalAmount || 0);
        const ch = data.channel || "mercado_libre";

        totalGross += amount;
        totalCount += 1;

        const current = channelMap.get(ch) || { gross: 0, count: 0 };
        current.gross += amount;
        current.count += 1;
        channelMap.set(ch, current);
      });

      const byChannel: ChannelFinancialSummary[] = [];
      let totalNet = 0;

      channelMap.forEach((stats, ch) => {
        const commRate = ch === "mercado_libre" ? 0.16 : ch === "shopee" ? 0.14 : ch === "amazon" ? 0.15 : 0.12;
        const estimatedCommissions = stats.gross * commRate;
        const estimatedTaxes = stats.gross * 0.08;
        const estimatedFreight = stats.gross * 0.10;
        const netRevenueEstimate = stats.gross - estimatedCommissions - estimatedTaxes - estimatedFreight;

        totalNet += netRevenueEstimate;

        byChannel.push({
          channel: ch,
          grossRevenue: Math.round(stats.gross * 100) / 100,
          netRevenueEstimate: Math.round(netRevenueEstimate * 100) / 100,
          ordersCount: stats.count,
          averageTicket: stats.count > 0 ? Math.round((stats.gross / stats.count) * 100) / 100 : 0,
          estimatedCommissions: Math.round(estimatedCommissions * 100) / 100,
          estimatedTaxes: Math.round(estimatedTaxes * 100) / 100,
          estimatedFreight: Math.round(estimatedFreight * 100) / 100
        });
      });

      return {
        tenantId,
        totalGrossRevenue: Math.round(totalGross * 100) / 100,
        totalNetRevenue: Math.round(totalNet * 100) / 100,
        totalOrdersCount: totalCount,
        overallAverageTicket: totalCount > 0 ? Math.round((totalGross / totalCount) * 100) / 100 : 0,
        byChannel: byChannel.sort((a, b) => b.grossRevenue - a.grossRevenue),
        period,
        generatedAt: new Date().toISOString()
      };
    });
  }
}

export const FinancialMarketplace = new FinancialMarketplaceService();
export default FinancialMarketplace;
