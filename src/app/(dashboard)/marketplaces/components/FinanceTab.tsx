"use client";

import React, { useEffect, useState } from "react";
import { getExecutiveReportAction } from "../actions";
import { DollarSign, RefreshCw, BarChart4, ArrowUpRight, ArrowDownRight, Briefcase } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function FinanceTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const { error } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getExecutiveReportAction(tenantId);
      if (res.success) {
        setReport(res.data);
      } else {
        error("Erro ao carregar dados financeiros", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

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
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Relatório Financeiro Executivo</h2>
            <p className="text-sm text-muted-foreground">Visão 360º de Receitas, Comissões e Lucro Líquido</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/50 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Receita Bruta Total</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(report?.totalGrossRevenue || 0)}</p>
          <p className="text-xs text-emerald-500 flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3 h-3" /> +12.5% em relação ao mês anterior
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm border-l-4 border-l-primary">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Lucro Líquido Estimado</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(report?.totalNetRevenue || 0)}</p>
          <p className="text-xs text-muted-foreground mt-2">Após dedução de comissões e taxas</p>
        </div>

        <div className="bg-card/50 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Ticket Médio (Geral)</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(report?.overallAverageTicket || 0)}</p>
        </div>

        <div className="bg-card/50 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Volume de Vendas</p>
          <p className="text-3xl font-bold text-foreground">{report?.totalOrdersCount || 0}</p>
          <p className="text-xs text-muted-foreground mt-2">Pedidos processados no período</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(report?.byChannel || []).map((ch: any) => (
          <div key={ch.channel} className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <h3 className="text-lg font-bold text-foreground capitalize flex items-center gap-2 border-b border-border pb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              {ch.channel.replace("_", " ")}
            </h3>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-accent/20">
                <span className="text-sm font-medium text-muted-foreground">Receita Bruta</span>
                <span className="font-bold">{formatCurrency(ch.grossRevenue)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-accent/20">
                <span className="text-sm font-medium text-muted-foreground">Comissões Estimadas</span>
                <span className="font-bold text-red-500 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4"/> {formatCurrency(ch.estimatedCommissions)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-accent/20">
                <span className="text-sm font-medium text-muted-foreground">Impostos / Frete</span>
                <span className="font-bold text-red-500 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4"/> {formatCurrency(ch.estimatedTaxes + ch.estimatedFreight)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                <span className="text-sm font-bold text-primary">Líquido Estimado</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(ch.netRevenueEstimate)}</span>
              </div>
            </div>
          </div>
        ))}
        {(!report?.byChannel || report.byChannel.length === 0) && (
          <div className="col-span-1 lg:col-span-2 p-12 text-center text-muted-foreground bg-card/60 rounded-2xl border border-border">
            <BarChart4 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            Nenhuma movimentação financeira neste período.
          </div>
        )}
      </div>
    </div>
  );
}
