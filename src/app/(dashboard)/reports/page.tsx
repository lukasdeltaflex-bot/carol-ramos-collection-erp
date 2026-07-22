"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { Product, Category } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { getCustomerVipTier } from "@/features/customers/utils";
import { AccountsPayable, AccountsReceivable } from "@/features/finance/types";
import { ReportCategory, ReportDefinition, ScheduledReport } from "@/features/reports/types";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
  Calendar,
  Star,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronRight,
  Clock,
  Layers,
  Building2,
  PieChart as PieIcon,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Mail
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

// Catalog of available reports
const REPORT_CATALOG: ReportDefinition[] = [
  // Vendas
  { id: "sales_period", category: "sales", title: "Vendas por Período & Faturamento", description: "Relatório de faturamento, total de vendas, ticket médio e gráfico evolutivo.", iconName: "TrendingUp" },
  { id: "sales_products", category: "sales", title: "Produtos Mais e Menos Vendidos", description: "Ranking de itens com maior volume de vendas e receitas geradas.", iconName: "Package" },
  { id: "sales_payment", category: "sales", title: "Vendas por Forma de Pagamento", description: "Detalhamento de receita por PIX, Cartão, Boleto e Dinheiro.", iconName: "DollarSign" },
  
  // Produtos & Estoque
  { id: "stock_summary", category: "products", title: "Posição Geral do Estoque & Valorização", description: "Valor de custo, valor de venda e margem potencial estocada.", iconName: "Package" },
  { id: "stock_critical", category: "products", title: "Produtos Críticos e Estoque Baixo", description: "Itens com saldo zerado ou abaixo do estoque mínimo de segurança.", iconName: "AlertTriangle" },
  { id: "stock_categories", category: "products", title: "Produtos por Categoria", description: "Distribuição da linha de produtos e saldo por categoria.", iconName: "Layers" },

  // Financeiro
  { id: "fin_cashflow", category: "finance", title: "Fluxo de Caixa & DRE Sintético", description: "Demonstrativo entre Entradas (Receitas) e Saídas (Despesas).", iconName: "BarChart2" },
  { id: "fin_payables", category: "finance", title: "Contas a Pagar & Inadimplência", description: "Títulos a pagar pendentes, vencidos e liquidados por fornecedor.", iconName: "TrendingDown" },
  { id: "fin_receivables", category: "finance", title: "Contas a Receber", description: "Valores a receber futuros e recebimentos em atraso.", iconName: "TrendingUp" },

  // Clientes
  { id: "cust_top", category: "customers", title: "Ranking dos Melhores Clientes", description: "Clientes com maior valor total de compras e ticket médio.", iconName: "Users" },
  { id: "cust_birthdays", category: "customers", title: "Aniversariantes do Mês", description: "Lista de clientes que fazem aniversário no período.", iconName: "Calendar" },

  // Fornecedores & Compras
  { id: "supp_summary", category: "suppliers", title: "Fornecedores & Histórico de Suprimentos", description: "Relação de fornecedores cadastrados e volume de compras.", iconName: "Truck" },
  
  // Empresas (Multi-Tenant Admin)
  { id: "comp_summary", category: "companies", title: "Desempenho por Empresa (Multi-Tenant)", description: "Comparativo de faturamento e cadastros entre empresas.", iconName: "Building2", rolesAllowed: ["owner", "admin"] },
];

