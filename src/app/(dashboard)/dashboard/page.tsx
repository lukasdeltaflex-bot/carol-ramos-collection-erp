"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { AccountsReceivable, AccountsPayable } from "@/features/finance/types";
import { Reminder } from "@/features/reminders/types";
import { IntegrationConfig } from "@/features/integrations/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  Plus,
  ArrowUpRight,
  Sparkles,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Globe,
  BarChart2,
  Lightbulb,
  Pin,
  CheckCircle2,
  Calendar,
  Trash2,
  LineChart
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from "recharts";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
const getStoreStatus = (company: any) => {
  if (!company || !company.hours) return { isOpen: false, text: "Horários não configurados" };
  
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayEng = daysOfWeek[new Date().getDay()];
  const sched = company.hours[todayEng];
  
  if (!sched || !sched.isOpen) return { isOpen: false, text: "Fechado hoje" };
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMinute;
  
  for (const period of sched.periods) {
    const [openH, openM] = period.open.split(":").map(Number);
    const [closeH, closeM] = period.close.split(":").map(Number);
    
    const openTimeVal = openH * 60 + openM;
    const closeTimeVal = closeH * 60 + closeM;
    
    if (currentTimeVal >= openTimeVal && currentTimeVal <= closeTimeVal) {
      return { 
        isOpen: true, 
        text: `Aberto agora (das ${period.open} às ${period.close})` 
      };
    }
  }
  
  const upcomingToday = sched.periods.find((p: any) => {
    const [openH, openM] = p.open.split(":").map(Number);
    return (openH * 60 + openM) > currentTimeVal;
  });
  
  if (upcomingToday) {
    return { isOpen: false, text: `Fechado no momento (abre às ${upcomingToday.open})` };
  }
  
  return { isOpen: false, text: "Fechado no momento" };
};

