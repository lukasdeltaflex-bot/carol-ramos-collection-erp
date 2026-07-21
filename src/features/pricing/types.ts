import { BaseDocument } from "@/types/shared";

export interface Marketplace extends BaseDocument {
  name: string;
  percentFee: number; // Percentage fee e.g. 20 for 20%
  fixedFee: number;   // Fixed fee e.g. 4.00 for R$ 4.00
  color?: string;     // Tailwind badge/card color class
  description?: string;
  status: 'active' | 'inactive';
}

export interface PricingExtraExpenses {
  freight: number;
  freightActive: boolean;
  packaging: number;
  packagingActive: boolean;
  commission: number;
  commissionActive: boolean;
  taxesPercent: number;
  taxesActive: boolean;
  marketing: number;
  marketingActive: boolean;
  extra: number;
  extraActive: boolean;
}

export interface ProductPricingData {
  marketplaceId?: string;
  marketplaceName?: string;
  percentFee: number;
  isPercentFeeActive: boolean;
  fixedFee: number;
  isFixedFeeActive: boolean;
  extraExpenses: PricingExtraExpenses;
}

export interface CalculationResult {
  costPrice: number;
  sellPrice: number;
  percentFee: number;
  isPercentFeeActive: boolean;
  fixedFee: number;
  isFixedFeeActive: boolean;
  
  // Breakdown
  percentFeeAmount: number;
  fixedFeeAmount: number;
  totalMarketplaceFees: number;
  
  // Extra Expenses
  freightVal: number;
  packagingVal: number;
  commissionVal: number;
  taxesVal: number;
  marketingVal: number;
  extraVal: number;
  totalExtraExpenses: number;
  
  // Totals
  totalCosts: number;
  netReceivable: number;
  grossProfit: number;
  netProfit: number;
  marginPercent: number;
  markupPercent: number;
  
  // Status indicator
  profitStatus: 'loss' | 'low_margin' | 'healthy_profit';
}

export const DEFAULT_MARKETPLACES: Partial<Marketplace>[] = [
  { name: "Shopee", percentFee: 20, fixedFee: 4.00, color: "bg-orange-500 text-white", description: "Taxas Padrão Shopee Brasil", status: "active" },
  { name: "Mercado Livre", percentFee: 16, fixedFee: 6.50, color: "bg-yellow-400 text-black", description: "Anúncio Clássico / Premium", status: "active" },
  { name: "Amazon", percentFee: 15, fixedFee: 0.00, color: "bg-amber-600 text-white", description: "Comissão padrão por categoria", status: "active" },
  { name: "Magalu", percentFee: 18, fixedFee: 5.00, color: "bg-blue-600 text-white", description: "Magalu Marketplace", status: "active" },
  { name: "Shein", percentFee: 16, fixedFee: 3.00, color: "bg-neutral-900 text-white", description: "Shein Marketplace Brasil", status: "active" },
  { name: "TikTok Shop", percentFee: 12, fixedFee: 2.00, color: "bg-pink-600 text-white", description: "TikTok Shop Brasil", status: "active" },
  { name: "Loja Física", percentFee: 0, fixedFee: 0.00, color: "bg-emerald-600 text-white", description: "Venda direta presencial", status: "active" },
  { name: "Site Próprio", percentFee: 5, fixedFee: 1.50, color: "bg-purple-600 text-white", description: "E-commerce próprio / Gateway", status: "active" }
];
