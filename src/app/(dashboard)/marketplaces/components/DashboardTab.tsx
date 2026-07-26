"use client";

import React, { useEffect, useState } from "react";
import { getExecutiveReportAction, listOrdersAction, listAccountsAction, listItemsAction } from "../actions";
import { TrendingUp, Package, CheckCircle, XCircle, DollarSign, Clock, Store, RefreshCw, AlertCircle, ShoppingCart } from "lucide-react";
import { MarketplaceOrder, MarketplaceAccount } from "@/features/integrations/types/marketplaces";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function DashboardTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const { error } = useToast();

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [resReport, resOrders, resAccounts, resItems] = await Promise.all([
        getExecutiveReportAction(tenantId),
        listOrdersAction(tenantId, { limit: 500 }),
        listAccountsAction(tenantId),
        listItemsAction(tenantId)
      ]);

      if (resReport.success) setReport(resReport.data);
      if (resOrders.success) setOrders(resOrders.data || []);
      if (resAccounts.success) setAccounts(resAccounts.data || []);
      if (resItems.success) setTotalProducts((resItems.data || []).length);
      else if (resReport.error) error("Erro ao carregar Dashboard", resReport.error);
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Estatísticas calculadas
  const hoje = new Date().toISOString().split("T")[0];
  const pedidosHoje = orders.filter((o) => o.createdAt.startsWith(hoje));
  const pendentes = orders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "paid");
  const enviados = orders.filter((o) => o.orderStatus === "shipped" || o.orderStatus === "delivered");
  const cancelados = orders.filter((o) => o.orderStatus === "cancelled");

  const valorHoje = pedidosHoje.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KPIS Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Valor Vendido Hoje</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground pt-2">{formatCurrency(valorHoje)}</p>
          <p className="text-xs text-muted-foreground pt-1">{pedidosHoje.length} pedidos hoje</p>
        </div>

        <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Valor Vendido (Mês)</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground pt-2">{formatCurrency(report?.totalGrossRevenue || 0)}</p>
          <p className="text-xs text-muted-foreground pt-1">{report?.totalOrdersCount || 0} pedidos no mês</p>
        </div>

        <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ticket Médio</span>
            <ShoppingCart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground pt-2">{formatCurrency(report?.overallAverageTicket || 0)}</p>
          <p className="text-xs text-muted-foreground pt-1">Geral consolidado</p>
        </div>

        <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Produtos Anunciados</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground pt-2">{totalProducts}</p>
          <p className="text-xs text-muted-foreground pt-1">Sincronizados em todos canais</p>
        </div>
      </div>

      {/* Secundários: Status de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent p-5 rounded-2xl border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pedidos Pendentes</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{enviados.length}</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Pedidos Enviados/Entregues</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-transparent p-5 rounded-2xl border border-red-500/20">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{cancelados.length}</p>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Pedidos Cancelados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status dos Canais */}
      <h3 className="text-lg font-bold text-foreground pt-4 flex items-center gap-2">
        <Store className="w-5 h-5 text-primary" />
        Desempenho por Canal
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report?.byChannel?.map((ch: any) => {
          const acc = accounts.find(a => a.channel === ch.channel);
          const isShopee = ch.channel === "shopee";
          return (
            <div key={ch.channel} className={cn(
              "p-5 rounded-2xl border flex items-center justify-between",
              isShopee ? "bg-orange-500/5 border-orange-500/20" : "bg-yellow-500/5 border-yellow-500/20"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", isShopee ? "bg-orange-500" : "bg-yellow-500 text-slate-900")}>
                  {isShopee ? "SH" : "ML"}
                </div>
                <div>
                  <h4 className="font-bold text-foreground capitalize">{ch.channel.replace("_", " ")}</h4>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    {acc?.status === "connected" ? (
                      <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Conectado</span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Desconectado</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground text-lg">{formatCurrency(ch.grossRevenue)}</p>
                <p className="text-xs text-muted-foreground">{ch.ordersCount} pedidos</p>
              </div>
            </div>
          );
        })}
        {(!report?.byChannel || report.byChannel.length === 0) && (
          <div className="col-span-2 p-6 text-center text-muted-foreground bg-card/30 rounded-2xl border border-border">
            Nenhuma venda registrada nos canais no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}
