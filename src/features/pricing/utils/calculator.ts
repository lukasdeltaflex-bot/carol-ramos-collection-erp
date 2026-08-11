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

/**
 * Monetary rounding helper to prevent floating point imprecision.
 */
export const roundMoney = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Calculates effective unit acquisition freight based on ERP rules:
 * - Apportionment (Rateio): totalFreightCost / totalFreightUnits
 * - Unit: freightCost
 */
export function calculateEffectiveAcquisitionFreight(params: {
  freightCost?: number;
  freightMode?: 'unit' | 'apportionment' | 'per_unit';
  totalFreightCost?: number;
  totalFreightUnits?: number;
}): number {
  const mode = params.freightMode || 'unit';
  if (mode === 'apportionment') {
    const units = params.totalFreightUnits || 0;
    const totalCost = params.totalFreightCost || 0;
    return units > 0 ? roundMoney(totalCost / units) : 0;
  }
  return Math.max(0, params.freightCost || 0);
}

/**
 * Calculates effective acquisition cost of a product preventing double counting:
 * If totalAcquisitionCost is already present and > 0, it is used as source of truth.
 * Otherwise, effectiveAcquisitionCost = baseCost + effectiveFreight.
 */
export function calculateEffectiveAcquisitionCost(params: {
  baseCost: number;
  freightCost?: number;
  freightMode?: 'unit' | 'apportionment' | 'per_unit';
  totalFreightCost?: number;
  totalFreightUnits?: number;
  totalAcquisitionCost?: number;
}): {
  effectiveAcquisitionCost: number;
  effectiveFreight: number;
  isAlreadyConsolidated: boolean;
} {
  const safeBase = Math.max(0, params.baseCost || 0);
  const effectiveFreight = calculateEffectiveAcquisitionFreight(params);

  // Double-charging prevention:
  // If totalAcquisitionCost is explicitly stored on the product (and > 0), use it as the source of truth
  if (params.totalAcquisitionCost && params.totalAcquisitionCost > 0) {
    return {
      effectiveAcquisitionCost: roundMoney(params.totalAcquisitionCost),
      effectiveFreight,
      isAlreadyConsolidated: true,
    };
  }

  const effectiveAcquisitionCost = roundMoney(safeBase + effectiveFreight);
  return {
    effectiveAcquisitionCost,
    effectiveFreight,
    isAlreadyConsolidated: false,
  };
}

export function calculatePricing(
  costPrice: number,
  sellPrice: number,
  percentFee: number,
  isPercentFeeActive: boolean,
  fixedFee: number,
  isFixedFeeActive: boolean,
  extraExpenses: PricingExtraExpenses = DEFAULT_EXTRA_EXPENSES
): CalculationResult {
  const safeCost = roundMoney(Math.max(0, costPrice || 0));
  const safeSell = roundMoney(Math.max(0, sellPrice || 0));

  const activePercentFee = isPercentFeeActive ? Math.max(0, percentFee || 0) : 0;
  const activeFixedFee = isFixedFeeActive ? Math.max(0, fixedFee || 0) : 0;

  const percentFeeAmount = roundMoney(safeSell * (activePercentFee / 100));
  const fixedFeeAmount = roundMoney(activeFixedFee);
  const totalMarketplaceFees = roundMoney(percentFeeAmount + fixedFeeAmount);

  // Sales / Delivery Freight to Customer (Frete de Venda)
  const freightVal = extraExpenses.freightActive ? roundMoney(Math.max(0, extraExpenses.freight || 0)) : 0;
  const packagingVal = extraExpenses.packagingActive ? roundMoney(Math.max(0, extraExpenses.packaging || 0)) : 0;
  const commissionVal = extraExpenses.commissionActive ? roundMoney(Math.max(0, extraExpenses.commission || 0)) : 0;
  const taxesVal = extraExpenses.taxesActive ? roundMoney(safeSell * (Math.max(0, extraExpenses.taxesPercent || 0) / 100)) : 0;
  const marketingVal = extraExpenses.marketingActive ? roundMoney(Math.max(0, extraExpenses.marketing || 0)) : 0;
  const extraVal = extraExpenses.extraActive ? roundMoney(Math.max(0, extraExpenses.extra || 0)) : 0;

  const totalExtraExpenses = roundMoney(freightVal + packagingVal + commissionVal + taxesVal + marketingVal + extraVal);
  const totalCosts = roundMoney(safeCost + totalMarketplaceFees + totalExtraExpenses);

  const netReceivable = roundMoney(safeSell - totalMarketplaceFees);
  const grossProfit = roundMoney(safeSell - safeCost);
  const netProfit = roundMoney(safeSell - totalCosts);

  const marginPercent = safeSell > 0 ? roundMoney((netProfit / safeSell) * 100) : 0;
  const markupPercent = safeCost > 0 ? roundMoney((netProfit / safeCost) * 100) : 0;

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
  const safeCost = roundMoney(Math.max(0, costPrice || 0));
  const activePercentFee = isPercentFeeActive ? Math.max(0, percentFee || 0) : 0;
  const activeFixedFee = isFixedFeeActive ? Math.max(0, fixedFee || 0) : 0;

  const freightVal = extraExpenses.freightActive ? roundMoney(Math.max(0, extraExpenses.freight || 0)) : 0;
  const packagingVal = extraExpenses.packagingActive ? roundMoney(Math.max(0, extraExpenses.packaging || 0)) : 0;
  const commissionVal = extraExpenses.commissionActive ? roundMoney(Math.max(0, extraExpenses.commission || 0)) : 0;
  const taxesPercentVal = extraExpenses.taxesActive ? Math.max(0, extraExpenses.taxesPercent || 0) : 0;
  const marketingVal = extraExpenses.marketingActive ? roundMoney(Math.max(0, extraExpenses.marketing || 0)) : 0;
  const extraVal = extraExpenses.extraActive ? roundMoney(Math.max(0, extraExpenses.extra || 0)) : 0;

  const fixedCostsTotal = safeCost + activeFixedFee + freightVal + packagingVal + commissionVal + marketingVal + extraVal;
  const totalVariableRatePercent = activePercentFee + taxesPercentVal + targetMarginPercent;

  if (totalVariableRatePercent >= 100) {
    return 0; // Impossible margin with given rates
  }

  const idealPrice = fixedCostsTotal / (1 - totalVariableRatePercent / 100);
  return Math.max(0, roundMoney(idealPrice));
}

