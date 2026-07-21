import { BaseDocument } from "@/types/shared";

export interface BiKpiMetrics {
  totalRevenue: number;
  revenueGrowthPercent: number;
  netProfit: number;
  netProfitGrowthPercent: number;
  grossProfit: number;
  totalCosts: number;
  stockValue: number;
  averageTicket: number;
  averageMarginPercent: number;
  averageMarkupPercent: number;
  roiPercent: number;
  stockTurnoverDays: number;
}

export interface BiGoalItem extends Partial<BaseDocument> {
  tenantId: string;
  title: string;
  category: "revenue" | "profit" | "sales_count" | "customers";
  targetValue: number;
  currentValue: number;
  period: string; // e.g. "2026-07"
  status: "on_track" | "warning" | "achieved";
}

export interface BiAlertItem {
  id: string;
  type: "low_margin" | "stagnant_product" | "critical_stock" | "overdue_bill" | "target_risk";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  value?: string;
  actionUrl?: string;
}

export interface BiForecast {
  expectedRevenueNextMonth: number;
  expectedProfitNextMonth: number;
  expectedSalesCountNextMonth: number;
  recommendedStockRestockCount: number;
  confidenceScorePercent: number;
}
