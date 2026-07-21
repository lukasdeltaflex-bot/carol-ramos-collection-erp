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
  UserCheck,
  ShieldAlert
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

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
  const { tenantId, isMock } = useAuth();
  const { createDoc, getDocs, updateDoc, deleteDoc } = useDb();

  const [activeTab, setActiveTab] = useState<"cashflow" | "accounts" | "payable" | "receivable" | "purchases" | "dre">("cashflow");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);
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
  const [purchaseInstallmentsCount, setPurchaseInstallmentsCount] = useState(1);
  const [generatedPurchaseInstallments, setGeneratedPurchaseInstallments] = useState<Array<{ number: number; amount: number; dueDate: string }>>([]);

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

  const purchaseTotalCost = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const generateDefaultPurchaseInstallments = (count: number, totalVal: number) => {
    if (count <= 0) return;
    const list = [];
    const baseAmount = parseFloat((totalVal / count).toFixed(2));
    let accumulated = 0;
    for (let i = 1; i <= count; i++) {
      let amount = baseAmount;
      if (i === count) {
        amount = parseFloat((totalVal - accumulated).toFixed(2));
      } else {
        accumulated = parseFloat((accumulated + baseAmount).toFixed(2));
      }
      const d = new Date();
      d.setDate(d.getDate() + 30 * i);
      list.push({
        number: i,
        amount,
        dueDate: d.toISOString().split("T")[0],
      });
    }
    setGeneratedPurchaseInstallments(list);
  };

  const handleUpdatePurchaseInstallmentAmount = (index: number, newAmount: number) => {
    setGeneratedPurchaseInstallments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: newAmount };
      return updated;
    });
  };

  const handleUpdatePurchaseInstallmentDate = (index: number, newDate: string) => {
    setGeneratedPurchaseInstallments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dueDate: newDate };
      return updated;
    });
  };

  // Regenerar parcelas da compra se o total ou método mudar
  useEffect(() => {
    if (purchasePaymentMethod === "bank_slip" || purchasePaymentMethod === "credit_card") {
      generateDefaultPurchaseInstallments(purchaseInstallmentsCount, purchaseTotalCost);
    } else {
      setGeneratedPurchaseInstallments([]);
    }
  }, [purchaseTotalCost, purchasePaymentMethod, purchaseInstallmentsCount]);

  // Load All Financial Data (Paralelizado e Reativo)
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      let [bAccounts, trans, pays, recs, purcs, prods, supps] = await Promise.all([
        getDocs("bank_accounts"),
        getDocs("financial_transactions"),
        getDocs("accounts_payable"),
        getDocs("accounts_receivable"),
        getDocs("purchases"),
        getDocs("products"),
        getDocs("suppliers")
      ]);

      bAccounts = (bAccounts as BankAccount[]) || [];
      trans = (trans as FinancialTransaction[]) || [];
      pays = (pays as AccountsPayable[]) || [];
      recs = (recs as AccountsReceivable[]) || [];
      purcs = (purcs as Purchase[]) || [];
      prods = (prods as Product[]) || [];
      supps = (supps as Supplier[]) || [];

      // Pre-seed bank accounts (Paralelizado)
      let needsRefetch = false;
      if (bAccounts.length === 0) {
        await Promise.all(INITIAL_BANK_ACCOUNTS.map(ba => createDoc("bank_accounts", ba)));
        needsRefetch = true;
      }

      if (needsRefetch) {
        bAccounts = (await getDocs("bank_accounts") as BankAccount[]) || [];
      }

      const bankIds = (bAccounts as any[]).map((b: any) => b.id);
      const supplierIds = (supps as any[]).map((s: any) => s.id);

      // Pre-seed other entities in parallel
      let needsRefetchOthers = false;
      const seedPromises = [];

      if (trans.length === 0) {
        seedPromises.push(Promise.all(INITIAL_TRANSACTIONS(bankIds).map(t => createDoc("financial_transactions", t))));
        needsRefetchOthers = true;
      }
      if (pays.length === 0) {
        seedPromises.push(Promise.all(INITIAL_PAYABLES(supplierIds).map(p => createDoc("accounts_payable", p))));
        needsRefetchOthers = true;
      }
      if (recs.length === 0) {
        seedPromises.push(Promise.all(INITIAL_RECEIVABLES.map(r => createDoc("accounts_receivable", r))));
        needsRefetchOthers = true;
      }

      if (seedPromises.length > 0) {
        await Promise.all(seedPromises);
      }

      if (needsRefetchOthers) {
        const [freshTrans, freshPays, freshRecs] = await Promise.all([
          getDocs("financial_transactions"),
          getDocs("accounts_payable"),
          getDocs("accounts_receivable")
        ]);
        trans = (freshTrans as FinancialTransaction[]) || [];
        pays = (freshPays as AccountsPayable[]) || [];
        recs = (freshRecs as AccountsReceivable[]) || [];
      }

      setBankAccounts(bAccounts);
      setTransactions(trans);
      setPayables(pays);
      setReceivables(recs);
      setPurchases(purcs);
      setProducts(prods);
      setSuppliers(supps);

      if (bAccounts.length > 0 && bAccounts[0]) {
        setTBankAccountId(bAccounts[0].id);
        setPaymentBankAccountId(bAccounts[0].id);
      }
    } catch (e) {
      console.error("Erro ao sincronizar finanças:", e);
      setBankAccounts([]);
      setTransactions([]);
      setPayables([]);
      setReceivables([]);
      setPurchases([]);
      setProducts([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadFinancialData();
    }
  }, [tenantId, isMock]);

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
    setPurchaseInstallmentsCount(1);
    setGeneratedPurchaseInstallments([]);

    setDrawerOpen(true);
  };

  // 1b. Abrir Drawer de Edição de Conta Bancária
  const handleEditBankAccount = (account: BankAccount) => {
    setDrawerType("bank_account");
    setEditingId(account.id);
    setErrors({});
    setBName(account.name);
    setBType(account.type as any);
    setBBalance(account.balance);
    setDrawerOpen(true);
  };

  // 1c. Excluir Conta Bancária
  const handleDeleteBankAccount = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a conta "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc("bank_accounts", id);
      await loadFinancialData();
    } catch (err: any) {
      console.error("Erro ao excluir conta bancária:", err);
      alert("Erro ao excluir conta: " + (err.message || "tente novamente."));
    }
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

        if (editingId) {
          await updateDoc("bank_accounts", editingId, { ...payload, updatedAt: new Date().toISOString() });
        } else {
          await createDoc("bank_accounts", { ...payload, currency: "BRL", status: "active" as const });
        }
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
          for (const inst of generatedPurchaseInstallments) {
            await createDoc("accounts_payable", {
              supplierId: selectedSupplierId || undefined,
              purchaseId: newPurchase.id,
              description: `Parcela ${inst.number}/${generatedPurchaseInstallments.length} - Compra Reposição Ref #${newPurchase.id}`,
              amount: inst.amount,
              dueDate: inst.dueDate,
              status: "pending" as const,
              paymentMethod: purchasePaymentMethod
            });
          }
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

  const dre = React.useMemo(() => getDREData(), [transactions]);

  // Filtragem local por busca (Memoizado)
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  const filteredPayables = React.useMemo(() => {
    return payables.filter(p =>
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [payables, searchQuery]);

  const filteredReceivables = React.useMemo(() => {
    return receivables.filter(r =>
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [receivables, searchQuery]);

  const currentItemsCount = activeTab === "cashflow" ? filteredTransactions.length :
                            activeTab === "payable" ? filteredPayables.length :
                            activeTab === "receivable" ? filteredReceivables.length :
                            activeTab === "purchases" ? purchases.length : 0;

  const totalPages = Math.ceil(currentItemsCount / itemsPerPage);

  const paginatedTransactions = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const paginatedPayables = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayables.slice(start, start + itemsPerPage);
  }, [filteredPayables, currentPage, itemsPerPage]);

  const paginatedReceivables = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReceivables.slice(start, start + itemsPerPage);
  }, [filteredReceivables, currentPage, itemsPerPage]);

  const paginatedPurchases = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return purchases.slice(start, start + itemsPerPage);
  }, [purchases, currentPage, itemsPerPage]);

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
            onClick={() => {
              if (activeTab === "payable") {
                window.location.href = "/payable?new=true";
              } else if (activeTab === "receivable") {
                window.location.href = "/receivable?new=true";
              } else {
                handleOpenDrawer(
                  activeTab === "cashflow" ? "transaction" : "purchase"
                );
              }
            }}
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
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lançamento financeiro registrado.</td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((t) => (
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
                          <td className="p-4 font-mono text-muted-foreground">{t.paymentDate ? formatDate(t.paymentDate) : "-"}</td>
                          <td className="p-4 text-muted-foreground">
                            {bankAccounts.find(a => a.id === t.bankAccountId)?.name || "Caixa Geral"}
                          </td>
                          <td className="p-4 font-mono font-bold text-foreground">
                            <span className={t.type === "revenue" ? "text-green-500" : "text-red-500"}>
                              {t.type === "revenue" ? "+" : "-"} {formatCurrency(t.amount)}
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
                    <div key={a.id} className="p-5 rounded-xl border border-border bg-card/50 flex flex-col justify-between h-36 hover:border-primary/20 transition-all select-none group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-foreground truncate block">{a.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[8px] font-bold text-muted-foreground tracking-wider uppercase inline-block mt-1">
                            {a.type === "checking" ? "Corrente" : a.type === "wallet" ? "Digital" : "Caixa"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditBankAccount(a)}
                            title="Editar conta"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBankAccount(a.id, a.name)}
                            title="Excluir conta"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {bankMatch ? (
                            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[9px] shadow-sm border", bankMatch.color)}>
                              {bankMatch.brand}
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                              <Building2 className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span>
                        <h4 className="text-xl font-bold font-mono tracking-tight text-foreground">
                          {formatCurrency(a.balance)}
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
                    {paginatedPayables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conta a pagar cadastrada.</td>
                      </tr>
                    ) : (
                      paginatedPayables.map((p) => {
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
                                {formatDate(p.dueDate)}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-foreground">{formatCurrency(p.amount)}</td>
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
                                  onClick={() => window.location.href = `/payable?id=${p.id}`}
                                  disabled={p.status === "paid"}
                                  className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  title="Editar"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem("accounts_payable", p.id, p.description)}
                                  className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                  title="Excluir"
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
                    {paginatedReceivables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conta a receber cadastrada.</td>
                      </tr>
                    ) : (
                      paginatedReceivables.map((r) => {
                        const isOverdue = new Date(r.dueDate) < new Date() && r.status === "pending";
                        return (
                          <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{r.description}</div>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground">{formatDate(r.dueDate)}</td>
                            <td className="p-4 font-mono font-bold text-foreground">{formatCurrency(r.amount)}</td>
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
                                  onClick={() => window.location.href = `/receivable?id=${r.id}`}
                                  disabled={r.status === "paid"}
                                  className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  title="Editar"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem("accounts_receivable", r.id, r.description)}
                                  className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                  title="Excluir"
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
                    {paginatedPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma ordem de compra registrada.</td>
                      </tr>
                    ) : (
                      paginatedPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4 font-semibold text-foreground">
                            {suppliers.find(s => s.id === p.supplierId)?.name || "Fornecedor"}
                          </td>
                          <td className="p-4 font-mono text-muted-foreground">{formatDate(p.createdAt)}</td>
                          <td className="p-4 truncate max-w-[200px] text-muted-foreground">
                            {p.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                          </td>
                          <td className="p-4 font-mono font-bold text-foreground">{formatCurrency(p.total)}</td>
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
                    <span className="font-mono text-green-500">+ {formatCurrency(dre.totalRevenues)}</span>
                  </div>

                  <div className="space-y-1.5 pl-4 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Vendas PDV e Canais</span>
                      <span className="font-mono">{formatCurrency(dre.totalRevenues)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-foreground text-xs pb-1 border-b border-border pt-2">
                    <span>(-) DESPESAS OPERACIONAIS</span>
                    <span className="font-mono text-red-500">- {formatCurrency(dre.totalExpenses)}</span>
                  </div>

                  <div className="space-y-1.5 pl-4 text-muted-foreground">
                    {Object.keys(dre.categoriesSum).map((cat) => (
                      <div key={cat} className="flex justify-between">
                        <span>{getCategoryLabel(cat)}</span>
                        <span className="font-mono">{formatCurrency(dre.categoriesSum[cat])}</span>
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
                    <span className="font-mono">{formatCurrency(dre.netIncome)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {activeTab !== "accounts" && activeTab !== "dre" && totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border bg-muted/10 select-none">
                <span className="text-xs text-muted-foreground">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({currentItemsCount} itens)
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
                  {drawerType === "bank_account" ? (editingId ? "Editar Conta Bancária" : "Nova Conta Bancária") :
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
                      {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
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
                    <div className="col-span-2 space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Método Pagamento</label>
                      <select
                        value={purchasePaymentMethod}
                        onChange={(e) => {
                          setPurchasePaymentMethod(e.target.value as any);
                          if (e.target.value === "bank_slip" || e.target.value === "credit_card") {
                            setPurchaseInstallmentsCount(1);
                            generateDefaultPurchaseInstallments(1, purchaseTotalCost);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                      >
                        <option value="pix">PIX (À Vista)</option>
                        <option value="cash">Dinheiro (À Vista)</option>
                        <option value="bank_slip">Boleto (A Prazo)</option>
                        <option value="credit_card">Cartão Crédito (A Prazo)</option>
                      </select>
                    </div>

                    {(purchasePaymentMethod === "bank_slip" || purchasePaymentMethod === "credit_card") && (
                      <div className="col-span-2 space-y-3 pt-2 border-t border-border/40 animate-in fade-in duration-200">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Nº de Parcelas</label>
                            <select
                              value={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].includes(purchaseInstallmentsCount) ? purchaseInstallmentsCount : "custom"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "custom") {
                                  setPurchaseInstallmentsCount(2);
                                  generateDefaultPurchaseInstallments(2, purchaseTotalCost);
                                } else {
                                  const count = parseInt(val) || 1;
                                  setPurchaseInstallmentsCount(count);
                                  generateDefaultPurchaseInstallments(count, purchaseTotalCost);
                                }
                              }}
                              className="w-full p-2 rounded-lg border border-border bg-card text-xs font-semibold"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].map(n => (
                                <option key={n} value={n}>{n}x de {formatCurrency(purchaseTotalCost / n)}</option>
                              ))}
                              <option value="custom">Outra quantidade...</option>
                            </select>
                          </div>

                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].includes(purchaseInstallmentsCount) ? null : (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-muted-foreground uppercase">Qtd (Máx 36)</label>
                              <input
                                type="number"
                                min={1}
                                max={36}
                                value={purchaseInstallmentsCount}
                                onChange={(e) => {
                                  const val = Math.min(36, Math.max(1, parseInt(e.target.value) || 1));
                                  setPurchaseInstallmentsCount(val);
                                  generateDefaultPurchaseInstallments(val, purchaseTotalCost);
                                }}
                                className="w-full p-2 rounded-lg border border-border bg-card font-mono text-center font-bold text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Listagem e edição individual de parcelas da compra */}
                        {generatedPurchaseInstallments.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Vencimentos & Valores da Compra</span>
                            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                              {generatedPurchaseInstallments.map((inst, idx) => (
                                <div key={inst.number} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/40">
                                  <span className="col-span-3 font-semibold text-[10px] text-muted-foreground text-center">#{inst.number}</span>
                                  
                                  <div className="col-span-5 relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      value={inst.amount}
                                      onChange={(e) => handleUpdatePurchaseInstallmentAmount(idx, parseFloat(e.target.value) || 0)}
                                      className="w-full pl-7 pr-1 py-1 rounded border border-border bg-card font-mono text-xs"
                                    />
                                  </div>

                                  <input
                                    type="date"
                                    value={inst.dueDate}
                                    onChange={(e) => handleUpdatePurchaseInstallmentDate(idx, e.target.value)}
                                    className="col-span-4 p-1 rounded border border-border bg-card font-mono text-[10px]"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Validação de soma */}
                            {Math.abs(purchaseTotalCost - generatedPurchaseInstallments.reduce((sum, item) => sum + item.amount, 0)) > 0.01 && (
                              <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded-lg text-[10px] flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4 shrink-0" />
                                <span>Diferença: <strong>{formatCurrency(purchaseTotalCost - generatedPurchaseInstallments.reduce((sum, item) => sum + item.amount, 0))}</strong>.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resumo Valor Total Compra */}
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs font-bold flex justify-between">
                    <span>TOTAL FATURADO COMPRA</span>
                    <span className="font-mono">{formatCurrency(purchaseItems.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0))}</span>
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
                  disabled={
                    (drawerType === "purchase" && purchaseItems.length === 0) ||
                    (drawerType === "purchase" && (purchasePaymentMethod === "bank_slip" || purchasePaymentMethod === "credit_card") && 
                     Math.abs(generatedPurchaseInstallments.reduce((sum, item) => sum + item.amount, 0) - purchaseTotalCost) > 0.02)
                  }
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
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
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
