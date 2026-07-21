"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDb } from "@/hooks/useDb";
import { Marketplace, ProductPricingData, DEFAULT_MARKETPLACES } from "../types";
import { calculatePricing, calculateIdealPrice, DEFAULT_EXTRA_EXPENSES } from "../utils/calculator";
import { formatCurrency, cn } from "@/lib/utils";
import CurrencyInput from "@/components/ui/CurrencyInput";
import {
  Calculator,
  ShoppingBag,
  Percent,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Save,
  Truck,
  Package,
  Layers,
  HelpCircle,
  Check
} from "lucide-react";

interface PricingSimulatorProps {
  initialCostPrice?: number;
  initialSellPrice?: number;
  initialPricingData?: ProductPricingData;
  onSaveToProduct?: (pricingData: ProductPricingData, calculatedSellPrice?: number) => void;
  productName?: string;
  isEmbeddedInProductModal?: boolean;
}

export default function PricingSimulator({
  initialCostPrice = 0,
  initialSellPrice = 0,
  initialPricingData,
  onSaveToProduct,
  productName,
  isEmbeddedInProductModal = false
}: PricingSimulatorProps) {
  const { getDocs, createDoc } = useDb();

  // Database Marketplaces list
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<string>(initialPricingData?.marketplaceId || "");

  // Form Fields
  const [costPrice, setCostPrice] = useState<number>(initialCostPrice || 0);
  const [sellPrice, setSellPrice] = useState<number>(initialSellPrice || 0);

  const [percentFee, setPercentFee] = useState<number>(initialPricingData?.percentFee ?? 20);
  const [isPercentFeeActive, setIsPercentFeeActive] = useState<boolean>(initialPricingData?.isPercentFeeActive ?? true);

  const [fixedFee, setFixedFee] = useState<number>(initialPricingData?.fixedFee ?? 4.0);
  const [isFixedFeeActive, setIsFixedFeeActive] = useState<boolean>(initialPricingData?.isFixedFeeActive ?? true);

  const [extraExpenses, setExtraExpenses] = useState(
    initialPricingData?.extraExpenses || DEFAULT_EXTRA_EXPENSES
  );

  const [showExtraExpenses, setShowExtraExpenses] = useState<boolean>(false);
  const [targetMargin, setTargetMargin] = useState<number>(30);

  // Sync props if cost/sell price changes initially
  useEffect(() => {
    if (initialCostPrice !== undefined && initialCostPrice > 0 && costPrice === 0) {
      setCostPrice(initialCostPrice);
    }
    if (initialSellPrice !== undefined && initialSellPrice > 0 && sellPrice === 0) {
      setSellPrice(initialSellPrice);
    }
  }, [initialCostPrice, initialSellPrice]);

  // Load Marketplaces from Firestore
  useEffect(() => {
    async function loadMarketplaces() {
      try {
        let docs = await getDocs("marketplaces");
        if (docs.length === 0) {
          await Promise.all(DEFAULT_MARKETPLACES.map(m => createDoc("marketplaces", m)));
          docs = await getDocs("marketplaces");
        }
        const activeMkt = (docs as Marketplace[]).filter(m => m.status === "active");
        setMarketplaces(activeMkt);

        if (!selectedMarketplaceId && activeMkt.length > 0) {
          const defaultMkt = activeMkt.find(m => m.name.toLowerCase().includes("shopee")) || activeMkt[0];
          setSelectedMarketplaceId(defaultMkt.id);
          if (!initialPricingData) {
            setPercentFee(defaultMkt.percentFee);
            setFixedFee(defaultMkt.fixedFee);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar marketplaces:", err);
      }
    }
    loadMarketplaces();
  }, []);

  const handleSelectMarketplace = (mktId: string) => {
    setSelectedMarketplaceId(mktId);
    const mkt = marketplaces.find(m => m.id === mktId);
    if (mkt) {
      setPercentFee(mkt.percentFee);
      setIsPercentFeeActive(true);
      setFixedFee(mkt.fixedFee);
      setIsFixedFeeActive(true);
    }
  };

  // Real-time calculations
  const calc = useMemo(() => {
    return calculatePricing(
      costPrice,
      sellPrice,
      percentFee,
      isPercentFeeActive,
      fixedFee,
      isFixedFeeActive,
      extraExpenses
    );
  }, [costPrice, sellPrice, percentFee, isPercentFeeActive, fixedFee, isFixedFeeActive, extraExpenses]);

  // Ideal Selling Price calculation
  const idealPrice = useMemo(() => {
    return calculateIdealPrice(
      costPrice,
      targetMargin,
      percentFee,
      isPercentFeeActive,
      fixedFee,
      isFixedFeeActive,
      extraExpenses
    );
  }, [costPrice, targetMargin, percentFee, isPercentFeeActive, fixedFee, isFixedFeeActive, extraExpenses]);

  const handleApplyIdealPrice = () => {
    if (idealPrice > 0) {
      setSellPrice(Number(idealPrice.toFixed(2)));
    }
  };

  const handleSave = () => {
    if (onSaveToProduct) {
      const selectedMkt = marketplaces.find(m => m.id === selectedMarketplaceId);
      onSaveToProduct(
        {
          marketplaceId: selectedMarketplaceId,
          marketplaceName: selectedMkt?.name || "Personalizado",
          percentFee,
          isPercentFeeActive,
          fixedFee,
          isFixedFeeActive,
          extraExpenses
        },
        sellPrice
      );
    }
  };

  const selectedMktObj = marketplaces.find(m => m.id === selectedMarketplaceId);

  return (
    <div className="space-y-6 select-none w-full">
      {/* Header Banner */}
      {productName && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rosegold-500/15 via-primary/10 to-card border border-rosegold-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Simulação de Custos & Margem para
              </span>
              <h3 className="text-lg font-bold text-foreground leading-tight">{productName}</h3>
            </div>
          </div>
          {onSaveToProduct && (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 shrink-0"
            >
              <Save className="h-4 w-4" />
              <span>Salvar no Produto</span>
            </button>
          )}
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Simulation Controls (7 cols on XL) */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Card 1: Marketplace & Preços Base */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="h-4.5 w-4.5 text-primary" />
                Marketplace & Preços Base
              </span>
              {selectedMktObj && (
                <span className={cn("px-3 py-1 rounded-full text-xs font-extrabold shadow-xs", selectedMktObj.color || "bg-primary text-primary-foreground")}>
                  {selectedMktObj.name}
                </span>
              )}
            </div>

            {/* Marketplace Selector Buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Selecione o Canal de Venda / Marketplace
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {marketplaces.map(mkt => {
                  const isSelected = selectedMarketplaceId === mkt.id;
                  return (
                    <button
                      key={mkt.id}
                      type="button"
                      onClick={() => handleSelectMarketplace(mkt.id)}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-semibold text-left transition-all flex flex-col justify-between min-h-[64px] relative overflow-hidden",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/40 font-bold"
                          : "border-border bg-card/50 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="truncate font-bold text-xs">{mkt.name}</span>
                      <span className="text-[10px] opacity-85 font-mono mt-1">
                        {mkt.percentFee}% + {formatCurrency(mkt.fixedFee)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monetary Currency Inputs (Brazilian Real Standard) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {/* Custo do Produto */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Custo do Produto (R$)
                </label>
                <CurrencyInput
                  value={costPrice}
                  onChange={setCostPrice}
                  placeholder="0,00"
                />
              </div>

              {/* Preço de Venda */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Preço de Venda Simulado (R$)
                </label>
                <CurrencyInput
                  value={sellPrice}
                  onChange={setSellPrice}
                  placeholder="0,00"
                  className="text-primary font-extrabold"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Taxas do Marketplace */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-5">
            <div className="border-b border-border/80 pb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Percent className="h-4.5 w-4.5 text-rosegold-500" />
                Taxas da Plataforma / Marketplace
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Ative ou desative cada taxa individualmente
              </span>
            </div>

            <div className="space-y-4">
              {/* Taxa Percentual */}
              <div className={cn("p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3", isPercentFeeActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60")}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPercentFeeActive(!isPercentFeeActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isPercentFeeActive ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200", isPercentFeeActive ? "translate-x-5" : "translate-x-0")} />
                  </button>
                  <div>
                    <label className="text-xs font-bold text-foreground block cursor-pointer" onClick={() => setIsPercentFeeActive(!isPercentFeeActive)}>
                      Taxa Percentual da Comissão (%)
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {isPercentFeeActive ? `Desconta ${percentFee}% sobre a venda` : "Taxa percentual desligada"}
                    </span>
                  </div>
                </div>

                <div className="relative w-full sm:w-36 self-end sm:self-auto">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!isPercentFeeActive}
                    value={percentFee || ""}
                    onChange={e => setPercentFee(parseFloat(e.target.value) || 0)}
                    placeholder="20.0"
                    className="w-full pr-7 pl-3 py-2 rounded-xl border border-border bg-background text-xs font-bold font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* Taxa Fixa */}
              <div className={cn("p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3", isFixedFeeActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60")}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFixedFeeActive(!isFixedFeeActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isFixedFeeActive ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200", isFixedFeeActive ? "translate-x-5" : "translate-x-0")} />
                  </button>
                  <div>
                    <label className="text-xs font-bold text-foreground block cursor-pointer" onClick={() => setIsFixedFeeActive(!isFixedFeeActive)}>
                      Taxa Fixa por Venda / Pedido (R$)
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {isFixedFeeActive ? `Desconta ${formatCurrency(fixedFee)} por pedido` : "Taxa fixa desligada"}
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-40 self-end sm:self-auto">
                  <CurrencyInput
                    value={fixedFee}
                    onChange={setFixedFee}
                    disabled={!isFixedFeeActive}
                    placeholder="4,00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Despesas Extras */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-4">
            <button
              type="button"
              onClick={() => setShowExtraExpenses(!showExtraExpenses)}
              className="w-full flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4.5 w-4.5 text-blue-500" />
                <span>Despesas Extras (Frete, Embalagem, Impostos...)</span>
                {calc.totalExtraExpenses > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px]">
                    +{formatCurrency(calc.totalExtraExpenses)}
                  </span>
                )}
              </div>
              {showExtraExpenses ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
            </button>

            {showExtraExpenses && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-200">
                {/* Frete */}
                <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Frete Coparticipação (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, freightActive: !prev.freightActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                        extraExpenses.freightActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.freightActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <CurrencyInput
                    value={extraExpenses.freight}
                    onChange={val => setExtraExpenses(prev => ({ ...prev, freight: val }))}
                    disabled={!extraExpenses.freightActive}
                    placeholder="0,00"
                  />
                </div>

                {/* Embalagem */}
                <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Embalagem & Insumos (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, packagingActive: !prev.packagingActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                        extraExpenses.packagingActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.packagingActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <CurrencyInput
                    value={extraExpenses.packaging}
                    onChange={val => setExtraExpenses(prev => ({ ...prev, packaging: val }))}
                    disabled={!extraExpenses.packagingActive}
                    placeholder="0,00"
                  />
                </div>

                {/* Impostos % */}
                <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Impostos Simples / Nota (%)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, taxesActive: !prev.taxesActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                        extraExpenses.taxesActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.taxesActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!extraExpenses.taxesActive}
                    value={extraExpenses.taxesPercent || ""}
                    onChange={e => setExtraExpenses(prev => ({ ...prev, taxesPercent: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,0%"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono font-bold text-right disabled:opacity-40"
                  />
                </div>

                {/* Marketing */}
                <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Tráfego / Ads (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, marketingActive: !prev.marketingActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                        extraExpenses.marketingActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.marketingActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <CurrencyInput
                    value={extraExpenses.marketing}
                    onChange={val => setExtraExpenses(prev => ({ ...prev, marketing: val }))}
                    disabled={!extraExpenses.marketingActive}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Calculadora de Preço Sugerido */}
          <div className="p-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card/90 to-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5" />
                Calculadora de Preço de Venda Sugerido
              </span>
              <span className="text-[10px] text-muted-foreground">Baseado na margem alvo</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Escolha a Margem Desejada (%)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[20, 30, 40, 50].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMargin(m)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all",
                        targetMargin === m
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {m}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="95"
                    value={targetMargin}
                    onChange={e => setTargetMargin(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-center font-mono"
                  />
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Preço Sugerido</span>
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-foreground">
                  {idealPrice > 0 ? formatCurrency(idealPrice) : "N/A"}
                </span>
                {idealPrice > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyIdealPrice}
                    className="block text-xs font-bold text-primary hover:underline mt-1 sm:ml-auto"
                  >
                    Usar este preço na simulação →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Summary Panel (5 cols on XL) */}
        <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-4">
          
          {/* Main Status Result Card */}
          <div
            className={cn(
              "p-6 sm:p-7 rounded-2xl border shadow-lg transition-all space-y-5",
              calc.profitStatus === "healthy_profit"
                ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-card"
                : calc.profitStatus === "low_margin"
                ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-card"
                : "border-red-500/40 bg-gradient-to-br from-red-500/10 via-red-950/20 to-card"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resultado Financeiro
              </span>
              <span
                className={cn(
                  "px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase flex items-center gap-1.5 shadow-sm",
                  calc.profitStatus === "healthy_profit"
                    ? "bg-emerald-500 text-white"
                    : calc.profitStatus === "low_margin"
                    ? "bg-amber-500 text-black"
                    : "bg-red-600 text-white"
                )}
              >
                {calc.profitStatus === "healthy_profit" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Lucro Lucrativo
                  </>
                ) : calc.profitStatus === "low_margin" ? (
                  <>
                    <AlertTriangle className="h-4 w-4" /> Margem Reduzida
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" /> Prejuízo
                  </>
                )}
              </span>
            </div>

            {/* Big Net Profit & Margin display */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Lucro Líquido por Venda
                </span>
                <h4
                  className={cn(
                    "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-0.5",
                    calc.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatCurrency(calc.netProfit)}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Margem Real de Lucro
                </span>
                <h4
                  className={cn(
                    "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-0.5",
                    calc.marginPercent >= 20
                      ? "text-emerald-600 dark:text-emerald-400"
                      : calc.marginPercent >= 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {calc.marginPercent.toFixed(1)}%
                </h4>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 pt-3 text-xs border-t border-border/50 font-mono">
              <div className="p-3 rounded-xl bg-background/60 border border-border/40">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Valor Líquido Recebido</span>
                <span className="font-bold text-sm text-foreground block mt-0.5">{formatCurrency(calc.netReceivable)}</span>
              </div>
              <div className="p-3 rounded-xl bg-background/60 border border-border/40 text-right">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Markup sobre o Custo</span>
                <span className="font-bold text-sm text-foreground block mt-0.5">{calc.markupPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Breakdown Table Details */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/80 pb-3">
              Detalhamento de Custos e Taxas
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Preço de Venda Bruto</span>
                <span className="font-bold font-mono text-foreground text-sm">{formatCurrency(calc.sellPrice)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">(-) Custo do Produto</span>
                <span className="font-bold font-mono text-red-500">-{formatCurrency(calc.costPrice)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">
                  (-) Taxa Percentual ({calc.isPercentFeeActive ? `${calc.percentFee}%` : "Desligada"})
                </span>
                <span className="font-bold font-mono text-red-500">-{formatCurrency(calc.percentFeeAmount)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground font-medium">
                  (-) Taxa Fixa ({calc.isFixedFeeActive ? formatCurrency(calc.fixedFee) : "Desligada"})
                </span>
                <span className="font-bold font-mono text-red-500">-{formatCurrency(calc.fixedFeeAmount)}</span>
              </div>

              {calc.totalExtraExpenses > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">(-) Despesas Extras Totais</span>
                  <span className="font-bold font-mono text-red-500">-{formatCurrency(calc.totalExtraExpenses)}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-border font-bold text-sm">
                <span className="text-foreground">Total de Descontos & Custos</span>
                <span className="font-mono text-red-600 dark:text-red-400">-{formatCurrency(calc.totalCosts)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border font-bold text-sm">
                <span className="text-foreground">Valor Líquido no Bolso</span>
                <span className="font-mono text-primary text-base">{formatCurrency(calc.netReceivable)}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {onSaveToProduct && (
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>Salvar Configuração de Precificação no Produto</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
