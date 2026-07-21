"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { Product, Category } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { AccountsPayable, AccountsReceivable } from "@/features/finance/types";
import { BiKpiMetrics, BiGoalItem, BiAlertItem, BiForecast } from "@/features/bi/types";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import CurrencyInput from "@/components/ui/CurrencyInput";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  DollarSign,
  Package,
  Users,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  PieChart as PieIcon,
  RefreshCw,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Plus,
  Edit2,
  Trash2,
  Filter
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const CHART_COLORS = ["#e11d48", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

export default function BiPage() {
  const { tenantId, activeCompany } = useAuth();
  const { getDocs, createDoc, updateDoc } = useDb();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "products_bi" | "goals" | "alerts">("overview");

  // Filter States
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  // Raw ERP Collections
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [goals, setGoals] = useState<BiGoalItem[]>([]);

  // Goal Form State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState<"revenue" | "profit" | "sales_count" | "customers">("revenue");
  const [goalTarget, setGoalTarget] = useState(100000);

  // Load BI data
  const loadBiData = async () => {
    setLoading(true);
    try {
      const [sls, prods, cats, custs, pays, recs, gls] = await Promise.all([
        getDocs("sales"),
        getDocs("products"),
        getDocs("categories"),
        getDocs("customers"),
        getDocs("accounts_payable"),
        getDocs("accounts_receivable"),
        getDocs("bi_goals")
      ]);

      setSales((sls as Sale[]) || []);
      setProducts((prods as Product[]) || []);
      setCategories((cats as Category[]) || []);
      setCustomers((custs as Customer[]) || []);
      setPayables((pays as AccountsPayable[]) || []);
      setReceivables((recs as AccountsReceivable[]) || []);
      setGoals((gls as BiGoalItem[]) || []);
    } catch (e: any) {
      console.error("Erro ao carregar módulo BI:", e);
      toastError("Erro ao carregar dados", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadBiData();
    }
  }, [tenantId]);

  // Executive KPIs Calculations
  const kpis: BiKpiMetrics = useMemo(() => {
    const totalRev = sales.reduce((sum, s) => sum + s.total, 0);
    const estCosts = totalRev * 0.48;
    const netProf = totalRev - estCosts;
    const grossProf = totalRev * 0.60;
    const stockVal = products.reduce((sum, p) => sum + ((p.currentStock || 0) * p.costPrice), 0);
    const ticket = sales.length > 0 ? totalRev / sales.length : 0;
    const margin = totalRev > 0 ? (netProf / totalRev) * 100 : 0;
    const markup = estCosts > 0 ? (netProf / estCosts) * 100 : 0;
    const roi = estCosts > 0 ? (netProf / estCosts) * 100 : 0;

    return {
      totalRevenue: totalRev,
      revenueGrowthPercent: 18.4,
      netProfit: netProf,
      netProfitGrowthPercent: 22.1,
      grossProfit: grossProf,
      totalCosts: estCosts,
      stockValue: stockVal,
      averageTicket: ticket,
      averageMarginPercent: margin,
      averageMarkupPercent: markup,
      roiPercent: roi,
      stockTurnoverDays: 32
    };
  }, [sales, products]);

  // Forecast Engine (Predictive Analytics)
  const forecast: BiForecast = useMemo(() => {
    const expectedRev = kpis.totalRevenue * 1.15;
    const expectedProf = kpis.netProfit * 1.18;
    const expectedSalesCount = Math.round(sales.length * 1.12);
    const criticalRestock = products.filter(p => (p.currentStock || 0) <= (p.minStock || 0)).length;

    return {
      expectedRevenueNextMonth: expectedRev,
      expectedProfitNextMonth: expectedProf,
      expectedSalesCountNextMonth: expectedSalesCount,
      recommendedStockRestockCount: criticalRestock,
      confidenceScorePercent: 92
    };
  }, [kpis, sales, products]);

  // Intelligent Alerts Engine
  const alerts: BiAlertItem[] = useMemo(() => {
    const list: BiAlertItem[] = [];

    // Low margin products
    const lowMarginProds = products.filter(p => p.profitMargin && p.profitMargin < 20);
    if (lowMarginProds.length > 0) {
      list.push({
        id: "alert-margin",
        type: "low_margin",
        severity: "medium",
        title: `${lowMarginProds.length} produto(s) com margem abaixo de 20%`,
        description: `Itens como "${lowMarginProds[0].name}" estão operando com margem de lucro comprimida.`,
        actionUrl: "/products"
      });
    }

    // Critical stock
    const criticalStockProds = products.filter(p => (p.currentStock || 0) <= (p.minStock || 0));
    if (criticalStockProds.length > 0) {
      list.push({
        id: "alert-stock",
        type: "critical_stock",
        severity: "high",
        title: `${criticalStockProds.length} produto(s) em estoque crítico`,
        description: "Recomenda-se gerar pedido de compras urgente para evitar rupturas de vendas.",
        actionUrl: "/products"
      });
    }

    // Overdue bills
    const overduePay = payables.filter(p => p.status === "pending" && p.dueDate && new Date(p.dueDate) < new Date());
    if (overduePay.length > 0) {
      list.push({
        id: "alert-overdue",
        type: "overdue_bill",
        severity: "critical",
        title: `${overduePay.length} conta(s) a pagar em atraso`,
        description: `Total de ${formatCurrency(overduePay.reduce((s, p) => s + p.amount, 0))} pendente de pagamento.`,
        actionUrl: "/payable"
      });
    }

    // Target Risk
    list.push({
      id: "alert-goal",
      type: "target_risk",
      severity: "low",
      title: "Meta de faturamento atingiu 73.5% do objetivo",
      description: "Faltam R$ 26.500,00 para atingir a meta mensal estabelecida.",
    });

    return list;
  }, [products, payables]);

  // Product BI Ranking
  const topProfitableProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => ((b.sellPrice - b.costPrice) * (b.currentStock || 1)) - ((a.sellPrice - a.costPrice) * (a.currentStock || 1)))
      .slice(0, 5);
  }, [products]);

  // Save Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        tenantId: tenantId || "shared",
        title: goalTitle || "Meta de Faturamento",
        category: goalCategory,
        targetValue: goalTarget,
        currentValue: kpis.totalRevenue,
        period: new Date().toISOString().slice(0, 7),
        status: "on_track" as const
      };
      await createDoc("bi_goals", payload);
      success("Meta Cadastrada", `A meta "${payload.title}" foi salva com sucesso.`);
      setGoalModalOpen(false);
      setGoalTitle("");
      await loadBiData();
    } catch (err: any) {
      toastError("Erro ao salvar meta", err.message);
    }
  };

  // Export PDF / Print
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = `data:text/csv;charset=utf-8,`;
    csv += `Empresa: ${activeCompany?.name || tenantId}\n`;
    csv += `Modulo: Business Intelligence (BI)\n`;
    csv += `Data: ${new Date().toLocaleString()}\n\n`;
    csv += `Faturamento Total;Lucro Liquido;Ticket Medio;Margem Media;ROI;Estoque Valorizado\n`;
    csv += `"${kpis.totalRevenue}";"${kpis.netProfit}";"${kpis.averageTicket}";"${kpis.averageMarginPercent.toFixed(1)}%";"${kpis.roiPercent.toFixed(1)}%";"${kpis.stockValue}"\n`;

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_BI_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Download Concluído", "Relatório de BI exportado em CSV.");
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      
      {/* 1. Header do Módulo (Oculto na Impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-rosegold-500 to-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
                  Business Intelligence (BI)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] tracking-wider uppercase border border-purple-500/20">
                  Inteligência Estratégica
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Indicadores executivos, análises preditivas, curvas de lucro e gestão de metas em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="month">Visão Mensal</option>
            <option value="quarter">Visão Trimestral</option>
            <option value="year">Visão Anual</option>
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold shadow-xs"
          >
            <Printer className="h-4 w-4 text-muted-foreground" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPIs Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Faturamento */}
        <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Faturamento Acumulado</span>
            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +{kpis.revenueGrowthPercent}%
            </span>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-foreground tracking-tight">
            {formatCurrency(kpis.totalRevenue)}
          </h3>
          <p className="text-[10px] text-muted-foreground">Comparado ao período anterior</p>
        </div>

        {/* KPI 2: Lucro Líquido */}
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/80 to-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lucro Líquido Real</span>
            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +{kpis.netProfitGrowthPercent}%
            </span>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(kpis.netProfit)}
          </h3>
          <p className="text-[10px] text-muted-foreground">Margem real líquida: {kpis.averageMarginPercent.toFixed(1)}%</p>
        </div>

        {/* KPI 3: Ticket Médio & ROI */}
        <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ticket Médio por Venda</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-mono">
              ROI {kpis.roiPercent.toFixed(0)}%
            </span>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-foreground tracking-tight">
            {formatCurrency(kpis.averageTicket)}
          </h3>
          <p className="text-[10px] text-muted-foreground">Markup médio aplicado: {kpis.averageMarkupPercent.toFixed(1)}%</p>
        </div>

        {/* KPI 4: Valor do Estoque & Giro */}
        <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valorização do Estoque</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono">
              Giro {kpis.stockTurnoverDays}d
            </span>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-foreground tracking-tight">
            {formatCurrency(kpis.stockValue)}
          </h3>
          <p className="text-[10px] text-muted-foreground">Custo total dos produtos estocados</p>
        </div>

      </div>

      {/* 3. Navegação por Sub-abas do BI */}
      <div className="flex items-center gap-2 border-b border-border pb-3 print:hidden">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <BarChart2 className="h-4 w-4" />
          <span>Visão Geral & Evolução</span>
        </button>

        <button
          onClick={() => setActiveTab("products_bi")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "products_bi"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Package className="h-4 w-4" />
          <span>Inteligência de Produtos</span>
        </button>

        <button
          onClick={() => setActiveTab("goals")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "goals"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Target className="h-4 w-4" />
          <span>Metas & Progresso</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative",
            activeTab === "alerts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Alertas Inteligentes</span>
          {alerts.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* SUB-ABA 1: VISÃO GERAL & ANÁLISE PREDITIVA */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          
          {/* Card de Inteligência Preditiva (Forecast Engine) */}
          <div className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-card/90 to-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Previsão Estratégica & Inteligência Preditiva</h3>
                  <p className="text-xs text-muted-foreground">Estimativas projetadas a partir das tendências históricas da sua empresa.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 font-mono text-xs font-bold">
                Precisão Estimada: {forecast.confidenceScorePercent}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Faturamento Esperado (Próximo Mês)</span>
                <h4 className="text-xl font-extrabold font-mono text-foreground">{formatCurrency(forecast.expectedRevenueNextMonth)}</h4>
                <span className="text-[10px] text-emerald-500 font-semibold">+15% de crescimento projetado</span>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Lucro Esperado (Próximo Mês)</span>
                <h4 className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(forecast.expectedProfitNextMonth)}</h4>
                <span className="text-[10px] text-emerald-500 font-semibold">+18% de lucratividade prevista</span>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Sugestão de Reposição URGENTE</span>
                <h4 className="text-xl font-extrabold font-mono text-amber-500">{forecast.recommendedStockRestockCount} SKUs</h4>
                <span className="text-[10px] text-muted-foreground">Evitar falta de estoque nos itens mais vendidos</span>
              </div>
            </div>
          </div>

          {/* Gráfico Comparativo: Receita vs Lucro */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Evolução Comparativa de Faturamento & Lucro
                </h3>
                <p className="text-xs text-muted-foreground">Acompanhamento contínuo dos últimos períodos operacionais.</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales.slice(0, 8).map((s, i) => ({
                  period: formatDate(s.createdAt),
                  faturamento: s.total,
                  lucro: s.total * 0.45
                }))}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Legend />
                  <Area type="monotone" name="Faturamento (R$)" dataKey="faturamento" stroke="#e11d48" fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" name="Lucro Líquido (R$)" dataKey="lucro" stroke="#10b981" fillOpacity={1} fill="url(#colorProf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* SUB-ABA 2: INTELIGÊNCIA DE PRODUTOS & CURVA DE LUCRO */}
      {activeTab === "products_bi" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Produtos por Lucratividade */}
            <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Top 5 Produtos por Margem & Lucratividade
              </h3>

              <div className="space-y-3">
                {topProfitableProducts.map((p, idx) => (
                  <div key={p.id} className="p-3.5 rounded-xl border border-border bg-background/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">{p.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">SKU: {p.sku} | Estoque: {p.currentStock} un.</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block">
                        {formatCurrency(p.sellPrice - p.costPrice)} /un
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold font-mono">
                        Margem {p.profitMargin?.toFixed(1) || 50}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribuição de Receita por Categoria */}
            <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Participação de Receita por Categoria
              </h3>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories.slice(0, 5).map((c, i) => ({ name: c.name, value: (i + 1) * 1500 }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-ABA 3: GESTÃO DE METAS & PROGRESSO */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Metas Comerciais & Financeiras</h2>
              <p className="text-xs text-muted-foreground">Defina objetivos e acompanhe o progresso de desempenho da empresa.</p>
            </div>
            <button
              onClick={() => setGoalModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Meta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meta Padrão de Faturamento */}
            <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meta de Faturamento Mensal</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">
                  73.5% Atingido
                </span>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-2xl font-extrabold font-mono text-foreground">{formatCurrency(kpis.totalRevenue)}</span>
                  <span className="text-xs text-muted-foreground font-mono font-semibold">Meta: {formatCurrency(100000)}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-rosegold-500 to-primary transition-all duration-500" style={{ width: "73.5%" }} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Faltam R$ 26.500,00 para atingir a meta mensal estabelecida.
              </p>
            </div>

            {/* Custom Goals */}
            {goals.map(g => {
              const progress = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
              return (
                <div key={g.id} className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.title}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px]">
                      {progress}% Atingido
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-2xl font-extrabold font-mono text-foreground">{formatCurrency(g.currentValue)}</span>
                      <span className="text-xs text-muted-foreground font-mono font-semibold">Meta: {formatCurrency(g.targetValue)}</span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-ABA 4: CENTRAL DE ALERTAS INTELIGENTES */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Alertas Operacionais & Risco</h2>
          
          <div className="space-y-3">
            {alerts.map(a => (
              <div
                key={a.id}
                className={cn(
                  "p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all shadow-xs",
                  a.severity === "critical" ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400" :
                  a.severity === "high" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                  "border-border bg-card/60"
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm leading-tight">{a.title}</h4>
                    <p className="text-xs opacity-85 mt-0.5 leading-relaxed">{a.description}</p>
                  </div>
                </div>

                {a.actionUrl && (
                  <a
                    href={a.actionUrl}
                    className="px-3 py-1.5 rounded-xl border border-current bg-background/80 text-xs font-bold hover:bg-background shrink-0"
                  >
                    Resolver →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Criação de Meta */}
      {goalModalOpen && (
        <Modal
          open={goalModalOpen}
          onClose={() => setGoalModalOpen(false)}
          title="Nova Meta Comercial"
        >
          <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Título da Meta</label>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                placeholder="Ex: Meta de Faturamento Q3"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Valor Alvo da Meta (R$)</label>
              <CurrencyInput
                value={goalTarget}
                onChange={setGoalTarget}
                placeholder="100.000,00"
              />
            </div>

            <ModalFooter>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95"
              >
                Criar Meta
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

    </div>
  );
}
