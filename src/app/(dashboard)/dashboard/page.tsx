"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { AccountsReceivable } from "@/features/finance/types";
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
  BarChart2
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [prods, sls, custs, recs, confs] = await Promise.all([
        getDocs("products"),
        getDocs("sales"),
        getDocs("customers"),
        getDocs("accounts_receivable"),
        getDocs("integration_configs")
      ]);

      setProducts(prods as Product[]);
      setSales(sls as Sale[]);
      setCustomers(custs as Customer[]);
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
  const topProducts = getTopProducts();

  // 6. Últimas 5 Vendas Dinâmicas
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // 7. Ticket Médio
  const ticketMedio = sales.length > 0
    ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length
    : 0;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
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
                  value={`R$ ${ticketMedio.toFixed(2)}`}
                  desc="Média por venda registrada"
                  color="text-emerald-600 dark:text-emerald-400"
                />
                <IndicatorRow
                  label="Total em Vendas"
                  value={`R$ ${sales.reduce((s, v) => s + v.total, 0).toFixed(2)}`}
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
                  value={`R$ ${totalReceivables.toFixed(2)}`}
                  desc="Pendências de recebimento em aberto"
                  color="text-amber-600 dark:text-amber-400"
                />
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
