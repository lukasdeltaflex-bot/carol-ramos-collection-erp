"use client";

import React, { useEffect, useState } from "react";
import { listIncidentsAction } from "../actions";
import { AlertTriangle, RefreshCw, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function IncidentTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const { error } = useToast();

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await listIncidentsAction(tenantId);
      if (res.success) {
        setIncidents(res.data || []);
      } else {
        error("Erro ao carregar incidentes", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [tenantId]);

  const open = incidents.filter((i) => i.status === "open");
  const investigating = incidents.filter((i) => i.status === "investigating");
  const resolved = incidents.filter((i) => i.status === "resolved");

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Central de Incidentes</h2>
            <p className="text-sm text-muted-foreground">Monitoramento e resolução de problemas operacionais</p>
          </div>
        </div>
        <button
          onClick={loadIncidents}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 text-center">
          <p className="text-3xl font-bold text-red-500">{open.length}</p>
          <p className="text-sm font-medium text-red-400 mt-1 flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4"/> Abertos</p>
        </div>
        <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 text-center">
          <p className="text-3xl font-bold text-amber-500">{investigating.length}</p>
          <p className="text-sm font-medium text-amber-400 mt-1 flex items-center justify-center gap-1"><Clock className="w-4 h-4"/> Em Investigação</p>
        </div>
        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-center">
          <p className="text-3xl font-bold text-emerald-500">{resolved.length}</p>
          <p className="text-sm font-medium text-emerald-400 mt-1 flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4"/> Resolvidos</p>
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm space-y-3">
        <h3 className="font-bold flex items-center gap-2 border-b border-border pb-3 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          Todos os Incidentes ({incidents.length})
        </h3>

        {incidents.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3 opacity-50" />
            <p className="text-lg font-semibold text-foreground">Tudo Operacional</p>
            <p className="text-sm mt-1">Nenhum incidente registrado no período.</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className={cn(
                "p-5 rounded-2xl border flex flex-col md:flex-row md:items-start justify-between gap-4",
                incident.severity === "critical" ? "bg-red-500/10 border-red-500/30" :
                incident.severity === "high" ? "bg-orange-500/10 border-orange-500/30" :
                incident.severity === "medium" ? "bg-amber-500/10 border-amber-500/20" :
                "bg-blue-500/10 border-blue-500/20"
              )}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn(
                    "px-2 py-0.5 text-xs font-bold uppercase rounded-md",
                    incident.severity === "critical" ? "bg-red-600 text-white" :
                    incident.severity === "high" ? "bg-orange-500/20 text-orange-500" :
                    incident.severity === "medium" ? "bg-amber-500/20 text-amber-500" :
                    "bg-blue-500/20 text-blue-500"
                  )}>
                    {incident.severity}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase font-mono">{incident.channel}</span>
                </div>
                <h4 className="font-bold text-foreground text-base">{incident.title}</h4>
                <p className="text-sm text-muted-foreground">{incident.description}</p>
                {incident.rootCause && (
                  <p className="text-xs text-muted-foreground italic">Causa raiz: {incident.rootCause}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full",
                  incident.status === "open" ? "bg-red-500/20 text-red-500" :
                  incident.status === "investigating" ? "bg-amber-500/20 text-amber-500" :
                  "bg-emerald-500/20 text-emerald-500"
                )}>
                  {incident.status}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(incident.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
