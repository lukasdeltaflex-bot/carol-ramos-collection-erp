"use client";

import React, { useEffect, useState } from "react";
import { getAiExecutiveSummaryAction, getSmartAlertsAction } from "../actions";
import { BrainCircuit, RefreshCw, Zap, TrendingUp, AlertTriangle, ArrowRight, Lightbulb, CheckCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function AiTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const { error } = useToast();

  const loadAi = async () => {
    setLoading(true);
    try {
      const [resSummary, resAlerts] = await Promise.all([
        getAiExecutiveSummaryAction(tenantId),
        getSmartAlertsAction(tenantId),
      ]);

      if (resSummary.success) setSummary(resSummary.data);
      if (resAlerts.success) setAlerts(resAlerts.data || []);
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAi();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary rounded-xl text-primary-foreground">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Marketplace AI Assistant</h2>
            <p className="text-sm text-primary font-medium">Análise Preditiva e Insights de Negócios</p>
          </div>
        </div>
        <button
          onClick={loadAi}
          disabled={loading}
          className="p-2.5 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal: Resumo Executivo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold flex items-center gap-2 border-b border-border pb-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Resumo Executivo Gerado por IA
            </h3>
            {summary ? (
              <div className="space-y-4">
                <p className="text-foreground leading-relaxed">{summary.executiveNarrative}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-1 mb-2">
                      <TrendingUp className="w-4 h-4" /> Oportunidades
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {(summary.growthOpportunities || []).map((op: string, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0 mt-1" /> {op}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <h4 className="text-sm font-bold text-red-500 flex items-center gap-1 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Riscos
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {(summary.criticalRisks || []).map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <ArrowRight className="w-3 h-3 text-red-500 shrink-0 mt-1" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4">
                Dados insuficientes para gerar análise preditiva. Conecte seus canais para ativar a IA.
              </p>
            )}
          </div>
        </div>

        {/* Coluna lateral: Smart Alerts */}
        <div className="space-y-6">
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold flex items-center gap-2 border-b border-border pb-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Smart Alerts ({alerts.length})
            </h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col gap-2",
                      alert.severity === "high"
                        ? "bg-red-500/10 border-red-500/20"
                        : alert.severity === "medium"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {alert.type?.replace("_", " ") || "ALERTA"}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded-md font-bold uppercase",
                          alert.severity === "high"
                            ? "bg-red-500/20 text-red-500"
                            : alert.severity === "medium"
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-blue-500/20 text-blue-500"
                        )}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <button className="text-xs font-semibold text-primary mt-1 text-left hover:underline">
                      Ver Ação Recomendada &rarr;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-2 opacity-50" />
                <p className="text-sm font-medium">Tudo operando perfeitamente.</p>
                <p className="text-xs mt-1">Nenhum alerta crítico no momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