const PIE_COLORS = ["#e11d48", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#64748b"];

export default function ReportsPage() {
  const { profile, role, tenantId, activeCompany } = useAuth();
  const { getDocs, createDoc, updateDoc } = useDb();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"catalog" | "report_view" | "scheduled">("catalog");
  const [selectedReportId, setSelectedReportId] = useState<string>("sales_period");

  // Data Collections
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [scheduledList, setScheduledList] = useState<ScheduledReport[]>([]);

  // Filter States
  const [period, setPeriod] = useState<string>("this_month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("report_favorites");
      return saved ? JSON.parse(saved) : ["sales_period", "fin_cashflow", "stock_summary"];
    }
    return ["sales_period", "fin_cashflow", "stock_summary"];
  });

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedFreq, setSchedFreq] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [schedEmail, setSchedEmail] = useState(profile?.email || "");

  // Load all ERP data
  const loadData = async () => {
    setLoading(true);
    try {
      const [sls, prods, cats, custs, supps, pays, recs, scheds] = await Promise.all([
        getDocs("sales"),
        getDocs("products"),
        getDocs("categories"),
        getDocs("customers"),
        getDocs("suppliers"),
        getDocs("accounts_payable"),
        getDocs("accounts_receivable"),
        getDocs("scheduled_reports")
      ]);

      setSales((sls as Sale[]) || []);
      setProducts((prods as Product[]) || []);
      setCategories((cats as Category[]) || []);
      setCustomers((custs as Customer[]) || []);
      setSuppliers((supps as any[]) || []);
      setPayables((pays as AccountsPayable[]) || []);
      setReceivables((recs as AccountsReceivable[]) || []);
      setScheduledList((scheds as ScheduledReport[]) || []);
    } catch (e: any) {
      console.error("Erro ao carregar relatórios:", e);
      toastError("Erro ao carregar dados", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  // Toggle Favorite
  const toggleFavorite = (reportId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId];
      if (typeof window !== "undefined") {
        localStorage.setItem("report_favorites", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Open a specific report view
  const openReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setActiveTab("report_view");
  };

  // Date filtering logic helper
  const filterByDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const now = new Date();
    
    if (period === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (period === "yesterday") {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }
    if (period === "7days") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return d >= past;
    }
    if (period === "30days") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      return d >= past;
    }
    if (period === "this_month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      return d >= start && d <= end;
    }
    return true;
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchDate = filterByDateRange(s.createdAt);
      const matchPayment = selectedCatId === "all" || s.paymentMethod === selectedCatId;
      return matchDate && matchPayment;
    });
  }, [sales, period, startDate, endDate, selectedCatId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCatId === "all" || p.categoryId === selectedCatId;
      const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
      return matchCat && matchStatus;
    });
  }, [products, selectedCatId, selectedStatus]);

  // Export CSV / Excel
  const handleExportCSV = () => {
    const activeRep = REPORT_CATALOG.find(r => r.id === selectedReportId);
    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `Empresa: ${activeCompany?.name || tenantId}\n`;
    csvContent += `Relatorio: ${activeRep?.title || "Relatorio ERP"}\n`;
    csvContent += `Gerado por: ${profile?.displayName || profile?.email || "Usuario"}\n`;
    csvContent += `Data: ${new Date().toLocaleString()}\n\n`;

    if (selectedReportId.startsWith("sales")) {
      csvContent += `ID Venda;Data;Cliente;Canal;Forma Pagamento;Total (R$)\n`;
      filteredSales.forEach(s => {
        const custName = customers.find(c => c.id === s.customerId)?.name || "Consumidor Final";
        csvContent += `"${s.id}";"${formatDate(s.createdAt)}";"${custName}";"${s.channel || "PDV"}";"${s.paymentMethod}";"${s.total}"\n`;
      });
    } else if (selectedReportId.startsWith("stock") || selectedReportId.startsWith("product")) {
      csvContent += `SKU;Nome;Categoria;Estoque Atual;Estoque Minimo;Custo Fornecedor (R$);Frete (R$);Outras Despesas (R$);Custo Total Aquisicao (R$);Preco Venda (R$);Lucro Unitario (R$);Margem (%)\n`;
      filteredProducts.forEach(p => {
        const catName = categories.find(c => c.id === p.categoryId)?.name || "Geral";
        const realCost = p.totalAcquisitionCost && p.totalAcquisitionCost > 0 ? p.totalAcquisitionCost : p.costPrice;
        const frete = p.freightCost || 0;
        const outras = (p.insuranceCost || 0) + (p.taxCost || 0) + (p.otherExpenses || 0);
        const unitProfit = p.sellPrice - realCost;
        csvContent += `"${p.sku}";"${p.name}";"${catName}";"${p.currentStock}";"${p.minStock}";"${p.costPrice}";"${frete}";"${outras}";"${realCost}";"${p.sellPrice}";"${unitProfit.toFixed(2)}";"${p.profitMargin || 0}"\n`;
      });
    } else if (selectedReportId.startsWith("fin")) {
      csvContent += `Tipo;Descricao;Valor (R$);Vencimento/Data;Status\n`;
      payables.forEach(p => {
        csvContent += `"Conta a Pagar";"${p.description}";"${p.amount}";"${p.dueDate}";"${p.status}"\n`;
      });
      receivables.forEach(r => {
        csvContent += `"Conta a Receber";"${r.description}";"${r.amount}";"${r.dueDate}";"${r.status}"\n`;
      });
    } else if (selectedReportId.startsWith("cust")) {
      csvContent += `Nome;Email;Telefone;Total Pedidos;Total Gasto (R$);Classificacao VIP\n`;
      customers.forEach(c => {
        const vip = getCustomerVipTier(c);
        csvContent += `"${c.name}";"${c.email || ""}";"${c.phone}";"${c.metrics?.totalOrders || 0}";"${c.metrics?.totalSpent || 0}";"${vip.label}"\n`;
      });
    } else if (selectedReportId.startsWith("supp")) {
      csvContent += `Razao Social;CNPJ;Email;Telefone;Cidade;CarroChefe_Especialidade\n`;
      suppliers.forEach(s => {
        csvContent += `"${s.name}";"${s.cnpj || ""}";"${s.email || ""}";"${s.phone || ""}";"${s.address?.city || ""}";"${s.specialty || s.category || ""}"\n`;
      });
    } else {
      csvContent += `SKU;Nome;Categoria;Estoque;Preco Venda\n`;
      filteredProducts.forEach(p => {
        csvContent += `"${p.sku}";"${p.name}";"${p.categoryId}";"${p.currentStock}";"${p.sellPrice}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_${selectedReportId}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Download Concluído", "O relatório em planilha CSV/Excel foi exportado com sucesso!");
  };

  // Export Excel (.xlsx table text file)
  const handleExportExcel = () => {
    handleExportCSV();
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Save Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedEmail) return;
    try {
      const activeRep = REPORT_CATALOG.find(r => r.id === selectedReportId);
      const payload = {
        tenantId: tenantId || "shared",
        reportId: selectedReportId,
        reportTitle: activeRep?.title || "Relatório",
        frequency: schedFreq,
        recipients: [schedEmail],
        format: "pdf" as const,
        active: true,
        nextRunDate: new Date(Date.now() + 86400000).toISOString()
      };
      await createDoc("scheduled_reports", payload);
      success("Agendamento Salvo", `O relatório será enviado (${schedFreq}) para ${schedEmail}.`);
      setScheduleModalOpen(false);
      await loadData();
    } catch (err: any) {
      toastError("Erro ao agendar", err.message);
    }
  };

  const selectedReportObj = REPORT_CATALOG.find(r => r.id === selectedReportId);

  return (
    <div className="space-y-6 pb-12 print:p-0">
      
      {/* 1. Header do Módulo (Oculto na Impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rosegold-600 to-rosegold-400 text-white flex items-center justify-center shadow-md shadow-rosegold-500/20">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
                Central de Relatórios Profissionais
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Relatórios consolidados, gráficos interativos e exportação em PDF/Excel para a empresa {activeCompany?.name || tenantId}.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all select-none",
              activeTab === "catalog"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Layers className="h-4 w-4" />
            <span>Catálogo de Relatórios</span>
          </button>

          {activeTab === "report_view" && (
            <button
              onClick={() => setActiveTab("report_view")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm select-none"
            >
              <FileText className="h-4 w-4" />
              <span>{selectedReportObj?.title || "Visualizar Relatório"}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("scheduled")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all select-none",
              activeTab === "scheduled"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Clock className="h-4 w-4" />
            <span>Relatórios Agendados</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CATÁLOGO DE RELATÓRIOS & FAVORITOS */}
      {activeTab === "catalog" && (
        <div className="space-y-8">
          
          {/* Seção 1: Relatórios Favoritos */}
          {favorites.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>⭐ Relatórios Favoritos</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {favorites.map(favId => {
                  const rep = REPORT_CATALOG.find(r => r.id === favId);
                  if (!rep) return null;
                  return (
                    <div
                      key={rep.id}
                      className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between space-y-4 group cursor-pointer"
                      onClick={() => openReport(rep.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <BarChart2 className="h-4.5 w-4.5" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(rep.id);
                          }}
                          className="p-1 text-amber-500 hover:scale-110 transition-all"
                        >
                          <Star className="h-4 w-4 fill-amber-500" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {rep.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                          {rep.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-bold text-primary">
                        <span>Gerar Relatório</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção 2: Todas as Categorias de Relatórios */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-rosegold-500" />
              <span>Todos os Relatórios Disponíveis</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORT_CATALOG.map(rep => {
                const isFav = favorites.includes(rep.id);
                return (
                  <div
                    key={rep.id}
                    className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl hover:border-primary/30 hover:bg-card transition-all shadow-xs flex flex-col justify-between space-y-4 group cursor-pointer"
                    onClick={() => openReport(rep.id)}
                  >
                    <div className="flex items-start justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        {rep.category === "sales" ? "Vendas" : rep.category === "products" ? "Estoque" : rep.category === "finance" ? "Financeiro" : rep.category === "customers" ? "Clientes" : rep.category === "suppliers" ? "Fornecedores" : "Geral"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(rep.id);
                        }}
                        className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
                      >
                        <Star className={cn("h-4 w-4", isFav && "text-amber-500 fill-amber-500")} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {rep.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {rep.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
                      <span>Visualizar Relatório</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: VISUALIZAÇÃO E EMISSÃO DO RELATÓRIO SELECIONADO */}
      {activeTab === "report_view" && (
        <div className="space-y-6">
          
          {/* Header da Impressão (Apenas visível ao imprimir) */}
          <div className="hidden print:block space-y-2 border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold uppercase tracking-tight text-black">{activeCompany?.name || tenantId}</h1>
              <span className="text-xs text-gray-600">ERP Carol Ramos Collection</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-700">
              <span className="font-bold">{selectedReportObj?.title}</span>
              <span>Gerado em: {new Date().toLocaleString()} | Usuário: {profile?.displayName || profile?.email || "Admin"}</span>
            </div>
          </div>

          {/* Barra de Ações & Exportação (Oculto na Impressão) */}
          <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("catalog")}
                className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold"
              >
                ← Voltar ao Catálogo
              </button>
              <h2 className="text-sm font-bold text-foreground truncate">{selectedReportObj?.title}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Exportar Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={() => setScheduleModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-sm"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Agendar Envio</span>
              </button>
            </div>
          </div>

          {/* Filtros Avançados Combináveis (Oculto na Impressão) */}
          <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-3 print:hidden">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">Filtros Avançados Combináveis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Período de Análise</label>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background font-semibold"
                >
                  <option value="today">Hoje</option>
                  <option value="yesterday">Ontem</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="this_month">Este Mês</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {period === "custom" && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Data Final</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Categoria de Produtos</label>
                <select
                  value={selectedCatId}
                  onChange={e => setSelectedCatId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background font-semibold"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status do Registro</label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background font-semibold"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Metric Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Faturamento Total</span>
              <h3 className="text-2xl font-extrabold font-mono text-foreground mt-1">
                {formatCurrency(filteredSales.reduce((sum, s) => sum + s.total, 0))}
              </h3>
              <span className="text-[10px] text-green-500 font-semibold mt-1 block">Baseado nas vendas filtradas</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total de Vendas / Pedidos</span>
              <h3 className="text-2xl font-extrabold font-mono text-foreground mt-1">
                {filteredSales.length} pedidos
              </h3>
              <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">
                Ticket Médio: {formatCurrency(filteredSales.length > 0 ? filteredSales.reduce((sum, s) => sum + s.total, 0) / filteredSales.length : 0)}
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Lucro Líquido Estimado</span>
              <h3 className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(filteredSales.reduce((sum, s) => sum + (s.total * 0.45), 0))}
              </h3>
              <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">Margem média estimada de 45%</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total de Itens em Estoque</span>
              <h3 className="text-2xl font-extrabold font-mono text-foreground mt-1">
                {filteredProducts.reduce((sum, p) => sum + (p.currentStock || 0), 0)} un.
              </h3>
              <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">
                Valor Total de Estoque (Custo Real): {formatCurrency(filteredProducts.reduce((sum, p) => {
                  const realCost = p.totalAcquisitionCost && p.totalAcquisitionCost > 0 ? p.totalAcquisitionCost : p.costPrice;
                  return sum + ((p.currentStock || 0) * realCost);
                }, 0))}
              </span>
            </div>
          </div>

          {/* Gráfico Interativo de Desempenho */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-4 print:hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Gráfico Evolutivo de Receita & Vendas
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredSales.slice(0, 10).map((s, i) => ({ date: formatDate(s.createdAt), total: s.total }))}>
                  <defs>
                    <linearGradient id="colorReportSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorReportSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Detalhada de Resultados */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Detalhamento dos Registros</h3>
              <span className="text-xs text-muted-foreground font-mono">Total de registros: {selectedReportId.startsWith("sales") ? filteredSales.length : filteredProducts.length}</span>
            </div>

            <div className="overflow-x-auto">
              {selectedReportId.startsWith("sales") ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th className="p-3.5">ID Venda</th>
                      <th className="p-3.5">Data & Hora</th>
                      <th className="p-3.5">Canal</th>
                      <th className="p-3.5">Pagamento</th>
                      <th className="p-3.5 text-right">Valor Total</th>
                      <th className="p-3.5 text-right">Lucro Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {filteredSales.map(s => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-bold text-foreground">{s.id.slice(-6)}</td>
                        <td className="p-3.5 text-muted-foreground">{formatDate(s.createdAt)}</td>
                        <td className="p-3.5 font-semibold text-foreground uppercase">{s.channel}</td>
                        <td className="p-3.5 text-muted-foreground capitalize">{s.paymentMethod}</td>
                        <td className="p-3.5 text-right font-bold text-foreground">{formatCurrency(s.total)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.total * 0.45)}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground italic">Nenhuma venda encontrada para os filtros selecionados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th className="p-3.5">SKU</th>
                      <th className="p-3.5">Nome do Produto</th>
                      <th className="p-3.5 text-center">Estoque</th>
                      <th className="p-3.5 text-right">Custo Forn.</th>
                      <th className="p-3.5 text-right">Frete/Despesas</th>
                      <th className="p-3.5 text-right">Custo Total</th>
                      <th className="p-3.5 text-right">Preço Venda</th>
                      <th className="p-3.5 text-right">Lucro Un.</th>
                      <th className="p-3.5 text-center">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {filteredProducts.map(p => {
                      const realCost = p.totalAcquisitionCost && p.totalAcquisitionCost > 0 ? p.totalAcquisitionCost : p.costPrice;
                      const freteOuOutros = Math.max(0, realCost - p.costPrice);
                      const unitProfit = p.sellPrice - realCost;

                      return (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3.5 font-bold text-foreground">{p.sku}</td>
                          <td className="p-3.5 font-sans font-semibold text-foreground">{p.name}</td>
                          <td className="p-3.5 text-center font-bold">{p.currentStock || 0} un.</td>
                          <td className="p-3.5 text-right text-muted-foreground">{formatCurrency(p.costPrice)}</td>
                          <td className="p-3.5 text-right text-muted-foreground">{formatCurrency(freteOuOutros)}</td>
                          <td className="p-3.5 text-right font-bold text-foreground">{formatCurrency(realCost)}</td>
                          <td className="p-3.5 text-right font-bold text-foreground">{formatCurrency(p.sellPrice)}</td>
                          <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(unitProfit)}</td>
                          <td className="p-3.5 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              p.profitMargin >= 50 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            )}>
                              {p.profitMargin || 0}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-muted-foreground italic">Nenhum produto encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: RELATÓRIOS AGENDADOS */}
      {activeTab === "scheduled" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Relatórios Agendados</h2>
              <p className="text-xs text-muted-foreground">Envio automático periódico por e-mail em formato PDF ou Excel.</p>
            </div>
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledList.map(item => (
              <div key={item.id} className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                    {item.frequency === "daily" ? "Diário" : item.frequency === "weekly" ? "Semanal" : "Mensal"}
                  </span>
                  <span className="text-[10px] text-green-500 font-bold">Ativo</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{item.reportTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Destinatário: {item.recipients?.[0]}</p>
                </div>
              </div>
            ))}
            {scheduledList.length === 0 && (
              <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                Nenhum relatório agendado. Clique em "+ Novo Agendamento" para configurar envios automáticos por e-mail.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Agendamento */}
      {scheduleModalOpen && (
        <Modal
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          title="Agendar Envio Automático de Relatório"
        >
          <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Relatório Selecionado</label>
              <input
                type="text"
                disabled
                value={selectedReportObj?.title || "Vendas por Período"}
                className="w-full px-3 py-2 rounded-xl border border-border bg-muted/40 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Frequência de Envio</label>
              <select
                value={schedFreq}
                onChange={e => setSchedFreq(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background font-semibold"
              >
                <option value="daily">Diário (Todo dia às 08:00)</option>
                <option value="weekly">Semanal (Toda Segunda-feira)</option>
                <option value="monthly">Mensal (Todo dia 1º)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">E-mail Destinatário</label>
              <input
                type="email"
                required
                value={schedEmail}
                onChange={e => setSchedEmail(e.target.value)}
                placeholder="seuemail@empresa.com.br"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background font-semibold"
              />
            </div>

            <ModalFooter>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95"
              >
                Salvar Agendamento
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

    </div>
  );
}
