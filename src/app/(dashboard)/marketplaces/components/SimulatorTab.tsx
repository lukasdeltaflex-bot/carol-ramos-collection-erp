"use client";

import React, { useState, useMemo, useCallback, useId } from "react";
import {
  calculatePricing,
  calculateIdealPrice,
  DEFAULT_EXTRA_EXPENSES,
} from "@/features/pricing/utils/calculator";
import { PricingExtraExpenses } from "@/features/pricing/types";
import { saveSimulationAction, listSimulationsAction } from "../actions";
import { MarketplaceChannel } from "@/features/integrations/types/marketplaces";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Save,
  Trash2,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Percent,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

// ----- Tipos locais -----
interface CustomCost {
  id: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
}

interface SimulatorForm {
  productName: string;
  channel: MarketplaceChannel;
  // Preços Base & Frete de Aquisição
  sellPrice: number;
  buyPrice: number;
  acqFreight: number;
  acqFreightActive: boolean;
  acqFreightMode: 'unit' | 'apportionment';
  totalAcqFreight: number;
  totalAcqUnits: number;
  // Taxas Marketplace
  commissionPercent: number;
  commissionPercentActive: boolean;
  commissionFixed: number;
  commissionFixedActive: boolean;
  // Custos Adicionais Padrão (Frete de Venda)
  taxPercent: number;
  taxPercentActive: boolean;
  freight: number;
  freightActive: boolean;
  packaging: number;
  packagingActive: boolean;
  operational: number;
  operationalActive: boolean;
  marketing: number;
  marketingActive: boolean;
  otherCosts: number;
  otherCostsActive: boolean;
  // Margem Desejada
  desiredMargin: number;
}

// ----- Componente Toggle -----
const Toggle = ({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    title={active ? "Desativar" : "Ativar"}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30",
      active ? "bg-primary" : "bg-muted-foreground/30"
    )}
  >
    <span
      className={cn(
        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200",
        active ? "translate-x-5" : "translate-x-0"
      )}
    />
  </button>
);

// ----- Componente Linha de Custo Padrão -----
const CostRow = ({
  label,
  hint,
  active,
  onToggle,
  children,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
      active
        ? "border-primary/30 bg-primary/5"
        : "border-border bg-muted/20 opacity-60"
    )}
  >
    <div className="flex items-center gap-3 flex-1">
      <Toggle active={active} onToggle={onToggle} />
      <div>
        <span
          className="text-xs font-bold text-foreground cursor-pointer"
          onClick={onToggle}
        >
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted-foreground block">{hint}</span>
        )}
      </div>
    </div>
    <div className="w-full sm:w-36 shrink-0">{children}</div>
  </div>
);

