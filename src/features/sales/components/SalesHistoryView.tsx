import React, { useState, useMemo } from "react";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { formatCurrency } from "@/lib/utils";
import { isToday, isSameDay } from "@/lib/date";
import {
  Search,
  Filter,
  Eye,
  Edit2,
  XCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  RotateCcw,
  ShoppingBag,
  User,
  ArrowUpDown
} from "lucide-react";

interface SalesHistoryViewProps {
  sales: Sale[];
  customers: Customer[];
  onViewDetails: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onCancelSale: (sale: Sale) => void;
  onNewSale: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  customers,
  onViewDetails,
  onEditSale,
  onCancelSale,
  onNewSale
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");

  // Helper map para encontrar o nome do cliente
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => map.set(c.id, c.name));
    return map;
  }, [customers]);

  // Filtragem
  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales
      .filter(sale => {
        // Filtro de status
        if (statusFilter !== "all" && sale.status !== statusFilter) return false;

        // Filtro de data
        if (dateFilter === "today") {
          if (!isToday(sale.createdAt)) return false;
        } else if (dateFilter === "7days") {
          const saleDate = new Date(sale.createdAt);
          const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateFilter === "30days") {
          const saleDate = new Date(sale.createdAt);
          const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }

        // Filtro de texto (ID, Nome do Cliente, Itens)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesId = sale.id.toLowerCase().includes(q);
          const custName = (customerMap.get(sale.customerId || "") || "Cliente").toLowerCase();
          const matchesCust = custName.includes(q);
          const matchesItem = sale.items.some(i => i.name.toLowerCase().includes(q));
          if (!matchesId && !matchesCust && !matchesItem) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, statusFilter, dateFilter, searchQuery, customerMap]);

  // KPIs
  const completedSales = useMemo(() => sales.filter(s => s.status === "completed"), [sales]);
  const cancelledSales = useMemo(() => sales.filter(s => s.status === "cancelled"), [sales]);
  
  const totalRevenue = useMemo(() => {
    return completedSales.reduce((sum, s) => sum + s.total, 0);
  }, [completedSales]);

  const totalCancelledRevenue = useMemo(() => {
    return cancelledSales.reduce((sum, s) => sum + s.total, 0);
  }, [cancelledSales]);

  const averageTicket = completedSales.length > 0 ? totalRevenue / completedSales.length : 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        
        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vendas Concluídas
            </span>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(totalRevenue)}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {completedSales.length} {completedSales.length === 1 ? "venda ativa" : "vendas ativas"}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket Médio
            </span>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(averageTicket)}
            </p>
            <span className="text-[11px] text-muted-foreground">
              Por pedido concluído
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vendas Canceladas
            </span>
            <p className="text-xl font-bold font-mono text-red-500">
              {formatCurrency(totalCancelledRevenue)}
            </p>
            <span className="text-[11px] text-red-500 font-medium">
              {cancelledSales.length} {cancelledSales.length === 1 ? "cancelamento" : "cancelamentos"}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <RotateCcw className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Registradas
            </span>
            <p className="text-xl font-bold font-mono text-foreground">
              {sales.length}
            </p>
            <button
              onClick={onNewSale}
              className="text-[11px] text-primary hover:underline font-semibold"
            >
              + Abrir Nova Venda
            </button>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rosegold-500/10 text-rosegold-500 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 2. Barra de Filtros e Busca */}
      <div className="p-3 rounded-2xl border border-border bg-card/40 backdrop-blur flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por ID, cliente ou produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Filtro Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Todos os Status</option>
            <option value="completed">Apenas Concluídas</option>
            <option value="cancelled">Apenas Canceladas</option>
          </select>

          {/* Filtro Data */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Todas as Datas</option>
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
          </select>
        </div>

      </div>

      {/* 3. Tabela de Vendas */}
      <div className="flex-1 min-h-0 border border-border rounded-2xl bg-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border sticky top-0 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold z-10 backdrop-blur">
              <tr>
                <th className="p-3.5">Data / Hora</th>
                <th className="p-3.5">ID Venda</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Canal</th>
                <th className="p-3.5">Itens</th>
                <th className="p-3.5">Pagamento</th>
                <th className="p-3.5 text-right">Total</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground space-y-2">
                    <ShoppingBag className="h-8 w-8 mx-auto opacity-30" />
                    <p className="font-medium text-xs">Nenhuma venda encontrada com os filtros selecionados.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isCancelled = sale.status === "cancelled";
                  const clientName = customerMap.get(sale.customerId || "") || "Cliente Balcão";
                  const itemsSummary = sale.items
                    .map(i => `${i.quantity}x ${i.name}`)
                    .join(", ");

                  return (
                    <tr 
                      key={sale.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isCancelled ? "opacity-60 bg-red-500/[0.02]" : ""
                      }`}
                    >
                      {/* Data / Hora */}
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {new Date(sale.createdAt).toLocaleDateString("pt-BR")}{" "}
                        <span className="text-[10px] opacity-70">
                          {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      {/* ID */}
                      <td className="p-3.5 font-mono text-foreground font-semibold whitespace-nowrap">
                        #{sale.id.slice(0, 8)}
                      </td>

                      {/* Cliente */}
                      <td className="p-3.5 font-medium text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{clientName}</span>
                        </div>
                      </td>

                      {/* Canal */}
                      <td className="p-3.5 whitespace-nowrap uppercase text-[10px] font-semibold text-muted-foreground">
                        {sale.channel || "PDV"}
                      </td>

                      {/* Itens */}
                      <td className="p-3.5 max-w-xs truncate text-muted-foreground" title={itemsSummary}>
                        {itemsSummary}
                      </td>

                      {/* Pagamento */}
                      <td className="p-3.5 whitespace-nowrap uppercase text-[10px] font-semibold text-muted-foreground">
                        {sale.paymentMethod === "credit_card" && "Cartão Crédito"}
                        {sale.paymentMethod === "debit_card" && "Cartão Débito"}
                        {sale.paymentMethod === "pix" && "PIX"}
                        {sale.paymentMethod === "cash" && "Dinheiro"}
                        {sale.paymentMethod === "term" && "Crediário"}
                        {sale.paymentMethod === "split" && "Misto"}
                      </td>

                      {/* Total */}
                      <td className={`p-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        isCancelled ? "text-muted-foreground line-through" : "text-foreground"
                      }`}>
                        {formatCurrency(sale.total)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          isCancelled
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {isCancelled ? (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Cancelada</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Concluída</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Visualizar */}
                          <button
                            onClick={() => onViewDetails(sale)}
                            title="Ver detalhes da venda"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Editar (apenas ativas) */}
                          <button
                            onClick={() => onEditSale(sale)}
                            disabled={isCancelled}
                            title={isCancelled ? "Venda cancelada não pode ser editada" : "Editar dados da venda"}
                            className="p-1.5 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Cancelar (apenas ativas) */}
                          <button
                            onClick={() => onCancelSale(sale)}
                            disabled={isCancelled}
                            title={isCancelled ? "Venda já cancelada" : "Cancelar venda e estornar estoque"}
                            className="p-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
