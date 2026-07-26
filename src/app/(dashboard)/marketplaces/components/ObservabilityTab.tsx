"use client";

import React, { useEffect, useState } from "react";
import { getMetricsAction } from "../actions";
import { Activity, RefreshCw, Cpu, Zap, Database, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function ObservabilityTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const { error } = useToast();

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await getMetricsAction(tenantId);
      if (res.success) {
        setMetrics(res.data);
      } else {
        error("Erro ao carregar métricas", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Auto-refresh a cada 60s
    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-12 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const channelMetrics = metrics?.channelMetrics || [];
  const systemHealth = metrics?.systemHealth || {};
  const overallHealth = systemHealth.status || "healthy";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl",
            overallHealth === "healthy" ? "bg-emerald-500/10" :
            overallHealth === "degraded" ? "bg-amber-500/10" :
            "bg-red-500/10"
          )}>
            <Activity className={cn(
              "w-6 h-6",
              overallHealth === "healthy" ? "text-emerald-500" :
              overallHealth === "degraded" ? "text-amber-500" :
              "text-red-500"
            )} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              Observabilidade & Métricas
              <span className={cn(
                "px-2 py-0.5 text-xs font-bold rounded-full",
                overallHealth === "healthy" ? "bg-emerald-500/20 text-emerald-500" :
                overallHealth === "degraded" ? "bg-amber-500/20 text-amber-500" :
                "bg-red-500/20 text-red-500"
              )}>
                {overallHealth.toUpperCase()}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">Monitoramento em tempo real de todos os sistemas</p>
          </div>
        </div>
        <button
          onClick={loadMetrics}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
          title="Atualizar métricas"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* System Health Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Cache Hit Rate", value: `${Math.round((metrics.cacheHitRate || 0) * 100)}%`, icon: Database, color: "text-blue-500" },
            { label: "API Latência Média", value: `${metrics.averageApiLatencyMs || 0}ms`, icon: Zap, color: "text-amber-500" },
            { label: "Taxa de Erros", value: `${(metrics.errorRate || 0).toFixed(2)}%`, icon: AlertTriangle, color: "text-red-500" },
            { label: "Webhooks Processados", value: metrics.totalWebhooksProcessed || 0, icon: Clock, color: "text-emerald-500" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
                  <Icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Channel Metrics Table */}
      <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="font-bold flex items-center gap-2 border-b border-border pb-3 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          Métricas por Canal ({channelMetrics.length})
        </h3>

        {channelMetrics.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma métrica disponível. Os dados serão coletados conforme o sistema operar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent/40 border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Requisições/min</th>
                  <th className="p-3">Latência P99</th>
                  <th className="p-3">Taxa Erro</th>
                  <th className="p-3">Limite API</th>
                  <th className="p-3">Última Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {channelMetrics.map((cm: any) => (
                  <tr key={cm.channel} className="hover:bg-accent/20 transition-colors text-xs">
                    <td className="p-3 font-bold uppercase">{cm.channel.replace("_", " ")}</td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit",
                        cm.isHealthy ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {cm.isHealthy ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {cm.isHealthy ? "Saudável" : "Degradado"}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{cm.requestsPerMinute ?? "—"}</td>
                    <td className="p-3 font-mono">{cm.p99LatencyMs ? `${cm.p99LatencyMs}ms` : "—"}</td>
                    <td className={cn("p-3 font-mono font-semibold", (cm.errorRate || 0) > 5 ? "text-red-500" : "text-foreground")}>
                      {cm.errorRate !== undefined ? `${cm.errorRate.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-3">
                      <div className="w-24 bg-accent/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", (cm.rateLimitUsedPercent || 0) > 80 ? "bg-red-500" : "bg-emerald-500")}
                          style={{ width: `${cm.rateLimitUsedPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">{cm.rateLimitUsedPercent || 0}%</span>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {cm.lastSyncAt ? new Date(cm.lastSyncAt).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
