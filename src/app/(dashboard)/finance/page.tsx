"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/context/AuthContext";
import {
  BankAccount,
  FinancialTransaction,
  AccountsReceivable,
  AccountsPayable,
  Purchase
} from "@/features/finance/types";
import {
  BankAccountSchema,
  FinancialTransactionSchema,
  AccountsReceivableSchema,
  AccountsPayableSchema,
  PurchaseSchema
} from "@/features/finance/schemas";
import { Product } from "@/features/products/types";
import { Supplier } from "@/features/customers/types";
import {
  DollarSign,
  Plus,
  Minus,
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  Wallet,
  Banknote,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calculator,
  X,
  Layers,
  Receipt,
  Activity,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lista de Bancos Brasileiros para o seletor visual (Req 7)
export const BRAZILIAN_BANKS = [
  { code: "001", name: "Banco do Brasil", color: "bg-yellow-500 text-blue-900 border-yellow-600", brand: "BB" },
  { code: "033", name: "Santander", color: "bg-red-600 text-white border-red-700", brand: "San" },
  { code: "104", name: "Caixa", color: "bg-blue-600 text-orange-400 border-blue-700", brand: "Caixa" },
  { code: "237", name: "Bradesco", color: "bg-red-700 text-white border-red-800", brand: "Brad" },
  { code: "341", name: "Itaú Unibanco", color: "bg-orange-500 text-blue-950 border-orange-600", brand: "Itaú" },
  { code: "077", name: "Banco Inter", color: "bg-orange-500 text-white border-orange-600", brand: "Inter" },
  { code: "260", name: "Nubank", color: "bg-purple-700 text-white border-purple-800", brand: "Nu" },
  { code: "336", name: "C6 Bank", color: "bg-black text-white border-neutral-700", brand: "C6" },
  { code: "290", name: "PagBank", color: "bg-green-600 text-white border-green-700", brand: "Pag" },
  { code: "121", name: "Neon", color: "bg-cyan-500 text-white border-cyan-600", brand: "Neon" },
  { code: "041", name: "Banrisul", color: "bg-blue-800 text-white border-blue-900", brand: "BRS" },
  { code: "756", name: "Sicoob", color: "bg-emerald-800 text-yellow-400 border-emerald-950", brand: "Sicoob" },
  { code: "748", name: "Sicredi", color: "bg-green-700 text-white border-green-800", brand: "Sicredi" },
  { code: "004", name: "Banco do Nordeste", color: "bg-yellow-600 text-emerald-950 border-yellow-700", brand: "BNB" },
  { code: "197", name: "Stone", color: "bg-emerald-600 text-white border-emerald-700", brand: "Stone" },
  { code: "318", name: "BMG", color: "bg-orange-600 text-white border-orange-700", brand: "BMG" },
  { code: "623", name: "Banco Pan", color: "bg-blue-950 text-white border-blue-900", brand: "Pan" },
  { code: "074", name: "Safra", color: "bg-amber-700 text-white border-amber-800", brand: "Safra" },
];

// Mock Inicial de Contas Bancárias
const INITIAL_BANK_ACCOUNTS = [
  { name: "Caixa Físico / Gaveta", type: "cash_register" as const, balance: 350.00, currency: "BRL", status: "active" as const },
  { name: "Banco Itaú PJ", type: "checking" as const, balance: 8450.00, currency: "BRL", status: "active" as const },
  { name: "Carteira Digital Shopee", type: "wallet" as const, balance: 1290.00, currency: "BRL", status: "active" as const }
];

// Mock Inicial de Lançamentos Financeiros (Fluxo de Caixa)
const INITIAL_TRANSACTIONS = (bankIds: string[]) => [
  { type: "revenue" as const, category: "sale" as const, amount: 249.90, description: "Venda PDV - Cliente: Mariana Silva", paymentDate: new Date().toISOString().split("T")[0], status: "paid" as const, bankAccountId: bankIds[0] || "gaveta" },
  { type: "revenue" as const, category: "sale" as const, amount: 158.00, description: "Venda Shopee - Cliente: Juliana Costa", paymentDate: new Date().toISOString().split("T")[0], status: "paid" as const, bankAccountId: bankIds[2] || "shopee" },
  { type: "expense" as const, category: "rent" as const, amount: 1500.00, description: "Aluguel Comercial - Sala 52", paymentDate: new Date().toISOString().split("T")[0], status: "paid" as const, bankAccountId: bankIds[1] || "itau" },
  { type: "expense" as const, category: "marketing" as const, amount: 350.00, description: "Anúncios Meta (Instagram/Facebook Ads)", paymentDate: new Date().toISOString().split("T")[0], status: "paid" as const, bankAccountId: bankIds[1] || "itau" },
  { type: "expense" as const, category: "salary" as const, amount: 1200.00, description: "Pró-Labore Sócio Carol Ramos", paymentDate: new Date().toISOString().split("T")[0], status: "paid" as const, bankAccountId: bankIds[1] || "itau" }
];

// Mock Inicial de Contas a Pagar
const INITIAL_PAYABLES = (supplierIds: string[]) => [
  { supplierId: supplierIds[0] || "natura", description: "Compra Reposição Cosméticos Natura", amount: 850.00, dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], status: "pending" as const, paymentMethod: "bank_slip" as const },
  { supplierId: "", description: "Energia Elétrica Enel", amount: 180.00, dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], status: "pending" as const, paymentMethod: "bank_slip" as const }
];

