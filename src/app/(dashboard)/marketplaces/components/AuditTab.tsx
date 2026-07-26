"use client";

import React, { useEffect, useState } from "react";
import { listAuditIssuesAction } from "../actions";
import { ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function AuditTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const { error } = useToast();

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await listAuditIssuesAction(tenantId);
      if (res.success) {
        setIssues(res.data || []);
      } else {
        error("Erro ao carregar auditoria", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const critical = issues.filter((i) => i.severity === "CRITICAL");
  const warnings = issues.filter((i) => i.severity === "WARNING");
  const resolved = issues.filter((i) => i.resolved);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Auditoria de Conformidade</h2>
            <p className="text-sm text-muted-foreground">Monitoramento de violações e conformidade dos canais</p>
          </div>
        </div>
        <button
          onClick={loadAudit}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Audit Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 flex items-center gap-4">
          <XCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-foreground">{critical.length}</p>
            <p className="text-sm font-medium text-red-400">Críticos</p>
          </div>
        </div>
        <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-foreground">{warnings.length}</p>
            <p className="text-sm font-medium text-amber-400">Avisos</p>
          </div>
        </div>
        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-foreground">{resolved.length}</p>
            <p className="text-sm font-medium text-emerald-400">Resolvidos</p>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="font-bold flex items-center gap-2 border-b border-border pb-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Problemas de Conformidade ({issues.length})
        </h3>

        {issues.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center text-muted-foreground">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mb-3 opacity-50" />
            <p className="text-lg font-semibold text-foreground">Conformidade Perfeita</p>
            <p className="text-sm mt-1">Nenhum problema de conformidade detectado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent/40 border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Severidade</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-accent/20 transition-colors text-xs">
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-1 rounded font-bold text-xs",
                        issue.severity === "CRITICAL" ? "bg-red-600 text-white" :
                        issue.severity === "ERROR" ? "bg-red-500/20 text-red-500" :
                        issue.severity === "WARNING" ? "bg-amber-500/20 text-amber-500" :
                        "bg-blue-500/20 text-blue-500"
                      )}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="p-3 font-semibold uppercase text-foreground">{issue.channel || "—"}</td>
                    <td className="p-3 font-mono text-muted-foreground">{issue.issueType}</td>
                    <td className="p-3 text-foreground max-w-[300px] truncate" title={issue.description}>{issue.description}</td>
                    <td className="p-3">
                      {issue.resolved ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Resolvido
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-semibold text-xs">
                          <XCircle className="w-3.5 h-3.5" /> Aberto
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(issue.detectedAt).toLocaleString("pt-BR")}
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
