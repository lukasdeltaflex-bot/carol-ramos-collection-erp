"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { AccountsReceivable } from "@/features/finance/types";
import { IntegrationConfig } from "@/features/integrations/types";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Globe
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
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { profile, tenantId } = useAuth();
  const { getDocs } = useDb();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [prods, sls, recs, confs] = await Promise.all([
        getDocs("products"),
        getDocs("sales"),
        getDocs("accounts_receivable"),
        getDocs("integration_configs")
      ]);

      setProducts(prods as Product[]);
      setSales(sls as Sale[]);
      setReceivables(recs as AccountsReceivable[]);
      setConfigs(confs as IntegrationConfig[]);
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  const todayStats = getTodayStats();

  // 2. Itens Críticos (Estoque crítico ou abaixo do mínimo de reposição)
  const criticalItemsCount = products.filter(p => p.currentStock <= 5).length;

  // 3. Contas a Receber Pendentes
  const totalReceivables = receivables
    .filter(r => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0);

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

  const chartData = getChartData();

  // 5. Últimas 5 Vendas Dinâmicas
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

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
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Carregando painel analítico...</div>
      ) : (
        <>
          {/* 2. Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
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
                  R$ {todayStats.revenueToday.toFixed(2)}
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

            {/* Card 4: Contas a Receber */}
            <div className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col justify-between h-36 relative group hover:border-rosegold-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contas a Receber</span>
                <div className="p-2 rounded-xl bg-rosegold-100 dark:bg-rosegold-950/30 text-rosegold-600 dark:text-rosegold-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight font-mono">
                  R$ {totalReceivables.toFixed(2)}
                </h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <span>Pendências gerais ativas</span>
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
                        <span className="text-xs font-bold text-foreground font-mono">R$ {sale.total.toFixed(2)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</span>
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
