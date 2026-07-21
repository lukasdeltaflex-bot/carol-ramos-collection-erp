"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDb } from "@/hooks/useDb";
import { Marketplace, ProductPricingData, DEFAULT_MARKETPLACES } from "../types";
import { calculatePricing, calculateIdealPrice, DEFAULT_EXTRA_EXPENSES } from "../utils/calculator";
import { formatCurrency, cn } from "@/lib/utils";
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
  RotateCcw,
  Save,
  Truck,
  Package,
  Layers,
  HelpCircle
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

  // Target Margin Calculator state
  const [targetMargin, setTargetMargin] = useState<number>(30);

  // Update internal cost & sell price if props change
  useEffect(() => {
    if (initialCostPrice !== undefined && initialCostPrice !== costPrice && costPrice === 0) {
      setCostPrice(initialCostPrice);
    }
    if (initialSellPrice !== undefined && initialSellPrice !== sellPrice && sellPrice === 0) {
      setSellPrice(initialSellPrice);
    }
  }, [initialCostPrice, initialSellPrice]);

  // Load Marketplaces from Firestore (or seed defaults)
  useEffect(() => {
    async function loadMarketplaces() {
      try {
        let docs = await getDocs("marketplaces");
        if (docs.length === 0) {
          // Pre-seed default marketplaces
          await Promise.all(DEFAULT_MARKETPLACES.map(m => createDoc("marketplaces", m)));
          docs = await getDocs("marketplaces");
        }
        const activeMkt = (docs as Marketplace[]).filter(m => m.status === "active");
        setMarketplaces(activeMkt);

        // If no marketplace selected, pick Shopee or first
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

  // When user selects a marketplace, fill rates without overwriting simulation unless clicked
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
    <div className="space-y-6 select-none">
      {/* Header Banner if standalone or product header */}
      {productName && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rosegold-500/10 via-primary/10 to-transparent border border-rosegold-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Simulador para Produto
              </span>
              <h3 className="text-base font-bold text-foreground leading-tight">{productName}</h3>
            </div>
          </div>
          {onSaveToProduct && (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
            >
              <Save className="h-4 w-4" />
              <span>Salvar no Produto</span>
            </button>
          )}
        </div>
      )}

      {/* Grid: Inputs (Left) and Results Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Simulation Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Marketplace & Preços Base */}
          <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Marketplace & Preços Base
              </span>
              {selectedMktObj && (
                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm", selectedMktObj.color || "bg-primary text-primary-foreground")}>
                  {selectedMktObj.name}
                </span>
              )}
            </div>

            {/* Marketplace Selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Selecione o Marketplace
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {marketplaces.map(mkt => {
                  const isSelected = selectedMarketplaceId === mkt.id;
                  return (
                    <button
                      key={mkt.id}
                      type="button"
                      onClick={() => handleSelectMarketplace(mkt.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex flex-col justify-between h-14 relative overflow-hidden",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                          : "border-border bg-card/40 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="truncate font-bold text-[11px]">{mkt.name}</span>
                      <span className="text-[10px] opacity-80 font-mono">
                        {mkt.percentFee}% + {formatCurrency(mkt.fixedFee)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custo & Preço de Venda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Custo do Produto */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Custo do Produto (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice || ""}
                    onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Preço de Venda */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Preço de Venda Simulado (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellPrice || ""}
                    onChange={e => setSellPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm font-bold font-mono text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Taxas do Marketplace (Percentual & Fixa com Switch) */}
          <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Percent className="h-4 w-4 text-rosegold-500" />
                Taxas do Marketplace
              </span>
              <span className="text-[10px] text-muted-foreground">
                Ative ou desative cada taxa individualmente
              </span>
            </div>

            <div className="space-y-4">
              {/* Taxa Percentual */}
              <div className={cn("p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3", isPercentFeeActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60")}>
                <div className="flex items-center gap-3">
                  {/* Switch iOS Style */}
                  <button
                    type="button"
                    onClick={() => setIsPercentFeeActive(!isPercentFeeActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isPercentFeeActive ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        isPercentFeeActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <div>
                    <label className="text-xs font-bold text-foreground block cursor-pointer" onClick={() => setIsPercentFeeActive(!isPercentFeeActive)}>
                      Taxa Percentual (%)
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {isPercentFeeActive ? `Desconta ${percentFee}% da venda` : "Taxa percentual desligada (R$ 0,00)"}
                    </span>
                  </div>
                </div>

                <div className="relative w-32 self-end sm:self-auto">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!isPercentFeeActive}
                    value={percentFee}
                    onChange={e => setPercentFee(parseFloat(e.target.value) || 0)}
                    className="w-full pr-7 pl-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* Taxa Fixa */}
              <div className={cn("p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3", isFixedFeeActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60")}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFixedFeeActive(!isFixedFeeActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isFixedFeeActive ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        isFixedFeeActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <div>
                    <label className="text-xs font-bold text-foreground block cursor-pointer" onClick={() => setIsFixedFeeActive(!isFixedFeeActive)}>
                      Taxa Fixa por Venda (R$)
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {isFixedFeeActive ? `Desconta ${formatCurrency(fixedFee)} por pedido` : "Taxa fixa desligada (R$ 0,00)"}
                    </span>
                  </div>
                </div>

                <div className="relative w-36 self-end sm:self-auto">
                  <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    disabled={!isFixedFeeActive}
                    value={fixedFee}
                    onChange={e => setFixedFee(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Despesas Extras (Opcionais) */}
          <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-4">
            <button
              type="button"
              onClick={() => setShowExtraExpenses(!showExtraExpenses)}
              className="w-full flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <span>Despesas Extras (Frete, Embalagem, Impostos...)</span>
                {calc.totalExtraExpenses > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px]">
                    +{formatCurrency(calc.totalExtraExpenses)}
                  </span>
                )}
              </div>
              {showExtraExpenses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showExtraExpenses && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-200">
                {/* Frete */}
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Frete (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, freightActive: !prev.freightActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        extraExpenses.freightActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.freightActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.50"
                    disabled={!extraExpenses.freightActive}
                    value={extraExpenses.freight || ""}
                    onChange={e => setExtraExpenses(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-right disabled:opacity-40"
                  />
                </div>

                {/* Embalagem */}
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Embalagem (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, packagingActive: !prev.packagingActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        extraExpenses.packagingActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.packagingActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.10"
                    disabled={!extraExpenses.packagingActive}
                    value={extraExpenses.packaging || ""}
                    onChange={e => setExtraExpenses(prev => ({ ...prev, packaging: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-right disabled:opacity-40"
                  />
                </div>

                {/* Comissão Adicional */}
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Comissão Extras (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, commissionActive: !prev.commissionActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        extraExpenses.commissionActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.commissionActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.50"
                    disabled={!extraExpenses.commissionActive}
                    value={extraExpenses.commission || ""}
                    onChange={e => setExtraExpenses(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-right disabled:opacity-40"
                  />
                </div>

                {/* Impostos % */}
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Impostos (%)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, taxesActive: !prev.taxesActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
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
                    placeholder="0.0%"
                    className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-right disabled:opacity-40"
                  />
                </div>

                {/* Marketing */}
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Ads / Mkt (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, marketingActive: !prev.marketingActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        extraExpenses.marketingActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.marketingActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.50"
                    disabled={!extraExpenses.marketingActive}
                    value={extraExpenses.marketing || ""}
                    onChange={e => setExtraExpenses(prev => ({ ...prev, marketing: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-right disabled:opacity-40"
                  />
                </div>

                {/* Outras Despesas */}
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Outras Despesas (R$)</span>
                    <button
                      type="button"
                      onClick={() => setExtraExpenses(prev => ({ ...prev, extraActive: !prev.extraActive }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        extraExpenses.extraActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200", extraExpenses.extraActive ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.50"
                    disabled={!extraExpenses.extraActive}
                    value={extraExpenses.extra || ""}
                    onChange={e => setExtraExpenses(prev => ({ ...prev, extra: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-right disabled:opacity-40"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Calculadora de Preço Ideal por Margem Alvo */}
          <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Calculadora de Preço Sugerido
              </span>
              <span className="text-[10px] text-muted-foreground">Calcula preço de venda ideal</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Margem Desejada (%)
                </label>
                <div className="flex items-center gap-1.5">
                  {[20, 30, 40, 50].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMargin(m)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all",
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
                    className="w-16 px-2 py-1 rounded-lg border border-border bg-background text-xs font-bold text-center font-mono"
                  />
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Preço Ideal</span>
                <span className="text-lg font-extrabold font-mono text-foreground">
                  {idealPrice > 0 ? formatCurrency(idealPrice) : "N/A"}
                </span>
                {idealPrice > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyIdealPrice}
                    className="block text-[10px] font-bold text-primary hover:underline mt-0.5 ml-auto"
                  >
                    Usar este preço
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Summary Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          {/* Main Status Header Card */}
          <div
            className={cn(
              "p-6 rounded-2xl border shadow-lg transition-all space-y-4",
              calc.profitStatus === "healthy_profit"
                ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-card"
                : calc.profitStatus === "low_margin"
                ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-card"
                : "border-red-500/40 bg-gradient-to-br from-red-500/10 via-red-950/20 to-card"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resultado da Simulação
              </span>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase flex items-center gap-1.5 shadow-sm",
                  calc.profitStatus === "healthy_profit"
                    ? "bg-emerald-500 text-white"
                    : calc.profitStatus === "low_margin"
                    ? "bg-amber-500 text-black"
                    : "bg-red-600 text-white"
                )}
              >
                {calc.profitStatus === "healthy_profit" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Lucro Lucrativo
                  </>
                ) : calc.profitStatus === "low_margin" ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> Margem Reduzida
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3.5 w-3.5" /> Prejuízo
                  </>
                )}
              </span>
            </div>

            {/* Big Net Profit & Margin display */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Lucro Líquido
                </span>
                <h4
                  className={cn(
                    "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight",
                    calc.netProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                  )}
                >
                  {formatCurrency(calc.netProfit)}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Margem de Lucro
                </span>
                <h4
                  className={cn(
                    "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight",
                    calc.marginPercent >= 20
                      ? "text-emerald-500 dark:text-emerald-400"
                      : calc.marginPercent >= 0
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-red-500 dark:text-red-400"
                  )}
                >
                  {calc.marginPercent.toFixed(1)}%
                </h4>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-border/40 font-mono">
              <div className="flex justify-between p-2 rounded-xl bg-background/50">
                <span className="text-muted-foreground font-semibold">Valor Líquido:</span>
                <span className="font-bold text-foreground">{formatCurrency(calc.netReceivable)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-background/50">
                <span className="text-muted-foreground font-semibold">Markup:</span>
                <span className="font-bold text-foreground">{calc.markupPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Breakdown Table Details */}
          <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
              Detalhamento Financeiro
            </h4>

            <div className="space-y-2 text-xs">
              {/* Preço de Venda */}
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Preço de Venda</span>
                <span className="font-bold font-mono text-foreground">{formatCurrency(calc.sellPrice)}</span>
              </div>

              {/* Custo do Produto */}
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">(-) Custo do Produto</span>
                <span className="font-bold font-mono text-red-500/80">-{formatCurrency(calc.costPrice)}</span>
              </div>

              {/* Taxa Percentual */}
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">
                  (-) Taxa Percentual ({calc.isPercentFeeActive ? `${calc.percentFee}%` : "Desligada"})
                </span>
                <span className="font-bold font-mono text-red-500/80">-{formatCurrency(calc.percentFeeAmount)}</span>
              </div>

              {/* Taxa Fixa */}
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">
                  (-) Taxa Fixa ({calc.isFixedFeeActive ? formatCurrency(calc.fixedFee) : "Desligada"})
                </span>
                <span className="font-bold font-mono text-red-500/80">-{formatCurrency(calc.fixedFeeAmount)}</span>
              </div>

              {/* Despesas Extras */}
              {calc.totalExtraExpenses > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">(-) Outras Despesas Extras</span>
                  <span className="font-bold font-mono text-red-500/80">-{formatCurrency(calc.totalExtraExpenses)}</span>
                </div>
              )}

              {/* Total de Descontos / Custos */}
              <div className="flex items-center justify-between py-1.5 border-b border-border font-bold">
                <span className="text-foreground">Total de Custos & Taxas</span>
                <span className="font-mono text-red-600 dark:text-red-400">-{formatCurrency(calc.totalCosts)}</span>
              </div>

              {/* Recebimento Líquido */}
              <div className="flex items-center justify-between py-1.5 border-b border-border font-bold">
                <span className="text-foreground">Valor Líquido Recebido</span>
                <span className="font-mono text-primary">{formatCurrency(calc.netReceivable)}</span>
              </div>

              {/* Lucro Bruto */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground font-medium">Lucro Bruto (Sem taxas)</span>
                <span className="font-bold font-mono text-foreground">{formatCurrency(calc.grossProfit)}</span>
              </div>
            </div>
          </div>

          {/* Save Button inside modal */}
          {onSaveToProduct && (
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
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
