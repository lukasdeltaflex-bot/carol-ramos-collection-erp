"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { Product } from "@/features/products/types";
import PricingSimulator from "@/features/pricing/components/PricingSimulator";
import MarketplacesManager from "@/features/pricing/components/MarketplacesManager";
import { ProductPricingData } from "@/features/pricing/types";
import { useToast } from "@/context/ToastContext";
import {
  Calculator,
  ShoppingBag,
  Package,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  Settings
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function PricingPage() {
  const { getDocs, updateDoc } = useDb();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"simulator" | "marketplaces">("simulator");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductObj, setSelectedProductObj] = useState<Product | null>(null);

  // Load products to allow simulating for any product
  useEffect(() => {
    async function loadProducts() {
      try {
        const docs = await getDocs("products");
        setProducts(docs as Product[]);
      } catch (err) {
        console.error("Erro ao carregar produtos para simulador:", err);
      }
    }
    loadProducts();
  }, []);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId) || null;
    setSelectedProductObj(prod);
  };

  const handleSaveToProduct = async (pricingData: ProductPricingData, calculatedSellPrice?: number) => {
    if (!selectedProductId || !selectedProductObj) {
      toastError("Nenhum produto selecionado", "Selecione um produto no topo para salvar a precificação.");
      return;
    }

    try {
      const updates: Partial<Product> = {
        pricingData,
        ...(calculatedSellPrice ? { sellPrice: calculatedSellPrice } : {})
      };

      await updateDoc("products", selectedProductId, updates);
      success(
        "Precificação Salva!",
        `As configurações de precificação do produto "${selectedProductObj.name}" foram atualizadas.`
      );

      // Refresh product list
      const docs = await getDocs("products");
      setProducts(docs as Product[]);
    } catch (err: any) {
      console.error("Erro ao salvar precificação no produto:", err);
      toastError("Erro ao salvar", "Não foi possível atualizar a precificação do produto.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rosegold-600 to-rosegold-400 flex items-center justify-center shadow-md shadow-rosegold-500/20 text-white">
              <Calculator className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Simulador de Custos & Precificação
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Simule lucro líquido, margem real e taxas cobradas em marketplaces como Shopee, Mercado Livre, Amazon, Shein e Magalu.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border shadow-sm self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all select-none",
              activeTab === "simulator"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <Calculator className="h-4 w-4" />
            <span>Simulador de Custos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("marketplaces")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all select-none",
              activeTab === "marketplaces"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Marketplaces & Taxas</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Simulator */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          {/* Top Bar: Select Product to Load / Save */}
          <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Package className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                  Simular para um Produto Cadastrado (Opcional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => handleSelectProduct(e.target.value)}
                  className="w-full max-w-md px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 truncate"
                >
                  <option value="">-- Simulação Livre (Sem Produto Selecionado) --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Custo: {formatCurrency(p.costPrice)} | Venda: {formatCurrency(p.sellPrice)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProductObj && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary">
                  Carregado: {selectedProductObj.name}
                </span>
              </div>
            )}
          </div>

          {/* Core Simulator */}
          <PricingSimulator
            key={selectedProductId || "free"}
            initialCostPrice={selectedProductObj?.costPrice || 0}
            initialSellPrice={selectedProductObj?.sellPrice || 0}
            initialPricingData={selectedProductObj?.pricingData}
            productName={selectedProductObj?.name}
            onSaveToProduct={selectedProductId ? handleSaveToProduct : undefined}
          />
        </div>
      )}

      {/* Tab 2: Marketplaces Manager */}
      {activeTab === "marketplaces" && <MarketplacesManager />}
    </div>
  );
}
