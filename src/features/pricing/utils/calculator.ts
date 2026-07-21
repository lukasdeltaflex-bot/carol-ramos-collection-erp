import { CalculationResult, PricingExtraExpenses } from "../types";

export const DEFAULT_EXTRA_EXPENSES: PricingExtraExpenses = {
  freight: 0,
  freightActive: false,
  packaging: 0,
  packagingActive: false,
  commission: 0,
  commissionActive: false,
  taxesPercent: 0,
  taxesActive: false,
  marketing: 0,
  marketingActive: false,
  extra: 0,
  extraActive: false,
};

export function calculatePricing(
  costPrice: number,
  sellPrice: number,
  percentFee: number,
  isPercentFeeActive: boolean,
  fixedFee: number,
  isFixedFeeActive: boolean,
  extraExpenses: PricingExtraExpenses = DEFAULT_EXTRA_EXPENSES
): CalculationResult {
  const safeCost = Math.max(0, costPrice || 0);
  const safeSell = Math.max(0, sellPrice || 0);

  const activePercentFee = isPercentFeeActive ? Math.max(0, percentFee || 0) : 0;
  const activeFixedFee = isFixedFeeActive ? Math.max(0, fixedFee || 0) : 0;

  const percentFeeAmount = safeSell * (activePercentFee / 100);
  const fixedFeeAmount = activeFixedFee;
  const totalMarketplaceFees = percentFeeAmount + fixedFeeAmount;

  const freightVal = extraExpenses.freightActive ? Math.max(0, extraExpenses.freight || 0) : 0;
  const packagingVal = extraExpenses.packagingActive ? Math.max(0, extraExpenses.packaging || 0) : 0;
  const commissionVal = extraExpenses.commissionActive ? Math.max(0, extraExpenses.commission || 0) : 0;
  const taxesVal = extraExpenses.taxesActive ? safeSell * (Math.max(0, extraExpenses.taxesPercent || 0) / 100) : 0;
  const marketingVal = extraExpenses.marketingActive ? Math.max(0, extraExpenses.marketing || 0) : 0;
  const extraVal = extraExpenses.extraActive ? Math.max(0, extraExpenses.extra || 0) : 0;

  const totalExtraExpenses = freightVal + packagingVal + commissionVal + taxesVal + marketingVal + extraVal;
  const totalCosts = safeCost + totalMarketplaceFees + totalExtraExpenses;

  const netReceivable = safeSell - totalMarketplaceFees;
  const grossProfit = safeSell - safeCost;
  const netProfit = safeSell - totalCosts;

  const marginPercent = safeSell > 0 ? (netProfit / safeSell) * 100 : 0;
  const markupPercent = safeCost > 0 ? (netProfit / safeCost) * 100 : 0;

  let profitStatus: 'loss' | 'low_margin' | 'healthy_profit' = 'healthy_profit';
  if (netProfit < 0) {
    profitStatus = 'loss';
  } else if (marginPercent < 20) {
    profitStatus = 'low_margin';
  }

  return {
    costPrice: safeCost,
    sellPrice: safeSell,
    percentFee: activePercentFee,
    isPercentFeeActive,
    fixedFee: activeFixedFee,
    isFixedFeeActive,
    percentFeeAmount,
    fixedFeeAmount,
    totalMarketplaceFees,
    freightVal,
    packagingVal,
    commissionVal,
    taxesVal,
    marketingVal,
    extraVal,
    totalExtraExpenses,
    totalCosts,
    netReceivable,
    grossProfit,
    netProfit,
    marginPercent,
    markupPercent,
    profitStatus,
  };
}

export function calculateIdealPrice(
  costPrice: number,
  targetMarginPercent: number,
  percentFee: number,
  isPercentFeeActive: boolean,
  fixedFee: number,
  isFixedFeeActive: boolean,
  extraExpenses: PricingExtraExpenses = DEFAULT_EXTRA_EXPENSES
): number {
  const safeCost = Math.max(0, costPrice || 0);
  const activePercentFee = isPercentFeeActive ? Math.max(0, percentFee || 0) : 0;
  const activeFixedFee = isFixedFeeActive ? Math.max(0, fixedFee || 0) : 0;

  const freightVal = extraExpenses.freightActive ? Math.max(0, extraExpenses.freight || 0) : 0;
  const packagingVal = extraExpenses.packagingActive ? Math.max(0, extraExpenses.packaging || 0) : 0;
  const commissionVal = extraExpenses.commissionActive ? Math.max(0, extraExpenses.commission || 0) : 0;
  const taxesPercentVal = extraExpenses.taxesActive ? Math.max(0, extraExpenses.taxesPercent || 0) : 0;
  const marketingVal = extraExpenses.marketingActive ? Math.max(0, extraExpenses.marketing || 0) : 0;
  const extraVal = extraExpenses.extraActive ? Math.max(0, extraExpenses.extra || 0) : 0;

  const fixedCostsTotal = safeCost + activeFixedFee + freightVal + packagingVal + commissionVal + marketingVal + extraVal;
  const totalVariableRatePercent = activePercentFee + taxesPercentVal + targetMarginPercent;

  if (totalVariableRatePercent >= 100) {
    return 0; // Impossible margin with given rates
  }

  const idealPrice = fixedCostsTotal / (1 - totalVariableRatePercent / 100);
  return Math.max(0, idealPrice);
}
