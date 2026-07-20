"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  FileText,
  User,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { AccountsReceivable, BankAccount } from "@/features/finance/types";
import { Customer } from "@/features/customers/types";
import { AccountsReceivableSchema } from "@/features/finance/schemas";

export default function AccountsReceivablePage() {
  const { user, role, tenantId } = useAuth();
  const { getDocs, createDoc, updateDoc, deleteDoc } = useDb();
  const { success, error: toastError, info } = useToast();

  const isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("your-api-key");

  // Page States
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Edit/Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [desc, setDesc] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'debit_card' | 'pix' | 'cash' | 'split'>("pix");
  const [installments, setInstallments] = useState<number>(1);

  // Liquidation Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedReceiveId, setSelectedReceiveId] = useState<string | null>(null);
  const [paymentBankAccountId, setPaymentBankAccountId] = useState("");

  // Load All Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, custs, banks] = await Promise.all([
        getDocs("accounts_receivable"),
        getDocs("customers"),
        getDocs("bank_accounts")
      ]);

      const safeReceivables = (recs as AccountsReceivable[]) || [];
      const safeCustomers = (custs as Customer[]) || [];
      const safeBanks = (banks as BankAccount[]) || [];

      setReceivables(safeReceivables);
      setCustomers(safeCustomers);
      setBankAccounts(safeBanks.filter(b => b.status === "active"));

      if (safeBanks.length > 0) {
        setPaymentBankAccountId(safeBanks[0].id);
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados do contas a receber:", err);
      toastError("Erro ao carregar", "Não foi possível buscar as contas a receber.");
    } finally {
      setLoading(false);
    }
  }, [getDocs, toastError]);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId, loadData]);

  // Auto-open modal from URL query params (?new=true or ?id=XYZ)
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    const params = new URLSearchParams(window.location.search);
    const newParam = params.get("new");
    const idParam = params.get("id");
    if (newParam === "true") {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOpenCreate();
    } else if (idParam && receivables.length > 0) {
      const item = receivables.find(r => r.id === idParam);
      if (item) {
        window.history.replaceState({}, document.title, window.location.pathname);
        handleOpenEdit(item);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, receivables]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setDesc("");
    setCustomerId("");
    setAmount(0);
    setDueDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("pix");
    setInstallments(1);
    setModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (rec: AccountsReceivable) => {
    setEditingId(rec.id);
    setFormErrors({});
    setDesc(rec.description);
    setCustomerId(rec.customerId || "");
    setAmount(rec.amount);
    
    // Normalize date format to AAAA-MM-DD
    let dStr = "";
    if (rec.dueDate) {
      if (typeof rec.dueDate === "string") {
        dStr = rec.dueDate.split("T")[0];
      } else if (rec.dueDate.toDate) {
        dStr = rec.dueDate.toDate().toISOString().split("T")[0];
      } else if (rec.dueDate.seconds) {
        dStr = new Date(rec.dueDate.seconds * 1000).toISOString().split("T")[0];
      }
    }
    setDueDate(dStr || new Date().toISOString().split("T")[0]);
    setPaymentMethod(rec.paymentMethod || "pix");
    setInstallments(rec.installments || 1);
    setModalOpen(true);
  };

  // Save Item
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);

    const payload = {
      customerId: customerId || undefined,
      description: desc,
      amount,
      dueDate,
      paymentMethod,
      installments
    };

    // Validation
    const result = AccountsReceivableSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => errs[i.path.join(".")] = i.message);
      setFormErrors(errs);
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await updateDoc("accounts_receivable", editingId, {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        success("Atualizado", "Conta a receber atualizada com sucesso!");
      } else {
        await createDoc("accounts_receivable", {
          ...payload,
          status: "pending" as const,
          createdAt: new Date().toISOString()
        });
        success("Cadastrado", "Nova conta a receber lançada com sucesso!");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toastError("Erro ao salvar", err.message || "Ocorreu um erro ao salvar o registro.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const handleDelete = async (id: string, description: string) => {
    if (confirm(`Deseja realmente excluir "${description}"?`)) {
      setLoading(true);
      try {
        await deleteDoc("accounts_receivable", id);
        success("Excluído", "Conta a receber excluída com sucesso.");
        await loadData();
      } catch (err: any) {
        toastError("Erro ao excluir", err.message || "Erro ao tentar remover a conta.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Open Payment Liquidation modal
  const handleOpenReceive = (id: string) => {
    setSelectedReceiveId(id);
    if (bankAccounts.length > 0) {
      setPaymentBankAccountId(bankAccounts[0].id);
    }
    setReceiveModalOpen(true);
  };

  // Confirm Payment Liquidation (Baixa)
  const handleConfirmReceive = async () => {
    if (!paymentBankAccountId || !selectedReceiveId) return;
    setSaving(true);

    try {
      const recDoc = receivables.find(r => r.id === selectedReceiveId);
      const bankAcc = bankAccounts.find(b => b.id === paymentBankAccountId);

      if (!recDoc) throw new Error("Conta a receber não encontrada.");
      if (!bankAcc) throw new Error("Conta bancária não selecionada.");

      // 1. Creditar saldo da conta bancária
      await updateDoc("bank_accounts", paymentBankAccountId, {
        balance: bankAcc.balance + recDoc.amount
      });

      // 2. Criar lançamento de receita na carteira
      await createDoc("financial_transactions", {
        type: "revenue" as const,
        category: "sale" as const,
        amount: recDoc.amount,
        description: `Recebimento: ${recDoc.description}`,
        paymentDate: new Date().toISOString().split("T")[0],
        status: "paid" as const,
        bankAccountId: paymentBankAccountId,
        referenceId: recDoc.id
      });

      // 3. Atualizar status da conta a receber
      await updateDoc("accounts_receivable", selectedReceiveId, {
        status: "paid" as const,
        receivedAmount: recDoc.amount,
        receivedDate: new Date().toISOString()
      });

      success("Baixa Realizada", "Recebimento liquidado e registrado com sucesso!");
      setReceiveModalOpen(false);
      await loadData();
    } catch (err: any) {
      toastError("Erro na baixa", err.message || "Ocorreu um erro ao liquidar a conta.");
    } finally {
      setSaving(false);
    }
  };

  // Role Protection Check
  if (role === "operator") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <AlertCircle className="h-16 w-16 text-destructive animate-pulse" />
        <h1 className="text-xl font-bold font-display">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground max-w-sm">Você não possui permissões administrativas para visualizar ou gerenciar contas a receber.</p>
      </div>
    );
  }

  // Helper date conversions
  const getNormalizeDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (typeof dateVal === "string") return new Date(dateVal);
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    if (dateVal.toDate) return dateVal.toDate();
    return new Date();
  };

  const getNormalizedDateStr = (dateVal: any): string => {
    if (!dateVal) return "";
    const dt = getNormalizeDate(dateVal);
    // Return localized format DD/MM/AAAA
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Dynamic Metrics Calculations
  const now = new Date();
  now.setHours(0,0,0,0);

  const filteredReceivables = receivables.filter(r => {
    const rDate = getNormalizeDate(r.dueDate);
    rDate.setHours(0,0,0,0);
    
    // Status Logic
    const isOverdue = r.status === "pending" && rDate < now;
    
    const matchesSearch = r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customers.find(c => c.id === r.customerId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (statusFilter === "pending") {
      return r.status === "pending" && !isOverdue && matchesSearch;
    }
    if (statusFilter === "overdue") {
      return isOverdue && matchesSearch;
    }
    if (statusFilter === "paid") {
      return r.status === "paid" && matchesSearch;
    }
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredReceivables.length / itemsPerPage);
  const paginatedReceivables = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReceivables.slice(start, start + itemsPerPage);
  }, [filteredReceivables, currentPage, itemsPerPage]);

  const totalReceivables = receivables.reduce((acc, r) => r.status === "pending" ? acc + r.amount : acc, 0);
  const totalReceived = receivables.reduce((acc, r) => r.status === "paid" ? acc + (r.receivedAmount || r.amount) : acc, 0);
  const totalOverdue = receivables.reduce((acc, r) => {
    const rDate = getNormalizeDate(r.dueDate);
    rDate.setHours(0,0,0,0);
    return r.status === "pending" && rDate < now ? acc + r.amount : acc;
  }, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Contas a <span className="font-semibold text-rosegold-500">Receber</span></h1>
          <p className="text-xs text-muted-foreground">Monitore suas receitas futuras, vendas parceladas e boletos a receber.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Conta Receber</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pendentes */}
        <div className="p-4 rounded-xl border border-border bg-card/30 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">A Vencer (Pendentes)</span>
            <span className="text-lg font-mono font-bold text-amber-500">{formatCurrency(totalReceivables - totalOverdue)}</span>
          </div>
          <Calendar className="h-8 w-8 text-amber-500/20" />
        </div>

        {/* Card 2: Vencidos */}
        <div className="p-4 rounded-xl border border-border bg-card/30 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Atrasadas / Vencidas</span>
            <span className="text-lg font-mono font-bold text-red-500">{formatCurrency(totalOverdue)}</span>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500/20 animate-pulse" />
        </div>

        {/* Card 3: Liquidado */}
        <div className="p-4 rounded-xl border border-border bg-card/30 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Total Recebido / Liquidado</span>
            <span className="text-lg font-mono font-bold text-emerald-500">{formatCurrency(totalReceived)}</span>
          </div>
          <CheckCircle className="h-8 w-8 text-emerald-500/20" />
        </div>
      </div>

      {/* 2. Filters & Searches */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/25 backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por descrição ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-card/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-card"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-muted/40 p-1 rounded-lg border border-border shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
          {[
            { id: "all", label: "Todas" },
            { id: "pending", label: "A Vencer" },
            { id: "overdue", label: "Vencidas" },
            { id: "paid", label: "Recebidas" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap",
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Table/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : paginatedReceivables.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border bg-card/20 space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma conta a receber encontrada.</p>
          <p className="text-xs text-muted-foreground/75">As vendas a prazo do PDV aparecem automaticamente aqui.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-card/30 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[9px] tracking-wider border-b border-border">
                <tr>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedReceivables.map((rec) => {
                  const sDate = getNormalizeDate(rec.dueDate);
                  sDate.setHours(0,0,0,0);
                  const isOverdue = rec.status === "pending" && sDate < now;
                  const customerName = customers.find(c => c.id === rec.customerId)?.name || "Consumidor Final";

                  return (
                    <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-semibold">
                        {getNormalizedDateStr(rec.dueDate)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground">{rec.description}</div>
                        {rec.saleId && (
                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">Venda #{rec.saleId.slice(-6)}</span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">
                        {customerName}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(rec.amount)}
                      </td>
                      <td className="p-4">
                        {rec.status === "paid" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold">Recebido</span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-bold animate-pulse">Vencida</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold">Pendente</span>
                        )}
                      </td>
                      <td className="p-4 flex items-center justify-center gap-1">
                        {rec.status === "pending" && (
                          <button
                            onClick={() => handleOpenReceive(rec.id)}
                            className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm shadow-emerald-600/10 transition-colors mr-1"
                          >
                            Baixar
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          disabled={rec.status === "paid"}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id, rec.description)}
                          className="p-1.5 rounded-lg border border-border text-destructive hover:bg-destructive/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/10 select-none">
              <span className="text-xs text-muted-foreground">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredReceivables.length} itens)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL: CADASTRAR / EDITAR CONTA A RECEBER */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar Conta a Receber" : "Nova Conta a Receber"}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Descrição */}
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Descrição *</label>
            <input
              type="text"
              required
              placeholder="Ex: Venda Parcelada - Maria, Recebimento Avulso"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card"
            />
            {formErrors.description && <p className="text-[10px] text-destructive mt-0.5">{formErrors.description}</p>}
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Cliente</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
            >
              <option value="">Geral / Sem Cliente Especificado</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone ? c.phone : "Sem Telefone"})</option>
              ))}
            </select>
            {formErrors.customerId && <p className="text-[10px] text-destructive mt-0.5">{formErrors.customerId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Valor */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
              />
              {formErrors.amount && <p className="text-[10px] text-destructive mt-0.5">{formErrors.amount}</p>}
            </div>

            {/* Vencimento */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Data de Vencimento *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
              />
              {formErrors.dueDate && <p className="text-[10px] text-destructive mt-0.5">{formErrors.dueDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Método Pagamento */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Forma de Recebimento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="pix">PIX</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="cash">Dinheiro</option>
              </select>
              {formErrors.paymentMethod && <p className="text-[10px] text-destructive mt-0.5">{formErrors.paymentMethod}</p>}
            </div>

            {/* Parcelas */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nº Parcelas</label>
              <input
                type="number"
                min={1}
                max={36}
                value={installments}
                onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono text-center"
              />
              {formErrors.installments && <p className="text-[10px] text-destructive mt-0.5">{formErrors.installments}</p>}
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
            >
              {saving ? (
                <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{editingId ? "Salvar Alterações" : "Salvar Lançamento"}</span>
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* 5. MODAL: LIQUIDAR (BAIXAR) CONTA */}
      {receiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                <span>Liquidar Conta a Receber</span>
              </h3>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Selecione a conta bancária onde o valor recebido será creditado:
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta de Destino</label>
                <select
                  value={paymentBankAccountId}
                  onChange={(e) => setPaymentBankAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-card font-semibold text-xs"
                >
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {bankAccounts.length === 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] rounded-lg">
                  Nenhuma conta bancária ativa encontrada para realizar a transação.
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || !paymentBankAccountId}
                onClick={handleConfirmReceive}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50"
              >
                {saving ? "Registrando..." : "Confirmar Recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
