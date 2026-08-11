import { adminDb } from "@/lib/firebase/admin";
import { MarketplaceChannel, ProfitSimulation } from "@/features/integrations/types/marketplaces";
import Cache from "./CacheService";
import { logMarketplaceEvent } from "../marketplaceLogService";

export interface CalculateSimulationInput {
  tenantId: string;
  channel: MarketplaceChannel;
  productName: string;
  buyPrice: number;
  acquisitionFreightCost?: number;
  acquisitionFreightMode?: 'unit' | 'apportionment' | 'per_unit';
  totalAcquisitionFreightCost?: number;
  totalAcquisitionFreightUnits?: number;
  totalAcquisitionCost?: number;
  sellPrice: number;
  freightCost?: number;
  taxPercentage?: number;
  commissionPercentage?: number;
  commissionFixed?: number;
  packagingCost?: number;
  operationalCost?: number;
  desiredMarginPercentage?: number;
}

/**
 * Serviço de Precificação e Simulação Financeira (Enterprise Pricing & Simulator).
 * Realiza cálculos matemáticos precisos de margem líquida, ROI, ponto de equilíbrio (breakeven)
 * e preço ideal de venda considerando taxas de comissão por canal, impostos e frete.
 */
class PricingService {
  private readonly collectionName = "marketplace_simulations";

  /**
   * Calcula a simulação de lucro em tempo real sem gravar no banco (ou salvando se solicitado).
   */
  public calculate(input: CalculateSimulationInput): ProfitSimulation {
    const rawBuyPrice = input.buyPrice || 0;
    
    // Effective Acquisition Freight & Double Counting Prevention
    const effectiveAcqFreight = input.acquisitionFreightMode === 'apportionment'
      ? (input.totalAcquisitionFreightUnits && input.totalAcquisitionFreightUnits > 0 ? (input.totalAcquisitionFreightCost || 0) / input.totalAcquisitionFreightUnits : 0)
      : (input.acquisitionFreightCost || 0);

    const effectiveBuyPrice = (input.totalAcquisitionCost && input.totalAcquisitionCost > 0)
      ? input.totalAcquisitionCost
      : (rawBuyPrice + effectiveAcqFreight);

    const sellPrice = input.sellPrice || 0;
    const freightCost = input.freightCost || 0; // Frete de Venda / Entrega
    const taxPercentage = input.taxPercentage ?? 8; // Default 8% Simples Nacional
    const commissionPercentage = input.commissionPercentage ?? (input.channel === "mercado_libre" ? 16 : 14);
    const commissionFixed = input.commissionFixed ?? (sellPrice < 79 ? 6 : 0); // Ex: R$ 6 fixos no ML abaixo de 79
    const packagingCost = input.packagingCost || 2.5;
    const operationalCost = input.operationalCost || 1.5;
    const desiredMarginPercentage = input.desiredMarginPercentage || 20;

    // Custos Variáveis (Comissão % + Comissão Fixa + Imposto %)
    const commissionVal = (sellPrice * commissionPercentage) / 100;
    const taxVal = (sellPrice * taxPercentage) / 100;
    const variableCost = commissionVal + commissionFixed + taxVal + freightCost;

    // Custo Total (Baseado no Custo Efetivo de Aquisição)
    const totalCosts = effectiveBuyPrice + variableCost + packagingCost + operationalCost;
    
    // Lucro Líquido
    const netProfit = sellPrice - totalCosts;

    // Margem Real % = (Lucro / Preço de Venda) * 100
    const actualMarginPercentage = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
    
    // ROI % = (Lucro / Custo Efetivo de Aquisição e Operacional) * 100
    const baseInvest = effectiveBuyPrice + packagingCost + operationalCost;
    const roiPercentage = baseInvest > 0 ? (netProfit / baseInvest) * 100 : 0;

    // Preço Mínimo (Breakeven / Zero a Zero): Preço onde Lucro Líquido = 0
    const fixedAndOtherCosts = effectiveBuyPrice + packagingCost + operationalCost + commissionFixed + freightCost;
    const divisorBreakeven = 1 - (commissionPercentage + taxPercentage) / 100;
    const minSellPrice = divisorBreakeven > 0 ? fixedAndOtherCosts / divisorBreakeven : 0;

    // Preço Ideal para atingir Margem Desejada:
    const divisorIdeal = 1 - (commissionPercentage + taxPercentage + desiredMarginPercentage) / 100;
    const idealSellPrice = divisorIdeal > 0 ? fixedAndOtherCosts / divisorIdeal : minSellPrice * 1.25;
    const recommendedSellPrice = Math.ceil(idealSellPrice) - 0.1; // Ex: 149.90

    return {
      tenantId: input.tenantId,
      channel: input.channel,
      productName: input.productName || "Produto Simulação",
      buyPrice: effectiveBuyPrice,
      sellPrice,
      freightCost,
      taxPercentage,
      commissionPercentage,
      commissionFixed,
      packagingCost,
      operationalCost,
      variableCost: Math.round(variableCost * 100) / 100,
      desiredMarginPercentage,
      totalCosts: Math.round(totalCosts * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      actualMarginPercentage: Math.round(actualMarginPercentage * 100) / 100,
      roiPercentage: Math.round(roiPercentage * 100) / 100,
      minSellPrice: Math.round(minSellPrice * 100) / 100,
      idealSellPrice: Math.round(idealSellPrice * 100) / 100,
      recommendedSellPrice: Math.max(0, Math.round(recommendedSellPrice * 100) / 100),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Salva uma simulação oficial de preço no histórico do Tenant.
   */
  public async saveSimulation(simulation: ProfitSimulation): Promise<string> {
    const docRef = await adminDb.collection(this.collectionName).add({
      ...simulation,
      createdAt: simulation.createdAt || new Date().toISOString()
    });

    Cache.invalidateByEntity(simulation.tenantId, "finance");
    return docRef.id;
  }

  /**
   * Lista simulações salvas para o Tenant (com cache de 5 min).
   */
  public async listSimulations(tenantId: string, limitCount = 30): Promise<ProfitSimulation[]> {
    return await Cache.getOrFetch(tenantId, "finance", `sims_${limitCount}`, async () => {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where("tenantId", "==", tenantId)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ProfitSimulation, "id">)
      }));
    });
  }
}

export const Pricing = new PricingService();
export default Pricing;