export default function Dashboard() {
  const { profile, tenantId, activeCompany } = useAuth();
  const { getDocs } = useDb();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recycleBinItems, setRecycleBinItems] = useState<any[]>([]);
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [prods, sls, custs, recs, pays, rems, rbs, confs] = await Promise.all([
        getDocs("products"),
        getDocs("sales"),
        getDocs("customers"),
        getDocs("accounts_receivable"),
        getDocs("accounts_payable"),
        getDocs("reminders"),
        getDocs("recycle_bin", true),
        getDocs("integration_configs")
      ]);

      setProducts((prods as Product[]) || []);
      setSales((sls as Sale[]) || []);
      setCustomers((custs as Customer[]) || []);
      setReceivables((recs as AccountsReceivable[]) || []);
      setPayables((pays as AccountsPayable[]) || []);
      setReminders((rems as Reminder[]) || []);
      setRecycleBinItems((rbs as any[]) || []);
      setConfigs((confs as IntegrationConfig[]) || []);
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard:", e);
      setProducts([]);
      setSales([]);
      setCustomers([]);
      setReceivables([]);
      setPayables([]);
      setReminders([]);
      setRecycleBinItems([]);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [tenantId]);

  // 1. Cálculos de Vendas de Hoje
  const getTodayStats = () => {
    const today = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter(s => s.createdAt && s.createdAt.startsWith(today));
    
    const revenueToday = todaySales.reduce((sum, s) => sum + s.total, 0);
    const countToday = todaySales.length;

    return {
      revenueToday,
      countToday
    };
  };

  const todayStats = React.useMemo(() => getTodayStats(), [sales]);

  // 2. Itens Críticos (Estoque crítico ou abaixo do mínimo de reposição)
  const criticalItemsCount = React.useMemo(() => products.filter(p => p.currentStock <= 5).length, [products]);

  // 3. Contas a Receber Pendentes
  const totalReceivables = React.useMemo(() => receivables
    .filter(r => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0), [receivables]);

  // 4. Montar Gráfico de Evolução (Últimos 7 dias)
  const getChartData = () => {
    const data: Array<{ name: string; vendas: number }> = [];
    const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const daySales = sales.filter(s => s.createdAt && s.createdAt.startsWith(dateStr));
      const totalDay = daySales.reduce((sum, s) => sum + s.total, 0);

      data.push({
        name: daysOfWeek[d.getDay()],
        vendas: parseFloat(totalDay.toFixed(2))
      });
    }

    return data;
  };

  const chartData = React.useMemo(() => getChartData(), [sales]);

  // 5. Top 5 Produtos Mais Vendidos
  const getTopProducts = () => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.forEach(s => {
      if (s.items) {
        s.items.forEach((item: any) => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.name || item.productId, qty: 0, revenue: 0 };
          }
          productSales[item.productId].qty += item.qty || 1;
          productSales[item.productId].revenue += (item.unitPrice || 0) * (item.qty || 1);
        });
      }
    });
    return Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };
  
  const topProducts = React.useMemo(() => getTopProducts(), [sales]);

  // 6. Últimas 5 Vendas Dinâmicas
  const recentSales = React.useMemo(() => [...sales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5), [sales]);

  // 7. Ticket Médio
  const ticketMedio = React.useMemo(() => sales.length > 0
    ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length
    : 0, [sales]);

  // Helpers para Badges
  const getChannelStyle = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "shopee":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200/50";
      case "mercado_libre":
      case "mercado livre":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-200/50";
      case "instagram":
        return "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400 border-pink-200/50";
      case "whatsapp":
        return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200/50";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/50";
    }
  };

  const getChannelLabel = (channel: string) => {
    if (channel === "pos") return "Loja Física";
    if (channel === "mercado_libre") return "Mercado Livre";
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Saudação do Usuário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rosegold-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl md:text-3xl font-display font-light tracking-tight leading-tight">
            Olá, <span className="font-semibold bg-gradient-to-r from-rosegold-600 to-rosegold-400 bg-clip-text text-transparent dark:from-rosegold-400">{profile?.displayName || "Carol Ramos"}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Sua loja está crescendo! Veja os insights de vendas e estoque dos múltiplos canais de hoje.
          </p>
          {/* Status de Funcionamento */}
          {activeCompany && (
            <div className="flex items-center gap-2 mt-2 select-none animate-in fade-in duration-300">
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                getStoreStatus(activeCompany).isOpen ? "bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500" : "bg-red-500"
              )} />
              <span className="text-[10px] font-semibold text-muted-foreground">
                {getStoreStatus(activeCompany).text}
              </span>
            </div>
          )}
        </div>
        
        {/* Quick Action buttons */}
        <div className="flex items-center gap-2.5 relative z-10">
          <Link
            href="/sales"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Venda / PDV</span>
          </Link>
          <Link
            href="/ai"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rosegold-300/30 dark:border-rosegold-800/40 bg-rosegold-100/50 dark:bg-rosegold-950/20 text-rosegold-700 dark:text-rosegold-300 text-xs font-semibold hover:bg-rosegold-100 dark:hover:bg-rosegold-950/40 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Assistente IA</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* 2. Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Faturamento Diário */}
            <div className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col justify-between h-36 relative group hover:border-rosegold-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento de Hoje</span>
                <div className="p-2 rounded-xl bg-rosegold-100 dark:bg-rosegold-950/30 text-rosegold-600 dark:text-rosegold-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight font-mono">
                  {formatCurrency(todayStats.revenueToday)}
                </h3>
                <p className="text-[10px] text-green-500 flex items-center gap-0.5 mt-0.5 font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Sincronizado em tempo real</span>
                </p>
              </div>
            </div>

            {/* Card 2: Vendas Realizadas */}
            <div className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col justify-between h-36 relative group hover:border-rosegold-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendas de Hoje</span>
                <div className="p-2 rounded-xl bg-rosegold-100 dark:bg-rosegold-950/30 text-rosegold-600 dark:text-rosegold-400">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {todayStats.countToday} {todayStats.countToday === 1 ? "Pedido" : "Pedidos"}
                </h3>
                <p className="text-[10px] text-green-500 flex items-center gap-0.5 mt-0.5 font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Canais ativos integrados</span>
                </p>
              </div>
            </div>

            {/* Card 3: Estoque Alerta */}
            <div className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col justify-between h-36 relative group hover:border-rosegold-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Itens Críticos</span>
                <div className={cn(
                  "p-2 rounded-xl",
                  criticalItemsCount > 0 ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "bg-muted text-muted-foreground"
                )}>
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className={cn(
                  "text-2xl font-bold tracking-tight",
                  criticalItemsCount > 0 && "text-red-600 dark:text-red-400"
                )}>
                  {criticalItemsCount} SKU's
                </h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <span>{criticalItemsCount > 0 ? "Necessitam de reposição" : "Estoque saudável"}</span>
                </p>
              </div>
            </div>

            {/* Card 4: Total de Clientes */}
            <div className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col justify-between h-36 relative group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Clientes</span>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {customers.length}
                </h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <span>Clientes cadastrados na base</span>
                </p>
              </div>
            </div>
          </div>

          {/* 3. Charts & List Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Evolução (Faturamento) */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card/40 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold">Faturamento Diário</h3>
                  <p className="text-xs text-muted-foreground">Evolução do caixa ao longo da semana corrente.</p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-semibold border border-border rounded-lg bg-card/50">
                  Últimos 7 Dias
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="name" stroke="currentColor" className="text-[10px] text-muted-foreground" tickLine={false} />
                    <YAxis stroke="currentColor" className="text-[10px] text-muted-foreground" tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "hsl(var(--foreground))"
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="vendas" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Últimas Vendas */}
            <div className="p-5 rounded-2xl border border-border bg-card/40 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold">Últimas Vendas</h3>
                    <p className="text-xs text-muted-foreground">Monitoramento de transações em tempo real.</p>
                  </div>
                  <Link href="/sales" className="text-[10px] font-semibold text-rosegold-500 hover:underline flex items-center gap-0.5">
                    <span>Ver Todas</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="space-y-3.5">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">
                          {!sale.customerId ? "Consumidor Geral" : sale.customerId === "marketplace-buyer" ? "Cliente Marketplace" : `Cliente ID: ...${sale.customerId.slice(-4)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                          {sale.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span className="text-xs font-bold text-foreground font-mono">{formatCurrency(sale.total)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">{formatDate(sale.createdAt)}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${getChannelStyle(sale.channel)}`}>
                            {getChannelLabel(sale.channel)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentSales.length === 0 && (
                    <p className="text-center py-10 text-muted-foreground italic text-xs">Nenhuma venda registrada.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Produtos + Indicadores Financeiros */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Produtos */}
            <div className="p-5 rounded-2xl border border-border bg-card/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Top 5 Produtos Mais Vendidos
                  </h3>
                  <p className="text-xs text-muted-foreground">Baseado no histórico de vendas registradas.</p>
                </div>
                <Link href="/products" className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5">
                  <span>Ver Catálogo</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {topProducts.length > 0 ? (
                <div className="space-y-2.5">
                  {topProducts.map((p, i) => {
                    const maxQty = topProducts[0]?.qty || 1;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground truncate flex-1 mr-2">{p.name}</span>
                          <span className="font-mono font-bold text-foreground shrink-0">{p.qty} un.</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(p.qty / maxQty) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground italic text-xs">Nenhuma venda registrada ainda.</p>
              )}
            </div>

            {/* Indicadores Financeiros */}
            <div className="p-5 rounded-2xl border border-border bg-card/40 space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Indicadores Financeiros
                </h3>
                <p className="text-xs text-muted-foreground">Resumo de performance financeira geral.</p>
              </div>
              <div className="space-y-3">
                <IndicatorRow
                  label="Ticket Médio"
                  value={formatCurrency(ticketMedio)}
                  desc="Média por venda registrada"
                  color="text-emerald-600 dark:text-emerald-400"
                />
                <IndicatorRow
                  label="Total em Vendas"
                  value={formatCurrency(sales.reduce((s, v) => s + v.total, 0))}
                  desc="Faturamento acumulado no período"
                  color="text-primary"
                />
                <IndicatorRow
                  label="Produtos Ativos"
                  value={`${products.filter(p => p.currentStock > 0).length} SKUs`}
                  desc="Produtos com estoque disponível"
                  color="text-blue-600 dark:text-blue-400"
                />
                <IndicatorRow
                  label="Contas a Receber"
                  value={formatCurrency(totalReceivables)}
                  desc="Pendências de recebimento em aberto"
                  color="text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>
          </div>

          {/* 3b. Card de Lembretes & Ideias de Hoje */}
          <div className="p-5 rounded-2xl border border-border bg-card/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Lembretes & Ideias de Hoje</h3>
                  <p className="text-xs text-muted-foreground">Tarefas pendentes, ideias fixadas e alertas do dia.</p>
                </div>
              </div>
              <Link href="/reminders" className="text-[10px] font-semibold text-rosegold-500 hover:underline flex items-center gap-0.5">
                <span>Mural Completo</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {reminders.slice(0, 3).map((r) => (
                <div key={r.id} className={cn("p-4 rounded-xl border flex flex-col justify-between space-y-2 text-xs", r.color || "bg-card border-border")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                      {r.category === "idea" ? "Ideia" : r.category === "task" ? "Tarefa" : "Lembrete"}
                    </span>
                    {r.isPinned && <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400 fill-current" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground leading-snug">{r.title}</h4>
                    {r.description && <p className="text-[11px] opacity-80 line-clamp-2 mt-1">{r.description}</p>}
                  </div>
                  {r.dueDate && (
                    <div className="flex items-center gap-1 text-[10px] opacity-75 font-mono pt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(r.dueDate)}</span>
                    </div>
                  )}
                </div>
              ))}
              {reminders.length === 0 && (
                <div className="col-span-full py-6 text-center text-muted-foreground italic text-xs">
                  Nenhum lembrete para hoje.
                </div>
              )}
            </div>
          </div>

          {/* 3c. Card de Itens na Lixeira Inteligente */}
          <div className="p-5 rounded-2xl border border-border bg-card/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Itens na Lixeira Inteligente</h3>
                  <p className="text-xs text-muted-foreground">Documentos e cadastros removidos que podem ser restaurados.</p>
                </div>
              </div>
              <Link href="/recycle-bin" className="text-[10px] font-semibold text-rosegold-500 hover:underline flex items-center gap-0.5">
                <span>Abrir Lixeira ({recycleBinItems.length})</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-background/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Total na Lixeira</span>
                <span className="text-xl font-extrabold font-mono text-foreground mt-1">{recycleBinItems.length}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-background/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Excluídos Hoje</span>
                <span className="text-xl font-extrabold font-mono text-red-500 mt-1">
                  {recycleBinItems.filter(i => i.deletedAt && i.deletedAt.startsWith(new Date().toISOString().split("T")[0])).length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-background/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Próximos de Expirar</span>
                <span className="text-xl font-extrabold font-mono text-amber-500 mt-1">0</span>
              </div>
            </div>
          </div>

          {/* 3d. Card de Relatórios Rápidos */}
          <div className="p-5 rounded-2xl border border-border bg-card/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rosegold-500/10 text-rosegold-500 border border-rosegold-500/20">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Relatórios Rápidos</h3>
                  <p className="text-xs text-muted-foreground">Atalhos diretos para os relatórios e análises mais utilizados.</p>
                </div>
              </div>
              <Link href="/reports" className="text-[10px] font-semibold text-rosegold-500 hover:underline flex items-center gap-0.5">
                <span>Central Completa</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Link href="/reports" className="p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-all space-y-1 block">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Vendas & Receita</span>
                <span className="font-semibold text-foreground truncate block">Vendas por Período</span>
              </Link>

              <Link href="/reports" className="p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-all space-y-1 block">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Financeiro</span>
                <span className="font-semibold text-foreground truncate block">Fluxo de Caixa DRE</span>
              </Link>

              <Link href="/reports" className="p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-all space-y-1 block">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Estoque</span>
                <span className="font-semibold text-foreground truncate block">Valorização de Estoque</span>
              </Link>

              <Link href="/reports" className="p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-all space-y-1 block">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Clientes</span>
                <span className="font-semibold text-foreground truncate block">Aniversariantes & Top</span>
              </Link>
            </div>
          </div>

          {/* 3e. Card de Business Intelligence (BI) */}
          <div className="p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-card/80 to-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <LineChart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Business Intelligence (BI) & Metas</h3>
                  <p className="text-xs text-muted-foreground">Indicadores estratégicos executivos, previsões preditivas e ROI.</p>
                </div>
              </div>
              <Link href="/bi" className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5">
                <span>Painel BI Completo</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-background/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Crescimento de Receita</span>
                <span className="text-xl font-extrabold font-mono text-emerald-500 mt-1">+18.4%</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-background/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Meta de Faturamento</span>
                <span className="text-xl font-extrabold font-mono text-amber-500 mt-1">73.5% Atingido</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-background/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Previsão Próximo Mês</span>
                <span className="text-xl font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(sales.reduce((s, v) => s + v.total, 0) * 1.15)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Canais de Venda Integrados */}
          <div className="p-5 rounded-2xl border border-border bg-card/30">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-rosegold-500" />
              <span>Status das Integrações SaaS</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              
              {[
                { name: "Loja Física", status: "connected", badge: "PDV" },
                { name: "E-Commerce", status: "connected", badge: "Site" },
                { name: "Shopee", status: configs.find(c => c.channel === "shopee")?.status || "disconnected", badge: "API" },
                { name: "Mercado Livre", status: configs.find(c => c.channel === "mercado_libre")?.status || "disconnected", badge: "API" },
                { name: "WhatsApp Cloud", status: configs.find(c => c.channel === "whatsapp")?.status || "disconnected", badge: "Meta" },
                { name: "Instagram Shop", status: "connected", badge: "Meta" }
              ].map((channel, idx) => {
                const isConnected = channel.status === "connected";
                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-card/50 flex flex-col justify-between h-24 hover:border-primary/20 transition-all select-none">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-foreground truncate">{channel.name}</span>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-muted text-muted-foreground tracking-wider uppercase">
                        {channel.badge}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={cn(
                        "font-semibold flex items-center gap-1",
                        isConnected ? "text-green-500" : "text-muted-foreground"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-muted")} />
                        {isConnected ? "Conectado" : "Pendente"}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// ——— Sub-components ———

function IndicatorRow({ label, value, desc, color }: { label: string; value: string; desc: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground/80 mt-0.5">{desc}</p>
      </div>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}
