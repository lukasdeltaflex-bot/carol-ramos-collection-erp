"use client";

import React, { useEffect, useState } from "react";
import { simulatePricingAction, listSimulationsAction, saveSimulationAction } from "../actions";
import { Calculator, RefreshCw, Save, ArrowRight } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { MarketplaceChannel } from "@/features/integrations/types/marketplaces";
import { cn } from "@/lib/utils";

export default function SimulatorTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [cost, setCost] = useState<number>(50);
  const [basePrice, setBasePrice] = useState<number>(120);
  const [channel, setChannel] = useState<MarketplaceChannel>("shopee");
  const [result, setResult] = useState<any>(null);
  const { error, success } = useToast();

  const loadSimulations = async () => {
    try {
      const res = await listSimulationsAction(tenantId);
      if (res.success) setSimulations(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSimulations();
  }, [tenantId]);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await simulatePricingAction(tenantId, basePrice, cost, channel);
      if (res.success) {
        setResult(res.data);
      } else {
        error("Erro", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const res = await saveSimulationAction(result);
      if (res.success) {
        success("Salvo", "Simulação salva no histórico com sucesso.");
        loadSimulations();
      } else {
        error("Erro ao salvar", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Simulador de Precificação
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold border-b border-border pb-2">Parâmetros</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Custo do Produto (R$)</label>
              <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Preço de Venda Desejado (R$)</label>
              <input type="number" value={basePrice} onChange={e => setBasePrice(Number(e.target.value))} className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Canal de Venda</label>
              <select value={channel} onChange={e => setChannel(e.target.value as MarketplaceChannel)} className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none capitalize">
                <option value="shopee">Shopee</option>
                <option value="mercado_libre">Mercado Livre</option>
                <option value="amazon">Amazon</option>
                <option value="tiktok_shop">TikTok Shop</option>
              </select>
            </div>
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              Simular Lucratividade
            </button>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold border-b border-border pb-2 flex justify-between items-center">
            Resultado
            {result && (
              <button onClick={handleSave} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Save className="w-3.5 h-3.5" /> Salvar
              </button>
            )}
          </h3>
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-accent/20 rounded-xl">
                  <span className="text-muted-foreground block mb-1">Preço Venda</span>
                  <span className="font-bold text-lg">{formatCurrency(result.salePrice)}</span>
                </div>
                <div className="p-4 bg-accent/20 rounded-xl">
                  <span className="text-muted-foreground block mb-1">Custo Total (Taxas+Frete)</span>
                  <span className="font-bold text-lg text-red-500">{formatCurrency(result.channelFees + result.estimatedFreight + result.estimatedTaxes)}</span>
                </div>
              </div>
              <div className={cn("p-6 rounded-xl border", result.profitMargin > 15 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20")}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium opacity-80 block mb-1">Lucro Líquido</span>
                    <span className="text-3xl font-bold">{formatCurrency(result.netProfit)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium opacity-80 block mb-1">Margem</span>
                    <span className="text-2xl font-bold">{result.profitMargin}%</span>
                  </div>
                </div>
              </div>
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <h4 className="text-sm font-bold text-primary mb-2">Recomendação IA</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {result.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5"/> {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-muted-foreground min-h-[200px]">
              <Calculator className="w-12 h-12 mb-3 opacity-20" />
              <p>Preencha os parâmetros e clique em simular.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