// Mock Inicial de Contas a Receber
const INITIAL_RECEIVABLES = [
  { customerId: "", description: "Repasse de Vendas Shopee", amount: 950.00, dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], status: "pending" as const, paymentMethod: "credit_card" as const, installments: 1 }
];

export default function FinancePage() {
  const { createDoc, getDocs, updateDoc, deleteDoc } = useDb();

  const [activeTab, setActiveTab] = useState<"cashflow" | "accounts" | "payable" | "receivable" | "purchases" | "dre">("cashflow");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // DB Lists
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Drawer Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"transaction" | "bank_account" | "payable" | "receivable" | "purchase">("transaction");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  // 1. Transaction
  const [tType, setTType] = useState<'revenue' | 'expense'>("expense");
  const [tCategory, setTCategory] = useState<'sale' | 'rent' | 'marketing' | 'salary' | 'stock_purchase' | 'cash_register_adjustment' | 'other'>("other");
  const [tAmount, setTAmount] = useState(0);
  const [tDesc, setTDesc] = useState("");
  const [tDate, setTDate] = useState("");
  const [tBankAccountId, setTBankAccountId] = useState("");

  // 2. Bank Account
  const [bName, setBName] = useState("");
  const [bType, setBType] = useState<'checking' | 'savings' | 'wallet' | 'cash_register'>("checking");
  const [bBalance, setBBalance] = useState(0);

  // 3. Purchase Form Fields
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([]);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'credit_card' | 'bank_slip' | 'pix' | 'cash'>("pix");
  const [purchaseDueDate, setPurchaseDueDate] = useState("");

  // Common errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment Confirmation Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayId, setSelectedPayId] = useState<string | null>(null);
  const [selectedReceiveId, setSelectedReceiveId] = useState<string | null>(null);
  const [paymentBankAccountId, setPaymentBankAccountId] = useState("");

  // Bank Selector State (Req 7)
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankObj, setSelectedBankObj] = useState<any>(null);

  // Load All Financial Data
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      let bAccounts = await getDocs("bank_accounts");
      let trans = await getDocs("financial_transactions");
      let pays = await getDocs("accounts_payable");
      let recs = await getDocs("accounts_receivable");
      let purcs = await getDocs("purchases");
      const prods = await getDocs("products");
      const supps = await getDocs("suppliers");

      // Pre-seed bank accounts
      if (bAccounts.length === 0) {
        for (const ba of INITIAL_BANK_ACCOUNTS) await createDoc("bank_accounts", ba);
        bAccounts = await getDocs("bank_accounts");
      }

      const bankIds = (bAccounts as any[]).map((b: any) => b.id);
      const supplierIds = (supps as any[]).map((s: any) => s.id);

      // Pre-seed Transactions
      if (trans.length === 0) {
        for (const t of INITIAL_TRANSACTIONS(bankIds)) await createDoc("financial_transactions", t);
        trans = await getDocs("financial_transactions");
      }

      // Pre-seed Payables
      if (pays.length === 0) {
        for (const p of INITIAL_PAYABLES(supplierIds)) await createDoc("accounts_payable", p);
        pays = await getDocs("accounts_payable");
      }

      // Pre-seed Receivables
      if (recs.length === 0) {
        for (const r of INITIAL_RECEIVABLES) await createDoc("accounts_receivable", r);
        recs = await getDocs("accounts_receivable");
      }

      setBankAccounts(bAccounts as BankAccount[]);
      setTransactions(trans as FinancialTransaction[]);
      setPayables(pays as AccountsPayable[]);
      setReceivables(recs as AccountsReceivable[]);
      setPurchases(purcs as Purchase[]);
      setProducts(prods as Product[]);
      setSuppliers(supps as Supplier[]);

      if (bAccounts.length > 0) {
        setTBankAccountId(bAccounts[0].id);
        setPaymentBankAccountId(bAccounts[0].id);
      }
    } catch (e) {
      console.error("Erro ao sincronizar finanças:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  // 1. Abrir Drawer de Cadastro
  const handleOpenDrawer = (type: typeof drawerType) => {
    setDrawerType(type);
    setEditingId(null);
    setErrors({});
    
    // Reset inputs
    setTType("expense");
    setTCategory("other");
    setTAmount(0);
    setTDesc("");
    setTDate(new Date().toISOString().split("T")[0]);
    if (bankAccounts.length > 0) setTBankAccountId(bankAccounts[0].id);

    setBName("");
    setBType("checking");
    setBBalance(0);

    setSelectedSupplierId(suppliers[0]?.id || "");
    setPurchaseItems([]);
    setPurchasePaymentMethod("pix");
    setPurchaseDueDate(new Date().toISOString().split("T")[0]);

    setDrawerOpen(true);
  };

  // 2. Adicionar Item de Compra de Estoque
  const addPurchaseItem = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIdx = purchaseItems.findIndex(item => item.productId === productId);
    if (existingIdx > -1) {
      const newList = [...purchaseItems];
      newList[existingIdx].quantity += 1;
      setPurchaseItems(newList);
    } else {
      setPurchaseItems([...purchaseItems, { productId, quantity: 1, unitCost: prod.costPrice }]);
    }
  };

  // 3. Remover/Ajustar Item de Compra
  const updatePurchaseItemQty = (productId: string, qty: number) => {
    const idx = purchaseItems.findIndex(item => item.productId === productId);
    if (idx === -1) return;
    const newList = [...purchaseItems];
    if (qty <= 0) {
      newList.splice(idx, 1);
    } else {
      newList[idx].quantity = qty;
    }
    setPurchaseItems(newList);
  };

  const updatePurchaseItemCost = (productId: string, cost: number) => {
    const idx = purchaseItems.findIndex(item => item.productId === productId);
    if (idx === -1) return;
    const newList = [...purchaseItems];
    newList[idx].unitCost = cost;
    setPurchaseItems(newList);
  };

  // 4. Salvar Formulários
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (drawerType === "bank_account") {
        const payload = { name: bName, type: bType, balance: bBalance };
        const result = BankAccountSchema.safeParse(payload);
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.issues.forEach(i => errs[i.path.join(".")] = i.message);
          setErrors(errs);
          return;
        }

        await createDoc("bank_accounts", { ...payload, currency: "BRL", status: "active" as const });
      } 
      
      else if (drawerType === "transaction") {
        const payload = {
          type: tType,
          category: tCategory,
          amount: tAmount,
          description: tDesc,
          paymentDate: tDate || undefined,
          bankAccountId: tBankAccountId
        };

        const result = FinancialTransactionSchema.safeParse(payload);
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.issues.forEach(i => errs[i.path.join(".")] = i.message);
          setErrors(errs);
          return;
        }

        // Alterar saldo da conta bancária correspondente
        const account = bankAccounts.find(a => a.id === tBankAccountId);
        if (account) {
          const diff = tType === "revenue" ? tAmount : -tAmount;
          await updateDoc("bank_accounts", tBankAccountId, {
            balance: account.balance + diff
          });
        }

        await createDoc("financial_transactions", {
          ...payload,
          status: "paid" as const,
        });
      } 
      
      else if (drawerType === "purchase") {
        const totalCost = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
        
        const itemsPayload = purchaseItems.map(item => ({
          productId: item.productId,
          name: products.find(p => p.id === item.productId)?.name || "Produto",
          quantity: item.quantity,
          unitCost: item.unitCost
        }));

        const payload = {
          supplierId: selectedSupplierId,
          items: itemsPayload,
          paymentMethod: purchasePaymentMethod,
          dueDate: purchaseDueDate || undefined
        };

        const result = PurchaseSchema.safeParse(payload);
        if (!result.success) {
          alert(result.error.issues[0].message);
          return;
        }

        // 1. Criar Ordem de Compra
        const newPurchase = await createDoc("purchases", {
          ...payload,
          total: totalCost,
          status: "completed" as const,
          receivedAt: new Date().toISOString()
        });

        // 2. Incrementar Estoques dos Produtos & Atualizar Preços de Custos
        for (const item of purchaseItems) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const newStock = prod.currentStock + item.quantity;
            const newAvailable = prod.availableStock + item.quantity;
            
            // Recalcular Preço de Custo Médio Ponderado
            const currentAssetVal = prod.currentStock * prod.averageCost;
            const newPurchaseVal = item.quantity * item.unitCost;
            const finalAvgCost = parseFloat(((currentAssetVal + newPurchaseVal) / newStock).toFixed(2));
            
            // Calcular margem: ((sellPrice - unitCost) / sellPrice) * 100
            const calculatedMargin = prod.sellPrice > 0 
              ? parseFloat((((prod.sellPrice - item.unitCost) / prod.sellPrice) * 100).toFixed(1)) 
              : 0;

            await updateDoc("products", prod.id, {
              currentStock: newStock,
              availableStock: newAvailable,
              costPrice: item.unitCost, // Atualiza último preço de custo
              averageCost: finalAvgCost,
              lastPurchasePrice: item.unitCost,
              lastPurchaseDate: new Date().toISOString(),
              profitMargin: calculatedMargin
            });

            // Registrar InventoryTransaction
            await createDoc("inventory_transactions", {
              productId: prod.id,
              locationId: "deposito-central", // ID do Depósito de Entrada
              type: "in" as const,
              quantity: item.quantity,
              costPriceAtTime: item.unitCost,
              reason: `Ordem de Compra Ref #${newPurchase.id}`
            });
          }
        }

        // 3. Fluxo Financeiro da Compra:
        if (purchasePaymentMethod === "pix" || purchasePaymentMethod === "cash") {
          // Pago na hora: debita do Caixa Loja ou Itaú
          const targetBankId = purchasePaymentMethod === "pix" ? bankAccounts[1]?.id : bankAccounts[0]?.id;
          if (targetBankId) {
            const acc = bankAccounts.find(a => a.id === targetBankId);
            if (acc) {
              await updateDoc("bank_accounts", targetBankId, { balance: acc.balance - totalCost });
            }
            await createDoc("financial_transactions", {
              type: "expense" as const,
              category: "stock_purchase" as const,
              amount: totalCost,
              description: `Compra de Estoque Ref #${newPurchase.id}`,
              paymentDate: new Date().toISOString().split("T")[0],
              status: "paid" as const,
              bankAccountId: targetBankId,
              referenceId: newPurchase.id
            });
          }
        } else {
          // A prazo: gera contas a pagar (AccountsPayable)
          await createDoc("accounts_payable", {
            supplierId: selectedSupplierId,
            purchaseId: newPurchase.id,
            description: `Compra Reposição Ref #${newPurchase.id}`,
            amount: totalCost,
            dueDate: purchaseDueDate,
            status: "pending" as const,
            paymentMethod: purchasePaymentMethod
          });
        }
      }

      setDrawerOpen(false);
      await loadFinancialData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar.");
    }
  };

  // 5. Baixar Conta a Pagar (Marcar como Pago)
  const handleOpenPayModal = (id: string) => {
    setSelectedPayId(id);
    setSelectedReceiveId(null);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!paymentBankAccountId) return;
    setLoading(true);

    try {
      const bankAcc = bankAccounts.find(a => a.id === paymentBankAccountId);
      if (!bankAcc) throw new Error("Conta inválida.");

      if (selectedPayId) {
        const payDoc = payables.find(p => p.id === selectedPayId);
        if (!payDoc) throw new Error("Documento não encontrado.");

        // Atualizar saldo do banco (Debitar)
        await updateDoc("bank_accounts", paymentBankAccountId, {
          balance: bankAcc.balance - payDoc.amount
        });

        // Registrar transação financeira
        await createDoc("financial_transactions", {
          type: "expense" as const,
          category: payDoc.description.toLowerCase().includes("estoque") ? "stock_purchase" as const : "other" as const,
          amount: payDoc.amount,
          description: `Pagamento: ${payDoc.description}`,
          paymentDate: new Date().toISOString().split("T")[0],
          status: "paid" as const,
          bankAccountId: paymentBankAccountId,
          referenceId: payDoc.id
        });

        // Atualizar documento do Contas a Pagar
        await updateDoc("accounts_payable", selectedPayId, {
          status: "paid" as const,
          paidAmount: payDoc.amount,
          paidDate: new Date().toISOString()
        });
      } 
      
      else if (selectedReceiveId) {
        const recDoc = receivables.find(r => r.id === selectedReceiveId);
        if (!recDoc) throw new Error("Documento não encontrado.");

        // Atualizar saldo do banco (Creditar)
        await updateDoc("bank_accounts", paymentBankAccountId, {
          balance: bankAcc.balance + recDoc.amount
        });

        // Registrar transação financeira
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

        // Atualizar documento do Contas a Receber
        await updateDoc("accounts_receivable", selectedReceiveId, {
          status: "paid" as const,
          receivedAmount: recDoc.amount,
          receivedDate: new Date().toISOString()
        });
      }

      setPaymentModalOpen(false);
      await loadFinancialData();
    } catch (e: any) {
      alert(e.message || "Erro no processamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceiveModal = (id: string) => {
    setSelectedReceiveId(id);
    setSelectedPayId(null);
    setPaymentModalOpen(true);
  };

  // Excluir Lançamentos
  const handleDeleteItem = async (collection: string, id: string, desc: string) => {
    if (confirm(`Deseja excluir "${desc}"?`)) {
      try {
        await deleteDoc(collection, id);
        await loadFinancialData();
      } catch (err: any) {
        alert(err.message || "Erro ao deletar.");
      }
    }
  };

  // DRE de Caixa Simplificado (Cálculo)
  const getDREData = () => {
    const revenueTx = transactions.filter(t => t.type === "revenue" && t.status === "paid");
    const expenseTx = transactions.filter(t => t.type === "expense" && t.status === "paid");

    const totalRevenues = revenueTx.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalRevenues - totalExpenses;
    
    // Quebrar despesas por categoria
    const categoriesSum = expenseTx.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenues,
      totalExpenses,
      netIncome,
      categoriesSum
    };
  };

  const dre = getDREData();

  // Filtragem local por busca
  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayables = payables.filter(p =>
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReceivables = receivables.filter(r =>
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "sale": return "Venda Mercadoria";
      case "rent": return "Aluguel Sala";
      case "marketing": return "Marketing & Anúncios";
      case "salary": return "Pró-Labore / Salários";
      case "stock_purchase": return "Reposição Estoque";
      case "cash_register_adjustment": return "Ajuste Caixa";
      default: return "Outras Despesas";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Controle <span className="font-semibold text-rosegold-500">Financeiro & Compras</span></h1>
          <p className="text-xs text-muted-foreground">Tesouraria SaaS, fluxo de caixa, DRE gerencial, contas a pagar/receber e compras de fornecedores.</p>
        </div>

        {activeTab !== "dre" && activeTab !== "accounts" && (
          <button
            onClick={() => handleOpenDrawer(
              activeTab === "cashflow" ? "transaction" : 
              activeTab === "payable" ? "payable" : 
              activeTab === "purchases" ? "purchase" : "receivable"
            )}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeTab === "cashflow" ? "Novo Lançamento" :
               activeTab === "payable" ? "Nova Conta Pagar" :
               activeTab === "purchases" ? "Registrar Compra" : "Nova Conta Receber"}
            </span>
          </button>
        )}

        {activeTab === "accounts" && (
          <button
            onClick={() => handleOpenDrawer("bank_account")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Conta Bancária</span>
          </button>
        )}
      </div>

      {/* 2. Seleção de Abas & Filtros */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Abas */}
        <div className="flex border border-border bg-card/40 rounded-xl p-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "cashflow", label: "Fluxo de Caixa", icon: Activity },
            { id: "accounts", label: "Contas & Saldos", icon: Wallet },
            { id: "payable", label: "Contas a Pagar", icon: TrendingDown },
            { id: "receivable", label: "Contas a Receber", icon: TrendingUp },
            { id: "purchases", label: "Compras Estoque", icon: Receipt },
            { id: "dre", label: "DRE Gerencial", icon: Calculator }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchQuery(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de Pesquisa (Não DRE) */}
        {activeTab !== "dre" && activeTab !== "accounts" && (
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar lançamentos ou contas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        )}
      </div>

      {/* 3. Renderização das Tabelas / Telas */}
      <div className="border border-border bg-card/40 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Carregando financeiro...</div>
        ) : (
          <div>
            
            {/* Tabela 1: Fluxo de Caixa */}
            {activeTab === "cashflow" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Data Pagamento</th>
                      <th className="p-4">Conta</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lançamento financeiro registrado.</td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {t.type === "revenue" ? (
                                <div className="p-1 rounded-md bg-green-100 text-green-600 dark:bg-green-950/20 dark:text-green-400">
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="p-1 rounded-md bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400">
                                  <ArrowDownRight className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <span className="font-semibold text-foreground">{t.description}</span>
                            </div>
                          </td>
                          <td className="p-4">{getCategoryLabel(t.category)}</td>
                          <td className="p-4 font-mono text-muted-foreground">{t.paymentDate ? new Date(t.paymentDate).toLocaleDateString() : "-"}</td>
                          <td className="p-4 text-muted-foreground">
                            {bankAccounts.find(a => a.id === t.bankAccountId)?.name || "Caixa Geral"}
                          </td>
                          <td className="p-4 font-mono font-bold text-foreground">
                            <span className={t.type === "revenue" ? "text-green-500" : "text-red-500"}>
                              {t.type === "revenue" ? "+" : "-"} R$ {t.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteItem("financial_transactions", t.id, t.description)}
                              className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tela 2: Contas Bancárias & Saldos */}
            {activeTab === "accounts" && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {bankAccounts.map((a) => {
                  // Find bank design helper
                  const bankMatch = BRAZILIAN_BANKS.find(b => 
                    a.name.toLowerCase().includes(b.name.toLowerCase()) || 
                    a.name.toLowerCase().includes(b.brand.toLowerCase())
                  );

                  return (
                    <div key={a.id} className="p-5 rounded-xl border border-border bg-card/50 flex flex-col justify-between h-32 hover:border-primary/20 transition-all select-none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-foreground truncate block">{a.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[8px] font-bold text-muted-foreground tracking-wider uppercase inline-block mt-1">
                            {a.type === "checking" ? "Corrente" : a.type === "wallet" ? "Digital" : "Caixa"}
                          </span>
                        </div>
                        {bankMatch ? (
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[9px] shadow-sm shrink-0 border", bankMatch.color)}>
                            {bankMatch.brand}
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span>
                        <h4 className="text-xl font-bold font-mono tracking-tight text-foreground">
                          R$ {a.balance.toFixed(2)}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tabela 3: Contas a Pagar */}
            {activeTab === "payable" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Fornecedor / Descrição</th>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Forma</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPayables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conta a pagar cadastrada.</td>
                      </tr>
                    ) : (
                      filteredPayables.map((p) => {
                        const isOverdue = new Date(p.dueDate) < new Date() && p.status === "pending";
                        return (
                          <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{p.description}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {suppliers.find(s => s.id === p.supplierId)?.name || "Despesa Administrativa"}
                              </div>
                            </td>
                            <td className="p-4 font-mono font-semibold">
                              <span className={isOverdue ? "text-red-500" : "text-muted-foreground"}>
                                {new Date(p.dueDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-foreground">R$ {p.amount.toFixed(2)}</td>
                            <td className="p-4 uppercase text-[10px] text-muted-foreground">{p.paymentMethod || "Boleto"}</td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                                p.status === "paid" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/30" 
                                  : isOverdue 
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/30 animate-pulse"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/30"
                              )}>
                                {p.status === "paid" ? "Pago" : isOverdue ? "Atrasado" : "Pendente"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {p.status === "pending" && (
                                  <button
                                    onClick={() => handleOpenPayModal(p.id)}
                                    className="px-2 py-1 rounded bg-rosegold-100 dark:bg-rosegold-900/50 hover:bg-primary hover:text-white text-rosegold-700 dark:text-rosegold-300 font-semibold text-[10px] transition-colors"
                                  >
                                    Baixar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteItem("accounts_payable", p.id, p.description)}
                                  className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
            )}

            {/* Tabela 4: Contas a Receber */}
            {activeTab === "receivable" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Forma</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredReceivables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conta a receber cadastrada.</td>
                      </tr>
                    ) : (
                      filteredReceivables.map((r) => {
                        const isOverdue = new Date(r.dueDate) < new Date() && r.status === "pending";
                        return (
                          <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{r.description}</div>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground">{new Date(r.dueDate).toLocaleDateString()}</td>
                            <td className="p-4 font-mono font-bold text-foreground">R$ {r.amount.toFixed(2)}</td>
                            <td className="p-4 uppercase text-[10px] text-muted-foreground">{r.paymentMethod || "Crédito"}</td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                                r.status === "paid" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/30" 
                                  : isOverdue 
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/30 animate-pulse"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/30"
                              )}>
                                {r.status === "paid" ? "Recebido" : isOverdue ? "Atrasado" : "Pendente"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {r.status === "pending" && (
                                  <button
                                    onClick={() => handleOpenReceiveModal(r.id)}
                                    className="px-2 py-1 rounded bg-rosegold-100 dark:bg-rosegold-900/50 hover:bg-primary hover:text-white text-rosegold-700 dark:text-rosegold-300 font-semibold text-[10px] transition-colors"
                                  >
                                    Receber
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteItem("accounts_receivable", r.id, r.description)}
                                  className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
            )}

            {/* Tabela 5: Compras de Fornecedores */}
            {activeTab === "purchases" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Fornecedor</th>
                      <th className="p-4">Data Compra</th>
                      <th className="p-4">Itens Comprados</th>
                      <th className="p-4">Total Faturado</th>
                      <th className="p-4">Método</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma ordem de compra registrada.</td>
                      </tr>
                    ) : (
                      purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4 font-semibold text-foreground">
                            {suppliers.find(s => s.id === p.supplierId)?.name || "Fornecedor"}
                          </td>
                          <td className="p-4 font-mono text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 truncate max-w-[200px] text-muted-foreground">
                            {p.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                          </td>
                          <td className="p-4 font-mono font-bold text-foreground">R$ {p.total.toFixed(2)}</td>
                          <td className="p-4 uppercase text-[10px] text-muted-foreground">{p.paymentMethod}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200/30">
                              Recebido
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Aba 6: DRE Gerencial */}
            {activeTab === "dre" && (
              <div className="p-6 max-w-xl mx-auto space-y-6 text-xs">
                <div className="text-center pb-2 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Demonstrativo do Resultado do Exercício (DRE)</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Visão gerencial consolidada por regime de caixa.</p>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between font-bold text-foreground text-xs pb-1 border-b border-border">
                    <span>RECEITA OPERACIONAL BRUTA</span>
                    <span className="font-mono text-green-500">+ R$ {dre.totalRevenues.toFixed(2)}</span>
                  </div>

                  <div className="space-y-1.5 pl-4 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Vendas PDV e Canais</span>
                      <span className="font-mono">R$ {dre.totalRevenues.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-foreground text-xs pb-1 border-b border-border pt-2">
                    <span>(-) DESPESAS OPERACIONAIS</span>
                    <span className="font-mono text-red-500">- R$ {dre.totalExpenses.toFixed(2)}</span>
                  </div>

                  <div className="space-y-1.5 pl-4 text-muted-foreground">
                    {Object.keys(dre.categoriesSum).map((cat) => (
                      <div key={cat} className="flex justify-between">
                        <span>{getCategoryLabel(cat)}</span>
                        <span className="font-mono">R$ {dre.categoriesSum[cat].toFixed(2)}</span>
                      </div>
                    ))}
                    {Object.keys(dre.categoriesSum).length === 0 && (
                      <div className="text-center py-2 text-[10px]">Nenhuma despesa registrada.</div>
                    )}
                  </div>

                  <div className={cn(
                    "flex justify-between font-bold text-sm p-3.5 rounded-xl border mt-6",
                    dre.netIncome >= 0 
                      ? "bg-green-100/50 border-green-200/50 text-green-800 dark:bg-green-950/20 dark:text-green-400" 
                      : "bg-red-100/50 border-red-200/50 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                  )}>
                    <span>LUCRO LÍQUIDO DO PERÍODO</span>
                    <span className="font-mono">R$ {dre.netIncome.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* 4. Slide-over Form Drawer */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <div className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Receipt className="h-4.5 w-4.5 text-rosegold-500" />
                <span>
                  {drawerType === "bank_account" ? "Nova Conta Bancária" :
                   drawerType === "transaction" ? "Novo Lançamento Rápido" : "Registrar Compra de Fornecedor"}
                </span>
              </h3>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Forms */}
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* Form 1: Bank Account */}
              {drawerType === "bank_account" && (
                <>
                  {/* Select Bank (Req 7) */}
                  <div className="space-y-2 border-b border-border/50 pb-3">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Banco Brasileiro (Visual Picker)</label>
                    <input
                      type="text"
                      placeholder="Pesquisar banco (Ex: Itaú, Nubank, Caixa...)"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-border bg-card"
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {BRAZILIAN_BANKS.filter(b => 
                        b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
                        b.brand.toLowerCase().includes(bankSearch.toLowerCase()) ||
                        b.code.includes(bankSearch)
                      ).map(b => {
                        const isSelected = selectedBankObj?.code === b.code;
                        return (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => {
                              setSelectedBankObj(b);
                              setBName(`${b.name} PJ`);
                            }}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-xl border text-left transition-all",
                              isSelected 
                                ? "border-primary bg-primary/10" 
                                : "border-border hover:border-primary/30 bg-card/50"
                            )}
                          >
                            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center font-bold text-[8px] shrink-0 border", b.color)}>
                              {b.brand}
                            </div>
                            <span className="text-[10px] font-semibold text-foreground truncate">{b.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Identificador da Conta</label>
                    <input
                      type="text"
                      required
                      value={bName}
                      onChange={(e) => setBName(e.target.value)}
                      placeholder="Ex: Banco Itaú Carol PJ"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card"
                    />
                    {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Tipo de Conta</label>
                      <select
                        value={bType}
                        onChange={(e) => setBType(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                      >
                        <option value="checking">Conta Corrente</option>
                        <option value="savings">Poupança</option>
                        <option value="wallet">Carteira Digital</option>
                        <option value="cash_register">Caixa Interno / Físico</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Saldo Inicial (BRL)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={bBalance || ""}
                        onChange={(e) => setBBalance(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Form 2: Transaction */}
              {drawerType === "transaction" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Tipo</label>
                      <select
                        value={tType}
                        onChange={(e) => setTType(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                      >
                        <option value="expense">Despesa (Saída)</option>
                        <option value="revenue">Receita (Entrada)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Categoria</label>
                      <select
                        value={tCategory}
                        onChange={(e) => setTCategory(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                      >
                        <option value="other">Outros Lançamentos</option>
                        <option value="rent">Aluguel / Condomínio</option>
                        <option value="marketing">Marketing & Tráfego</option>
                        <option value="salary">Salários & Pró-Labore</option>
                        <option value="stock_purchase">Compra de Mercadorias</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Descrição / Detalhe</label>
                    <input
                      type="text"
                      required
                      value={tDesc}
                      onChange={(e) => setTDesc(e.target.value)}
                      placeholder="Ex: Compra embalagens correios"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card"
                    />
                    {errors.description && <p className="text-[10px] text-destructive mt-0.5">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={tAmount || ""}
                        onChange={(e) => setTAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card font-mono"
                      />
                      {errors.amount && <p className="text-[10px] text-destructive mt-0.5">{errors.amount}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Data Pagamento</label>
                      <input
                        type="text"
                        required
                        value={tDate}
                        onChange={(e) => setTDate(e.target.value)}
                        placeholder="AAAA-MM-DD"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card font-mono"
                      />
                      {errors.paymentDate && <p className="text-[10px] text-destructive mt-0.5">{errors.paymentDate}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta Bancária Origem/Destino</label>
                    <select
                      value={tBankAccountId}
                      onChange={(e) => setTBankAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                    >
                      {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} (R$ {a.balance.toFixed(2)})</option>)}
                    </select>
                    {errors.bankAccountId && <p className="text-[10px] text-destructive mt-0.5">{errors.bankAccountId}</p>}
                  </div>
                </>
              )}

              {/* Form 3: Purchase Order */}
              {drawerType === "purchase" && (
                <>
                  {/* Fornecedor */}
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Fornecedor</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                    >
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      {suppliers.length === 0 && <option value="">Sem fornecedores cadastrados</option>}
                    </select>
                  </div>

                  {/* Catálogo rápido de produtos para compra */}
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Selecionar Produtos para Entrada</label>
                    <div className="border border-border rounded-xl p-2 max-h-36 overflow-y-auto space-y-1.5 bg-muted/20">
                      {products.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-[10px] p-1 hover:bg-card rounded transition-colors">
                          <span className="font-medium text-foreground truncate max-w-[200px]">{p.name} (SKU: {p.sku})</span>
                          <button
                            type="button"
                            onClick={() => addPurchaseItem(p.id)}
                            className="px-2 py-0.5 bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-900/50 dark:text-rosegold-300 rounded font-bold uppercase hover:bg-primary hover:text-white"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Itens da Compra */}
                  <div className="space-y-2">
                    <span className="font-bold uppercase tracking-wider text-[8px] text-muted-foreground">Itens da Ordem de Entrada</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {purchaseItems.map(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-3 text-[10px]">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{prod?.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span>Custo R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unitCost || ""}
                                  onChange={(e) => updatePurchaseItemCost(item.productId, parseFloat(e.target.value) || 0)}
                                  className="w-14 p-0.5 border border-border rounded text-center font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" onClick={() => updatePurchaseItemQty(item.productId, item.quantity - 1)} className="p-1 rounded bg-muted">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-bold font-mono w-4 text-center">{item.quantity}</span>
                              <button type="button" onClick={() => updatePurchaseItemQty(item.productId, item.quantity + 1)} className="p-1 rounded bg-muted">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {purchaseItems.length === 0 && (
                        <p className="text-center py-6 text-muted-foreground italic text-[10px]">Nenhum item selecionado para compra.</p>
                      )}
                    </div>
                  </div>

                  {/* Forma e Vencimento */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Método Pagamento</label>
                      <select
                        value={purchasePaymentMethod}
                        onChange={(e) => setPurchasePaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                      >
                        <option value="pix">PIX (À Vista)</option>
                        <option value="cash">Dinheiro (À Vista)</option>
                        <option value="bank_slip">Boleto (A Prazo)</option>
                        <option value="credit_card">Cartão Crédito (A Prazo)</option>
                      </select>
                    </div>

                    {(purchasePaymentMethod === "bank_slip" || purchasePaymentMethod === "credit_card") && (
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Vencimento Boleto/Fatura</label>
                        <input
                          type="text"
                          required
                          value={purchaseDueDate}
                          onChange={(e) => setPurchaseDueDate(e.target.value)}
                          placeholder="AAAA-MM-DD"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Resumo Valor Total Compra */}
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs font-bold flex justify-between">
                    <span>TOTAL FATURADO COMPRA</span>
                    <span className="font-mono">R$ {purchaseItems.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3.5 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={drawerType === "purchase" && purchaseItems.length === 0}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                >
                  Salvar Registro
                </button>
              </div>

            </form>
          </div>
        </>
      )}

      {/* 5. MODAL: CONFIRMAR PAGAMENTO / RECEBIMENTO */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-rosegold-500" />
                <span>Confirmar Liquidação</span>
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed">
              Deseja confirmar a conciliação financeira deste lançamento? O saldo da conta bancária selecionada será atualizado e o status será marcado como pago/recebido.
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta Bancária para Transação</label>
              <select
                value={paymentBankAccountId}
                onChange={(e) => setPaymentBankAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground"
              >
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} (R$ {a.balance.toFixed(2)})</option>)}
              </select>
            </div>

            <div className="flex gap-3.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
              >
                Confirmar Liquidação
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