// ----- Input numérico genérico -----
const NumberInput = ({
  value,
  onChange,
  disabled,
  suffix,
  step = "0.01",
  placeholder = "0,00",
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  suffix?: string;
  step?: string;
  placeholder?: string;
}) => (
  <div className="relative">
    <input
      type="number"
      step={step}
      min={0}
      value={value || ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-xs font-bold font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
    />
    {suffix && (
      <span className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">
        {suffix}
      </span>
    )}
  </div>
);

// ----- Componente Principal -----
export default function SimulatorTab({ tenantId }: { tenantId: string }) {
  const { success, error: toastError } = useToast();
  const uid = useId();

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [savingHistory, setSavingHistory] = useState(false);
  const [showCustomCosts, setShowCustomCosts] = useState(true);

  // Custos dinâmicos adicionais
  const [customCosts, setCustomCosts] = useState<CustomCost[]>([]);

  // Formulário principal
  const [form, setForm] = useState<SimulatorForm>({
    productName: "",
    channel: "shopee",
    sellPrice: 0,
    buyPrice: 0,
    acqFreight: 0,
    acqFreightActive: false,
    acqFreightMode: "unit",
    totalAcqFreight: 0,
    totalAcqUnits: 1,
    commissionPercent: 14,
    commissionPercentActive: true,
    commissionFixed: 0,
    commissionFixedActive: false,
    taxPercent: 0,
    taxPercentActive: false,
    freight: 0,
    freightActive: false,
    packaging: 0,
    packagingActive: false,
    operational: 0,
    operationalActive: false,
    marketing: 0,
    marketingActive: false,
    otherCosts: 0,
    otherCostsActive: false,
    desiredMargin: 30,
  });

  const set = useCallback(<K extends keyof SimulatorForm>(key: K, value: SimulatorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Compute effective acquisition freight and effective buy price
  const effectiveAcqFreight = useMemo(() => {
    if (!form.acqFreightActive) return 0;
    if (form.acqFreightMode === "apportionment") {
      return form.totalAcqUnits > 0 ? form.totalAcqFreight / form.totalAcqUnits : 0;
    }
    return form.acqFreight || 0;
  }, [form.acqFreightActive, form.acqFreightMode, form.totalAcqFreight, form.totalAcqUnits, form.acqFreight]);

  const effectiveBuyPrice = useMemo(() => {
    return Math.round(((form.buyPrice || 0) + effectiveAcqFreight + Number.EPSILON) * 100) / 100;
  }, [form.buyPrice, effectiveAcqFreight]);

  // Canal padrão de comissão
  const CHANNEL_DEFAULTS: Record<MarketplaceChannel, { commission: number; fixed: number }> = {
    shopee: { commission: 14, fixed: 0 },
    mercado_libre: { commission: 16, fixed: 6 },
    amazon: { commission: 15, fixed: 0 },
    tiktok_shop: { commission: 12, fixed: 0 },
    magalu: { commission: 18, fixed: 0 },
    americanas: { commission: 19, fixed: 0 },
    via_varejo: { commission: 18, fixed: 0 },
    madeiramadeira: { commission: 17, fixed: 0 },
    shein: { commission: 10, fixed: 0 },
    nuvemshop: { commission: 0, fixed: 0 },
    shopify: { commission: 0, fixed: 0 },
    woocommerce: { commission: 0, fixed: 0 },
    tray: { commission: 0, fixed: 0 },
  };

  const handleChannelChange = (ch: MarketplaceChannel) => {
    const defaults = CHANNEL_DEFAULTS[ch];
    setForm((prev) => ({
      ...prev,
      channel: ch,
      commissionPercent: defaults.commission,
      commissionFixed: defaults.fixed,
      commissionFixedActive: defaults.fixed > 0,
    }));
  };

  // Monta extraExpenses compatível com o calculator.ts
  const extraExpenses: PricingExtraExpenses = useMemo(() => {
    // Soma todos os custos customizados fixos ativos
    const customFixed = customCosts
      .filter((c) => c.active && c.type === "fixed")
      .reduce((a, c) => a + c.value, 0);

    return {
      freight: form.freightActive ? form.freight : 0,
      freightActive: form.freightActive,
      packaging: form.packagingActive ? form.packaging : 0,
      packagingActive: form.packagingActive,
      commission: form.operationalActive ? form.operational : 0,
      commissionActive: form.operationalActive,
      taxesPercent: form.taxPercentActive ? form.taxPercent : 0,
      taxesActive: form.taxPercentActive,
      marketing: form.marketingActive ? form.marketing : 0,
      marketingActive: form.marketingActive,
      extra: (form.otherCostsActive ? form.otherCosts : 0) + customFixed,
      extraActive: form.otherCostsActive || customFixed > 0,
    };
  }, [form, customCosts]);

  // Taxas do marketplace para o calculator
  const percentFee = form.commissionPercentActive ? form.commissionPercent : 0;
  const fixedFee = form.commissionFixedActive ? form.commissionFixed : 0;

  // Cálculo em tempo real utilizando o Custo Efetivo de Aquisição (Custo Base + Frete de Compra)
  const calc = useMemo(
    () =>
      calculatePricing(
        effectiveBuyPrice,
        form.sellPrice,
        percentFee,
        form.commissionPercentActive,
        fixedFee,
        form.commissionFixedActive,
        extraExpenses
      ),
    [effectiveBuyPrice, form.sellPrice, percentFee, form.commissionPercentActive, fixedFee, form.commissionFixedActive, extraExpenses]
  );

  // Preço ideal baseado na margem desejada
  const idealPrice = useMemo(
    () =>
      calculateIdealPrice(
        effectiveBuyPrice,
        form.desiredMargin,
        percentFee,
        form.commissionPercentActive,
        fixedFee,
        form.commissionFixedActive,
        extraExpenses
      ),
    [effectiveBuyPrice, form.desiredMargin, percentFee, form.commissionPercentActive, fixedFee, form.commissionFixedActive, extraExpenses]
  );

  // Preço mínimo (breakeven)
  const breakeven = useMemo(
    () =>
      calculateIdealPrice(
        effectiveBuyPrice,
        0,
        percentFee,
        form.commissionPercentActive,
        fixedFee,
        form.commissionFixedActive,
        extraExpenses
      ),
    [effectiveBuyPrice, percentFee, form.commissionPercentActive, fixedFee, form.commissionFixedActive, extraExpenses]
  );

  // Preço sugerido (arredonda para .90)
  const suggestedPrice = useMemo(() => {
    if (idealPrice <= 0) return 0;
    return Math.ceil(idealPrice) - 0.1;
  }, [idealPrice]);

  // ROI
  const roi = useMemo(() => {
    const invest = effectiveBuyPrice + (form.packagingActive ? form.packaging : 0) + (form.operationalActive ? form.operational : 0);
    return invest > 0 ? (calc.netProfit / invest) * 100 : 0;
  }, [calc.netProfit, effectiveBuyPrice, form]);

  // ----- Custos Customizados -----
  const addCustomCost = () => {
    setCustomCosts((prev) => [
      ...prev,
      { id: `${uid}_${Date.now()}`, name: "", type: "fixed", value: 0, active: true },
    ]);
  };

  const updateCustomCost = (id: string, patch: Partial<CustomCost>) => {
    setCustomCosts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCustomCost = (id: string) => {
    setCustomCosts((prev) => prev.filter((c) => c.id !== id));
  };

  // Valor extra calculado dos custos customizados percentuais
  const customPercentTotal = useMemo(() => {
    return customCosts
      .filter((c) => c.active && c.type === "percent")
      .reduce((a, c) => a + form.sellPrice * (c.value / 100), 0);
  }, [customCosts, form.sellPrice]);

  // Lucro líquido real (inclui percentuais customizados)
  const netProfitReal = calc.netProfit - customPercentTotal;
  const marginReal = form.sellPrice > 0 ? (netProfitReal / form.sellPrice) * 100 : 0;

  // ----- Save to History -----
  const handleSave = async () => {
    setSavingHistory(true);
    try {
      const simulation = {
        tenantId,
        channel: form.channel,
        productName: form.productName || "Simulação sem nome",
        buyPrice: form.buyPrice,
        sellPrice: form.sellPrice,
        freightCost: form.freightActive ? form.freight : 0,
        taxPercentage: form.taxPercentActive ? form.taxPercent : 0,
        commissionPercentage: percentFee,
        commissionFixed: fixedFee,
        packagingCost: form.packagingActive ? form.packaging : 0,
        operationalCost: form.operationalActive ? form.operational : 0,
        variableCost: calc.totalMarketplaceFees,
        desiredMarginPercentage: form.desiredMargin,
        totalCosts: calc.totalCosts + customPercentTotal,
        netProfit: netProfitReal,
        actualMarginPercentage: marginReal,
        roiPercentage: roi,
        minSellPrice: breakeven,
        idealSellPrice: idealPrice,
        recommendedSellPrice: suggestedPrice,
        createdAt: new Date().toISOString(),
      };
      const res = await saveSimulationAction(simulation as any);
      if (res.success) {
        success("Simulação Salva!", "Histórico atualizado com sucesso.");
      } else {
        toastError("Erro ao salvar", res.error || "");
      }
    } catch (e: any) {
      toastError("Erro crítico", e.message);
    } finally {
      setSavingHistory(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await listSimulationsAction(tenantId);
      if (res.success) setHistory(res.data || []);
    } catch (e) {}
  };

  const handleToggleHistory = () => {
    if (!showHistory) loadHistory();
    setShowHistory((v) => !v);
  };

  // Preço rápidos de margem
  const MARGIN_PRESETS = [20, 30, 40, 50];

  const profitStatus =
    netProfitReal < 0 ? "loss" : marginReal < 20 ? "low_margin" : "healthy_profit";

  // ----- Render -----
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              Simulador de Lucratividade
              <span className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary font-bold rounded-md border border-primary/20">
                ENTERPRISE
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Cálculo em tempo real • Compatível com todos os Marketplaces
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggleHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Histórico
          </button>
          <button
            onClick={handleSave}
            disabled={savingHistory || form.sellPrice <= 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {savingHistory ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Salvar
          </button>
        </div>
      </div>

      {/* Layout Principal: 2 colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ===== COLUNA ESQUERDA: Entradas ===== */}
        <div className="xl:col-span-7 space-y-5">
          {/* Card 1: Produto & Canal */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Produto & Canal de Venda
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(e) => set("productName", e.target.value)}
                  placeholder="Ex: Vestido Floral P..."
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Marketplace / Canal
                </label>
                <select
                  value={form.channel}
                  onChange={(e) => handleChannelChange(e.target.value as MarketplaceChannel)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="shopee">Shopee (14%)</option>
                  <option value="mercado_libre">Mercado Livre (16% + R$6)</option>
                  <option value="amazon">Amazon (15%)</option>
                  <option value="tiktok_shop">TikTok Shop (12%)</option>
                  <option value="magalu">Magalu (18%)</option>
                  <option value="americanas">Americanas (19%)</option>
                  <option value="via_varejo">Via Varejo (18%)</option>
                  <option value="madeiramadeira">MadeiraMadeira (17%)</option>
                  <option value="shein">Shein (10%)</option>
                  <option value="nuvemshop">Nuvemshop (personalizado)</option>
                  <option value="shopify">Shopify (personalizado)</option>
                  <option value="woocommerce">WooCommerce (personalizado)</option>
                  <option value="tray">Tray (personalizado)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Custo Base do Produto (R$)
                </label>
                <NumberInput
                  value={form.buyPrice}
                  onChange={(v) => set("buyPrice", v)}
                  suffix="R$"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1.5 font-bold">
                  ★ Preço de Venda (R$)
                </label>
                <NumberInput
                  value={form.sellPrice}
                  onChange={(v) => set("sellPrice", v)}
                  suffix="R$"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Frete de Aquisição no Custo do Produto */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Toggle
                    active={form.acqFreightActive}
                    onToggle={() => set("acqFreightActive", !form.acqFreightActive)}
                  />
                  <span
                    className="text-xs font-bold text-foreground cursor-pointer"
                    onClick={() => set("acqFreightActive", !form.acqFreightActive)}
                  >
                    🚚 Frete de Aquisição (Compra)
                  </span>
                </div>

                {form.acqFreightActive && (
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background border border-border text-[10px]">
                    <button
                      type="button"
                      onClick={() => set("acqFreightMode", "unit")}
                      className={cn(
                        "px-2 py-0.5 rounded font-semibold transition-all",
                        form.acqFreightMode === "unit" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      )}
                    >
                      Unitário
                    </button>
                    <button
                      type="button"
                      onClick={() => set("acqFreightMode", "apportionment")}
                      className={cn(
                        "px-2 py-0.5 rounded font-semibold transition-all",
                        form.acqFreightMode === "apportionment" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      )}
                    >
                      Rateio por Compra
                    </button>
                  </div>
                )}
              </div>

              {form.acqFreightActive && (
                <div className="pt-1">
                  {form.acqFreightMode === "unit" ? (
                    <NumberInput
                      value={form.acqFreight}
                      onChange={(v) => set("acqFreight", v)}
                      suffix="R$"
                      placeholder="0,00"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Frete Total Compra (R$)</label>
                        <NumberInput
                          value={form.totalAcqFreight}
                          onChange={(v) => set("totalAcqFreight", v)}
                          suffix="R$"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Unidades no Lote</label>
                        <NumberInput
                          value={form.totalAcqUnits}
                          onChange={(v) => set("totalAcqUnits", v)}
                          placeholder="1"
                          step="1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-[11px] font-mono text-muted-foreground flex justify-between border-t border-blue-500/20 pt-1.5">
                    <span>Custo Efetivo de Aquisição:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(form.buyPrice)} + {formatCurrency(effectiveAcqFreight)} ={" "}
                      <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(effectiveBuyPrice)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Taxas do Marketplace */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
              <Percent className="w-4 h-4 text-orange-500" />
              Taxas do Marketplace
            </h3>
            <div className="space-y-3">
              <CostRow
                label="Comissão Percentual (%)"
                hint={form.commissionPercentActive ? `Desconta ${form.commissionPercent}% sobre o preço de venda` : "Comissão % desativada"}
                active={form.commissionPercentActive}
                onToggle={() => set("commissionPercentActive", !form.commissionPercentActive)}
              >
                <NumberInput
                  value={form.commissionPercent}
                  onChange={(v) => set("commissionPercent", v)}
                  disabled={!form.commissionPercentActive}
                  suffix="%"
                  step="0.1"
                />
              </CostRow>

              <CostRow
                label="Taxa Fixa por Pedido (R$)"
                hint={form.commissionFixedActive ? `Desconta ${formatCurrency(form.commissionFixed)} por pedido` : "Taxa fixa desativada"}
                active={form.commissionFixedActive}
                onToggle={() => set("commissionFixedActive", !form.commissionFixedActive)}
              >
                <NumberInput
                  value={form.commissionFixed}
                  onChange={(v) => set("commissionFixed", v)}
                  disabled={!form.commissionFixedActive}
                  suffix="R$"
                />
              </CostRow>
            </div>
          </div>

          {/* Card 3: Custos Adicionais Padrão */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Custos Adicionais
            </h3>
            <div className="space-y-3">
              <CostRow
                label="Impostos / Simples Nacional (%)"
                hint={form.taxPercentActive ? `Desconta ${form.taxPercent}% sobre o preço de venda` : "Impostos desativados"}
                active={form.taxPercentActive}
                onToggle={() => set("taxPercentActive", !form.taxPercentActive)}
              >
                <NumberInput
                  value={form.taxPercent}
                  onChange={(v) => set("taxPercent", v)}
                  disabled={!form.taxPercentActive}
                  suffix="%"
                  step="0.1"
                />
              </CostRow>

              <CostRow
                label="Frete pago pelo Vendedor (R$)"
                hint={form.freightActive ? `${formatCurrency(form.freight)} por envio` : "Frete desativado"}
                active={form.freightActive}
                onToggle={() => set("freightActive", !form.freightActive)}
              >
                <NumberInput
                  value={form.freight}
                  onChange={(v) => set("freight", v)}
                  disabled={!form.freightActive}
                  suffix="R$"
                />
              </CostRow>

              <CostRow
                label="Embalagem & Insumos (R$)"
                hint={form.packagingActive ? `${formatCurrency(form.packaging)} por unidade` : "Embalagem desativada"}
                active={form.packagingActive}
                onToggle={() => set("packagingActive", !form.packagingActive)}
              >
                <NumberInput
                  value={form.packaging}
                  onChange={(v) => set("packaging", v)}
                  disabled={!form.packagingActive}
                  suffix="R$"
                />
              </CostRow>

              <CostRow
                label="Custo Operacional (R$)"
                hint={form.operationalActive ? `${formatCurrency(form.operational)} por unidade` : "Custo operacional desativado"}
                active={form.operationalActive}
                onToggle={() => set("operationalActive", !form.operationalActive)}
              >
                <NumberInput
                  value={form.operational}
                  onChange={(v) => set("operational", v)}
                  disabled={!form.operationalActive}
                  suffix="R$"
                />
              </CostRow>

              <CostRow
                label="Marketing / Anúncios (R$)"
                hint={form.marketingActive ? `${formatCurrency(form.marketing)} por unidade vendida` : "Marketing desativado"}
                active={form.marketingActive}
                onToggle={() => set("marketingActive", !form.marketingActive)}
              >
                <NumberInput
                  value={form.marketing}
                  onChange={(v) => set("marketing", v)}
                  disabled={!form.marketingActive}
                  suffix="R$"
                />
              </CostRow>

              <CostRow
                label="Outros Custos (R$)"
                hint={form.otherCostsActive ? `${formatCurrency(form.otherCosts)} por unidade` : "Outros custos desativados"}
                active={form.otherCostsActive}
                onToggle={() => set("otherCostsActive", !form.otherCostsActive)}
              >
                <NumberInput
                  value={form.otherCosts}
                  onChange={(v) => set("otherCosts", v)}
                  disabled={!form.otherCostsActive}
                  suffix="R$"
                />
              </CostRow>
            </div>
          </div>

          {/* Card 4: Custos Personalizados Dinâmicos */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <button
              type="button"
              onClick={() => setShowCustomCosts((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Custos Adicionais Personalizados
                {customCosts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                    {customCosts.length} ativo(s)
                  </span>
                )}
              </div>
              {showCustomCosts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCustomCosts && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {customCosts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum custo personalizado. Clique em "Adicionar" para criar.
                  </p>
                )}

                {customCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all",
                      cost.active ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/20 opacity-60"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      {/* Toggle */}
                      <Toggle active={cost.active} onToggle={() => updateCustomCost(cost.id, { active: !cost.active })} />

                      {/* Nome */}
                      <input
                        type="text"
                        value={cost.name}
                        onChange={(e) => updateCustomCost(cost.id, { name: e.target.value })}
                        placeholder="Nome do custo (ex: Seguro)"
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />

                      {/* Tipo */}
                      <select
                        value={cost.type}
                        onChange={(e) => updateCustomCost(cost.id, { type: e.target.value as "percent" | "fixed" })}
                        className="px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-28"
                      >
                        <option value="fixed">Fixo (R$)</option>
                        <option value="percent">Percent (%)</option>
                      </select>

                      {/* Valor */}
                      <div className="relative w-full sm:w-28">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={cost.value || ""}
                          onChange={(e) => updateCustomCost(cost.id, { value: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full px-3 py-2 pr-7 rounded-xl border border-border bg-background text-xs font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] font-bold text-muted-foreground">
                          {cost.type === "percent" ? "%" : "R$"}
                        </span>
                      </div>

                      {/* Valor calculado */}
                      <span className="text-xs font-mono font-bold text-red-500 whitespace-nowrap w-20 text-right hidden sm:block">
                        {cost.active
                          ? cost.type === "fixed"
                            ? `-${formatCurrency(cost.value)}`
                            : `-${formatCurrency(form.sellPrice * (cost.value / 100))}`
                          : "—"}
                      </span>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => removeCustomCost(cost.id)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                        title="Remover custo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCustomCost}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Novo Custo Personalizado
                </button>
              </div>
            )}
          </div>

          {/* Card 5: Margem Desejada */}
          <div className="bg-gradient-to-br from-primary/5 via-card/90 to-card border border-primary/25 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-primary/20 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Calculadora de Preço Ideal
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Margem de Lucro Desejada (%)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {MARGIN_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set("desiredMargin", m)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all",
                        form.desiredMargin === m
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {m}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={95}
                    value={form.desiredMargin}
                    onChange={(e) => set("desiredMargin", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-center font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Preço Ideal</span>
                <span className="text-2xl font-extrabold font-mono text-primary">
                  {idealPrice > 0 ? formatCurrency(idealPrice) : "N/A"}
                </span>
                {idealPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => set("sellPrice", parseFloat(suggestedPrice.toFixed(2)))}
                    className="block text-xs font-bold text-primary hover:underline mt-1"
                  >
                    Usar preço sugerido ({formatCurrency(suggestedPrice)}) →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== COLUNA DIREITA: Resultados ===== */}
        <div className="xl:col-span-5 space-y-5 xl:sticky xl:top-4">
          {/* Resultado Principal */}
          <div
            className={cn(
              "p-6 rounded-2xl border shadow-lg transition-all space-y-5",
              profitStatus === "healthy_profit"
                ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card"
                : profitStatus === "low_margin"
                ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card"
                : "border-red-500/40 bg-gradient-to-br from-red-500/10 via-card to-card"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resultado Financeiro
              </span>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1.5",
                  profitStatus === "healthy_profit"
                    ? "bg-emerald-500 text-white"
                    : profitStatus === "low_margin"
                    ? "bg-amber-500 text-black"
                    : "bg-red-600 text-white"
                )}
              >
                {profitStatus === "healthy_profit" ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Lucrativo</>
                ) : profitStatus === "low_margin" ? (
                  <><AlertTriangle className="w-3.5 h-3.5" /> Margem Baixa</>
                ) : (
                  <><TrendingDown className="w-3.5 h-3.5" /> Prejuízo</>
                )}
              </span>
            </div>

            {/* Lucro e Margem destaque */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Lucro Líquido
                </span>
                <span
                  className={cn(
                    "text-2xl font-extrabold font-mono tracking-tight mt-0.5 block",
                    netProfitReal >= 0 ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {formatCurrency(netProfitReal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Margem Líquida
                </span>
                <span
                  className={cn(
                    "text-2xl font-extrabold font-mono tracking-tight mt-0.5 block",
                    marginReal >= 20 ? "text-emerald-500" : marginReal >= 0 ? "text-amber-500" : "text-red-500"
                  )}
                >
                  {marginReal.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Grid de KPIs */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {[
                { label: "Receita Bruta", value: formatCurrency(form.sellPrice), color: "text-foreground" },
                { label: "Custo do Produto", value: `-${formatCurrency(form.buyPrice)}`, color: "text-red-500" },
                { label: "Total Taxas Marketplace", value: `-${formatCurrency(calc.totalMarketplaceFees)}`, color: "text-orange-500" },
                { label: "Total Despesas Extras", value: `-${formatCurrency(calc.totalExtraExpenses + customPercentTotal)}`, color: "text-red-500" },
                { label: "Total de Custos", value: `-${formatCurrency(calc.totalCosts + customPercentTotal)}`, color: "text-red-600 font-bold" },
                { label: "Lucro Bruto", value: formatCurrency(form.sellPrice - form.buyPrice), color: "text-foreground" },
                { label: "ROI", value: `${roi.toFixed(1)}%`, color: roi >= 0 ? "text-emerald-500" : "text-red-500" },
                { label: "Valor Líquido Recebido", value: formatCurrency(calc.netReceivable), color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-background/60 border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-0.5">
                    {item.label}
                  </span>
                  <span className={cn("font-bold text-sm block", item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preços de Referência */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
              Preços de Referência
            </h4>
            {[
              {
                label: "Preço Mínimo (Breakeven)",
                value: breakeven,
                hint: "Zero a zero — sem lucro e sem prejuízo",
                color: "text-red-500",
                bg: "bg-red-500/5 border-red-500/20",
              },
              {
                label: `Preço Ideal (${form.desiredMargin}% de margem)`,
                value: idealPrice,
                hint: "Atingindo exatamente a margem desejada",
                color: "text-primary",
                bg: "bg-primary/5 border-primary/20",
              },
              {
                label: "Preço Sugerido",
                value: suggestedPrice,
                hint: "Preço psicológico arredondado (ex: R$149,90)",
                color: "text-emerald-500",
                bg: "bg-emerald-500/5 border-emerald-500/20",
                action: () => set("sellPrice", parseFloat(suggestedPrice.toFixed(2))),
              },
            ].map((item) => (
              <div key={item.label} className={cn("p-4 rounded-xl border", item.bg)}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-lg font-extrabold font-mono", item.color)}>
                      {item.value > 0 ? formatCurrency(item.value) : "N/A"}
                    </span>
                    {item.action && item.value > 0 && (
                      <button
                        type="button"
                        onClick={item.action}
                        className="block text-xs text-primary font-semibold mt-1 hover:underline"
                      >
                        Usar este preço →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown detalhado */}
          {customCosts.filter((c) => c.active).length > 0 && (
            <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Custos Personalizados Ativos
              </h4>
              {customCosts.filter((c) => c.active).map((c) => (
                <div key={c.id} className="flex justify-between text-xs py-1 border-b border-border/40">
                  <span className="text-muted-foreground">{c.name || "Custo sem nome"}</span>
                  <span className="font-mono font-bold text-red-500">
                    -{c.type === "fixed"
                      ? formatCurrency(c.value)
                      : formatCurrency(form.sellPrice * (c.value / 100))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 font-bold">
                <span>Total Personalizados</span>
                <span className="font-mono text-red-500">
                  -{formatCurrency(
                    customCosts
                      .filter((c) => c.active)
                      .reduce(
                        (a, c) =>
                          a +
                          (c.type === "fixed"
                            ? c.value
                            : form.sellPrice * (c.value / 100)),
                        0
                      )
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico */}
      {showHistory && (
        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm animate-in fade-in duration-300">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Histórico de Simulações ({history.length})
          </h3>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              Nenhuma simulação salva. Salve uma simulação para ver o histórico.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-muted-foreground uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Produto</th>
                    <th className="p-2">Canal</th>
                    <th className="p-2">Venda</th>
                    <th className="p-2">Lucro</th>
                    <th className="p-2">Margem</th>
                    <th className="p-2">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h: any) => (
                    <tr key={h.id} className="hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => {
                      set("productName", h.productName);
                      set("channel", h.channel);
                      set("buyPrice", h.buyPrice);
                      set("sellPrice", h.sellPrice);
                      set("commissionPercent", h.commissionPercentage);
                      set("commissionFixed", h.commissionFixed);
                      set("freight", h.freightCost);
                      set("freightActive", h.freightCost > 0);
                      set("taxPercent", h.taxPercentage);
                      set("taxPercentActive", h.taxPercentage > 0);
                      set("packaging", h.packagingCost);
                      set("packagingActive", h.packagingCost > 0);
                      set("operational", h.operationalCost);
                      set("operationalActive", h.operationalCost > 0);
                      set("desiredMargin", h.desiredMarginPercentage);
                      setShowHistory(false);
                    }}>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">{h.createdAt ? new Date(h.createdAt).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-2 font-medium max-w-[140px] truncate">{h.productName}</td>
                      <td className="p-2 uppercase font-semibold">{h.channel?.replace("_", " ")}</td>
                      <td className="p-2 font-mono font-bold">{formatCurrency(h.sellPrice)}</td>
                      <td className={cn("p-2 font-mono font-bold", h.netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>{formatCurrency(h.netProfit)}</td>
                      <td className={cn("p-2 font-mono font-bold", h.actualMarginPercentage >= 20 ? "text-emerald-500" : "text-amber-500")}>{h.actualMarginPercentage?.toFixed(1)}%</td>
                      <td className="p-2 font-mono">{h.roiPercentage?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
