"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/context/AuthContext";
import {
  BankAccount,
  CompanyCreditCard,
  FinancialTransaction,
  AccountsReceivable,
  AccountsPayable,
  Purchase
} from "@/features/finance/types";
import {
  BankAccountSchema,
  CompanyCreditCardSchema,
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
  ShieldAlert,
  CreditCard as CardIcon,
  Check,
  Lock,
  PieChart,
  RefreshCw
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// Lista de Bancos Brasileiros para o seletor visual
export const BRAZILIAN_BANKS = [
  { code: "001", name: "Banco do Brasil", color: "bg-yellow-500 text-blue-900 border-yellow-600", brand: "BB" },
  { code: "033", name: "Santander", color: "bg-red-600 text-white border-red-700", brand: "San" },
  { code: "104", name: "Caixa Econômica", color: "bg-blue-600 text-orange-400 border-blue-700", brand: "Caixa" },
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
  { name: "Caixa Físico / Gaveta", bankName: "Caixa Interno", type: "cash_register" as const, balance: 350.00, currency: "BRL", status: "active" as const },
  { name: "Banco Itaú PJ", bankName: "Itaú Unibanco", bankCode: "341", agency: "1234", accountNumber: "56789", accountDigit: "0", type: "checking" as const, balance: 8450.00, currency: "BRL", status: "active" as const },
  { name: "Carteira Digital Shopee", bankName: "Shopee Pay", type: "wallet" as const, balance: 1290.00, currency: "BRL", status: "active" as const }
];

// Mock Inicial de Cartões Corporativos
const INITIAL_COMPANY_CARDS = [
  {
    name: "Cartão Corporativo Itaú Black",
    issuerBank: "Itaú Unibanco",
    flag: "visa" as const,
    lastFourDigits: "4589",
    nameOnCard: "CAROL RAMOS",
    totalLimit: 25000.00,
    availableLimit: 19850.00,
    closingDay: 25,
    dueDay: 5,
    responsiblePerson: "Carol Ramos",
    status: "active" as const,
    notes: "Cartão principal para compras de estoque importado"
  }
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
  const { createDoc, getDocs, updateDoc, deleteDoc, softDeleteDoc, invalidateCache } = useDb();

  const [activeTab, setActiveTab] = useState<"cashflow" | "accounts" | "cards" | "payable" | "receivable" | "purchases" | "dre">("cashflow");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, searchQuery]);
  const [loading, setLoading] = useState(true);

  // DB Lists
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [companyCards, setCompanyCards] = useState<CompanyCreditCard[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Drawer Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"transaction" | "bank_account" | "company_card" | "payable" | "receivable" | "purchase">("transaction");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  // 1. Transaction
  const [tType, setTType] = useState<'revenue' | 'expense'>("expense");
  const [tCategory, setTCategory] = useState<'sale' | 'rent' | 'marketing' | 'salary' | 'stock_purchase' | 'cash_register_adjustment' | 'card_invoice_payment' | 'other'>("other");
  const [tAmount, setTAmount] = useState(0);
  const [tDesc, setTDesc] = useState("");
  const [tDate, setTDate] = useState("");
  const [tBankAccountId, setTBankAccountId] = useState("");

  // 2. Custom Bank Account
  const [bName, setBName] = useState("");
  const [bBankName, setBBankName] = useState("");
  const [bBankCode, setBBankCode] = useState("");
  const [bAgency, setBAgency] = useState("");
  const [bAccountNumber, setBAccountNumber] = useState("");
  const [bAccountDigit, setBAccountDigit] = useState("");
  const [bType, setBType] = useState<'checking' | 'savings' | 'wallet' | 'cash_register' | 'payment' | 'investment' | 'other'>("checking");
  const [bHolderName, setBHolderName] = useState("");
  const [bHolderCpfCnpj, setBHolderCpfCnpj] = useState("");
  const [bPixKey, setBPixKey] = useState("");
  const [bBalance, setBBalance] = useState(0);
  const [bInitialBalance, setBInitialBalance] = useState(0);
  const [bNotes, setBNotes] = useState("");
  const [bStatus, setBStatus] = useState<'active' | 'inactive'>("active");

  // 3. Corporate Credit Card
  const [cName, setCName] = useState("");
  const [cIssuerBank, setCIssuerBank] = useState("");
  const [cFlag, setCFlag] = useState<'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other'>("visa");
  const [cLast4, setCLast4] = useState("");
  const [cNameOnCard, setCNameOnCard] = useState("");
  const [cTotalLimit, setCTotalLimit] = useState(0);
  const [cAvailableLimit, setCAvailableLimit] = useState(0);
  const [cClosingDay, setCClosingDay] = useState(25);
  const [cDueDay, setCDueDay] = useState(5);
  const [cLinkedBankAccountId, setCLinkedBankAccountId] = useState("");
  const [cResponsiblePerson, setCResponsiblePerson] = useState("");
  const [cStatus, setCStatus] = useState<'active' | 'inactive' | 'blocked'>("active");
  const [cNotes, setCNotes] = useState("");

  // 4. Purchase Form Fields
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState("");
  const [purchaseCategory, setPurchaseCategory] = useState("stock_purchase");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([]);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'credit_card' | 'company_credit_card' | 'bank_slip' | 'pix' | 'cash' | 'transfer' | 'bank_account'>("pix");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [purchaseDueDate, setPurchaseDueDate] = useState("");
  const [purchaseInstallmentsCount, setPurchaseInstallmentsCount] = useState(1);
  const [generatedPurchaseInstallments, setGeneratedPurchaseInstallments] = useState<Array<{ number: number; amount: number; dueDate: string }>>([]);
  const [purchaseDiscount, setPurchaseDiscount] = useState(0);
  const [purchaseAddition, setPurchaseAddition] = useState(0);
  const [purchaseFreight, setPurchaseFreight] = useState(0);

  // Common errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment Confirmation Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayId, setSelectedPayId] = useState<string | null>(null);
  const [selectedReceiveId, setSelectedReceiveId] = useState<string | null>(null);
  const [paymentBankAccountId, setPaymentBankAccountId] = useState("");

  // Invoice Payment Modal State
  const [cardInvoiceModalOpen, setCardInvoiceModalOpen] = useState(false);
  const [selectedCardForInvoice, setSelectedCardForInvoice] = useState<CompanyCreditCard | null>(null);
  const [invoicePayAmount, setInvoicePayAmount] = useState(0);
  const [invoiceBankAccountId, setInvoiceBankAccountId] = useState("");

  // Bank Selector State
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankObj, setSelectedBankObj] = useState<any>(null);

  const purchaseSubtotalCost = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  const purchaseTotalCost = Math.max(0, purchaseSubtotalCost - (purchaseDiscount || 0) + (purchaseAddition || 0) + (purchaseFreight || 0));

  const generateDefaultPurchaseInstallments = (count: number, totalVal: number, dueDayNum?: number) => {
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
      d.setMonth(d.getMonth() + i);
      if (dueDayNum && dueDayNum >= 1 && dueDayNum <= 28) {
        d.setDate(dueDayNum);
      }
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
    if (purchasePaymentMethod === "bank_slip" || purchasePaymentMethod === "credit_card" || purchasePaymentMethod === "company_credit_card") {
      const cardObj = companyCards.find(c => c.id === selectedCardId);
      generateDefaultPurchaseInstallments(purchaseInstallmentsCount, purchaseTotalCost, cardObj?.dueDay);
    } else {
      setGeneratedPurchaseInstallments([]);
    }
  }, [purchaseTotalCost, purchasePaymentMethod, purchaseInstallmentsCount, selectedCardId]);

  // Load All Financial Data
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      let [bAccounts, cCards, trans, pays, recs, purcs, prods, supps] = await Promise.all([
        getDocs("bank_accounts"),
        getDocs("company_credit_cards"),
        getDocs("financial_transactions"),
        getDocs("accounts_payable"),
        getDocs("accounts_receivable"),
        getDocs("purchases"),
        getDocs("products"),
        getDocs("suppliers")
      ]);

      bAccounts = (bAccounts as BankAccount[]) || [];
      cCards = (cCards as CompanyCreditCard[]) || [];
      trans = (trans as FinancialTransaction[]) || [];
      pays = (pays as AccountsPayable[]) || [];
      recs = (recs as AccountsReceivable[]) || [];
      purcs = (purcs as Purchase[]) || [];
      prods = (prods as Product[]) || [];
      supps = (supps as Supplier[]) || [];

      const isFinSeeded = typeof window !== "undefined" && localStorage.getItem("seeded_financial_v1") === "true";

      // Pre-seed bank accounts
      let needsRefetchBank = false;
      if (bAccounts.length === 0 && !isFinSeeded) {
        await Promise.all(INITIAL_BANK_ACCOUNTS.map(ba => createDoc("bank_accounts", ba)));
        if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
        needsRefetchBank = true;
      }
      if (needsRefetchBank) {
        bAccounts = (await getDocs("bank_accounts") as BankAccount[]) || [];
      }

      // Pre-seed credit cards
      let needsRefetchCards = false;
      if (cCards.length === 0 && !isFinSeeded) {
        await Promise.all(INITIAL_COMPANY_CARDS.map(cc => createDoc("company_credit_cards", cc)));
        if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
        needsRefetchCards = true;
      }
      if (needsRefetchCards) {
        cCards = (await getDocs("company_credit_cards") as CompanyCreditCard[]) || [];
      }

      const bankIds = (bAccounts as any[]).map((b: any) => b.id);
      const supplierIds = (supps as any[]).map((s: any) => s.id);

      // Pre-seed other entities in parallel
      let needsRefetchOthers = false;
      const seedPromises = [];

      if (trans.length === 0 && !isFinSeeded) {
        seedPromises.push(Promise.all(INITIAL_TRANSACTIONS(bankIds).map(t => createDoc("financial_transactions", t))));
        needsRefetchOthers = true;
      }
      if (pays.length === 0 && !isFinSeeded) {
        seedPromises.push(Promise.all(INITIAL_PAYABLES(supplierIds).map(p => createDoc("accounts_payable", p))));
        needsRefetchOthers = true;
      }
      if (recs.length === 0 && !isFinSeeded) {
        seedPromises.push(Promise.all(INITIAL_RECEIVABLES.map(r => createDoc("accounts_receivable", r))));
        needsRefetchOthers = true;
      }

      if (seedPromises.length > 0) {
        await Promise.all(seedPromises);
        if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
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
      setCompanyCards(cCards);
      setTransactions(trans);
      setPayables(pays);
      setReceivables(recs);
      setPurchases(purcs);
      setProducts(prods);
      setSuppliers(supps);

      if (bAccounts.length > 0 && bAccounts[0]) {
        setTBankAccountId(bAccounts[0].id);
        setPaymentBankAccountId(bAccounts[0].id);
        setInvoiceBankAccountId(bAccounts[0].id);
      }
      if (cCards.length > 0 && cCards[0]) {
        setSelectedCardId(cCards[0].id);
      }
    } catch (e) {
      console.error("Erro ao sincronizar finanças:", e);
      setBankAccounts([]);
      setCompanyCards([]);
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
    loadFinancialData();
  }, [tenantId]);

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
    setBBankName("");
    setBBankCode("");
    setBAgency("");
    setBAccountNumber("");
    setBAccountDigit("");
    setBType("checking");
    setBHolderName("");
    setBHolderCpfCnpj("");
    setBPixKey("");
    setBBalance(0);
    setBInitialBalance(0);
    setBNotes("");
    setBStatus("active");
    setSelectedBankObj(null);

    setCName("");
    setCIssuerBank("");
    setCFlag("visa");
    setCLast4("");
    setCNameOnCard("");
    setCTotalLimit(0);
    setCAvailableLimit(0);
    setCClosingDay(25);
    setCDueDay(5);
    setCLinkedBankAccountId(bankAccounts[0]?.id || "");
    setCResponsiblePerson("");
    setCStatus("active");
    setCNotes("");

    setSelectedSupplierId(suppliers[0]?.id || "");
    setPurchaseInvoiceNumber("");
    setPurchaseCategory("stock_purchase");
    setPurchaseNotes("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseItems([]);
    setPurchasePaymentMethod("pix");
    if (companyCards.length > 0) setSelectedCardId(companyCards[0].id);
    setPurchaseDueDate(new Date().toISOString().split("T")[0]);
    setPurchaseInstallmentsCount(1);
    setGeneratedPurchaseInstallments([]);
    setPurchaseDiscount(0);
    setPurchaseAddition(0);
    setPurchaseFreight(0);

    setDrawerOpen(true);
  };

  // 1b. Abrir Drawer de Edição de Conta Bancária
  const handleEditBankAccount = (account: BankAccount) => {
    setDrawerType("bank_account");
    setEditingId(account.id);
    setErrors({});
    setBName(account.name);
    setBBankName(account.bankName || "");
    setBBankCode(account.bankCode || "");
    setBAgency(account.agency || "");
    setBAccountNumber(account.accountNumber || "");
    setBAccountDigit(account.accountDigit || "");
    setBType(account.type as any);
    setBHolderName(account.holderName || "");
    setBHolderCpfCnpj(account.holderCpfCnpj || "");
    setBPixKey(account.pixKey || "");
    setBBalance(account.balance);
    setBInitialBalance(account.initialBalance || account.balance);
    setBNotes(account.notes || "");
    setBStatus(account.status || "active");
    setDrawerOpen(true);
  };

  // 1b2. Abrir Drawer de Edição de Compra de Estoque
  const handleEditPurchase = (purchase: Purchase) => {
    setDrawerType("purchase");
    setEditingId(purchase.id);
    setErrors({});
    setSelectedSupplierId(purchase.supplierId || suppliers[0]?.id || "");
    setPurchaseInvoiceNumber(purchase.invoiceNumber || "");
    setPurchaseCategory(purchase.category || "stock_purchase");
    setPurchaseNotes(purchase.notes || "");
    setPurchaseDate(purchase.receivedAt ? String(purchase.receivedAt).substring(0, 10) : new Date().toISOString().split("T")[0]);
    setPurchaseItems(
      (purchase.items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
      }))
    );
    setPurchasePaymentMethod(purchase.paymentMethod || "pix");
    setSelectedCardId(purchase.cardId || companyCards[0]?.id || "");
    setPurchaseDueDate(purchase.dueDate || new Date().toISOString().split("T")[0]);
    setPurchaseInstallmentsCount(purchase.installments || 1);
    setPurchaseDiscount(purchase.discount || 0);
    setPurchaseAddition(purchase.addition || 0);
    setPurchaseFreight(purchase.freight || 0);
    setDrawerOpen(true);
  };

  // 1c. Excluir Conta Bancária
  const handleDeleteBankAccount = async (id: string, name: string) => {
    if (!confirm(`Deseja mover a conta "${name}" para a Lixeira Inteligente?`)) return;
    try {
      if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
      await softDeleteDoc("bank_accounts", id, "Contas Bancárias", name);
      invalidateCache("bank_accounts");
      setBankAccounts(prev => prev.filter(b => b.id !== id));
      await loadFinancialData();
    } catch (err: any) {
      console.error("Erro ao excluir conta bancária:", err);
      alert("Erro ao excluir conta: " + (err.message || "tente novamente."));
    }
  };

  // 1d. Abrir Drawer de Edição de Cartão Corporativo
  const handleEditCompanyCard = (card: CompanyCreditCard) => {
    setDrawerType("company_card");
    setEditingId(card.id);
    setErrors({});
    setCName(card.name);
    setCIssuerBank(card.issuerBank);
    setCFlag(card.flag);
    setCLast4(card.lastFourDigits);
    setCNameOnCard(card.nameOnCard);
    setCTotalLimit(card.totalLimit);
    setCAvailableLimit(card.availableLimit);
    setCClosingDay(card.closingDay);
    setCDueDay(card.dueDay);
    setCLinkedBankAccountId(card.linkedBankAccountId || "");
    setCResponsiblePerson(card.responsiblePerson || "");
    setCStatus(card.status);
    setCNotes(card.notes || "");
    setDrawerOpen(true);
  };

  // 1e. Excluir Cartão Corporativo
  const handleDeleteCompanyCard = async (id: string, name: string) => {
    if (!confirm(`Deseja mover o cartão "${name}" para a Lixeira Inteligente?`)) return;
    try {
      if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
      await softDeleteDoc("company_credit_cards", id, "Cartões Corporativos", name);
      invalidateCache("company_credit_cards");
      setCompanyCards(prev => prev.filter(c => c.id !== id));
      await loadFinancialData();
    } catch (err: any) {
      console.error("Erro ao excluir cartão:", err);
      alert("Erro ao excluir cartão: " + (err.message || "tente novamente."));
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
        const payload = {
          name: bName || "",
          bankName: bBankName || bName || "",
          bankCode: bBankCode || "",
          agency: bAgency || "",
          accountNumber: bAccountNumber || "",
          accountDigit: bAccountDigit || "",
          type: bType || "checking",
          holderName: bHolderName || "",
          holderCpfCnpj: bHolderCpfCnpj || "",
          pixKey: bPixKey || "",
          balance: bBalance || 0,
          initialBalance: bInitialBalance || bBalance || 0,
          notes: bNotes || "",
          status: bStatus || "active",
          currency: "BRL"
        };
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
          await createDoc("bank_accounts", payload);
        }
      } 
      
      else if (drawerType === "company_card") {
        const payload = {
          name: cName || "",
          issuerBank: cIssuerBank || "",
          flag: cFlag || "visa",
          lastFourDigits: cLast4 || "0000",
          nameOnCard: cNameOnCard || "",
          totalLimit: cTotalLimit || 0,
          availableLimit: cAvailableLimit > cTotalLimit ? cTotalLimit : cAvailableLimit,
          closingDay: cClosingDay || 1,
          dueDay: cDueDay || 10,
          linkedBankAccountId: cLinkedBankAccountId || "",
          responsiblePerson: cResponsiblePerson || "",
          status: cStatus || "active",
          notes: cNotes || "",
        };

        const result = CompanyCreditCardSchema.safeParse(payload);
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.issues.forEach(i => errs[i.path.join(".")] = i.message);
          setErrors(errs);
          return;
        }

        if (editingId) {
          await updateDoc("company_credit_cards", editingId, { ...payload, updatedAt: new Date().toISOString() });
        } else {
          await createDoc("company_credit_cards", payload);
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
        const subtotalVal = purchaseSubtotalCost;
        const discountVal = Math.max(0, purchaseDiscount || 0);
        const additionVal = Math.max(0, purchaseAddition || 0);
        const freightVal = Math.max(0, purchaseFreight || 0);
        const totalVal = Math.max(0, subtotalVal - discountVal + additionVal + freightVal);

        const itemsPayload = purchaseItems.map(item => ({
          productId: item.productId,
          name: products.find(p => p.id === item.productId)?.name || "Produto",
          quantity: item.quantity,
          unitCost: item.unitCost
        }));

        const payload = {
          supplierId: selectedSupplierId,
          invoiceNumber: purchaseInvoiceNumber || undefined,
          category: purchaseCategory || "stock_purchase",
          notes: purchaseNotes || undefined,
          items: itemsPayload,
          subtotal: subtotalVal,
          discount: discountVal,
          addition: additionVal,
          freight: freightVal,
          total: totalVal,
          paymentMethod: purchasePaymentMethod,
          cardId: (purchasePaymentMethod === "company_credit_card" || purchasePaymentMethod === "credit_card") ? selectedCardId : undefined,
          dueDate: purchaseDueDate || undefined,
          receivedAt: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString()
        };

        const result = PurchaseSchema.safeParse(payload);
        if (!result.success) {
          alert(result.error.issues[0].message);
          return;
        }

        if (editingId) {
          // --- MODO EDIÇÃO COMPRA EXISTENTE ---
          const oldPurchase = purchases.find((p) => p.id === editingId);

          await updateDoc("purchases", editingId, {
            ...payload,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.email || user?.uid || "admin"
          });

          // Ajuste fino do Estoque calculando apenas a diferença (Delta) entre a compra antiga e a nova
          const oldQtyMap: Record<string, number> = {};
          if (oldPurchase && oldPurchase.items) {
            oldPurchase.items.forEach((item) => {
              oldQtyMap[item.productId] = (oldQtyMap[item.productId] || 0) + item.quantity;
            });
          }

          const newQtyMap: Record<string, number> = {};
          purchaseItems.forEach((item) => {
            newQtyMap[item.productId] = (newQtyMap[item.productId] || 0) + item.quantity;
          });

          const allProductIds = Array.from(
            new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)])
          );

          for (const prodId of allProductIds) {
            const oldQty = oldQtyMap[prodId] || 0;
            const newQty = newQtyMap[prodId] || 0;
            const deltaQty = newQty - oldQty;

            if (deltaQty !== 0) {
              const prod = products.find((p) => p.id === prodId);
              if (prod) {
                const newStock = Math.max(0, prod.currentStock + deltaQty);
                const newAvailable = Math.max(0, prod.availableStock + deltaQty);

                const newItem = purchaseItems.find((i) => i.productId === prodId);
                const unitCost = newItem ? newItem.unitCost : prod.costPrice;

                const currentAssetVal = prod.currentStock * prod.averageCost;
                const deltaAssetVal = deltaQty * unitCost;
                const finalAvgCost = newStock > 0
                  ? parseFloat((Math.max(0, currentAssetVal + deltaAssetVal) / newStock).toFixed(2))
                  : prod.averageCost;

                const calculatedMargin = prod.sellPrice > 0
                  ? parseFloat((((prod.sellPrice - unitCost) / prod.sellPrice) * 100).toFixed(1))
                  : prod.profitMargin;

                await updateDoc("products", prod.id, {
                  currentStock: newStock,
                  availableStock: newAvailable,
                  costPrice: unitCost,
                  averageCost: finalAvgCost,
                  lastPurchasePrice: unitCost,
                  lastPurchaseDate: new Date().toISOString(),
                  profitMargin: calculatedMargin
                });

                await createDoc("inventory_transactions", {
                  productId: prod.id,
                  locationId: "deposito-central",
                  type: deltaQty > 0 ? ("in" as const) : ("out" as const),
                  quantity: Math.abs(deltaQty),
                  costPriceAtTime: unitCost,
                  reason: `Edição da Ordem de Compra Ref #${editingId}`
                });
              }
            }
          }
        } else {
          // --- MODO CRIAÇÃO NOVA COMPRA ---
          const newPurchase = await createDoc("purchases", {
            ...payload,
            status: "completed" as const,
            createdAt: new Date().toISOString(),
            createdBy: user?.email || user?.uid || "admin"
          });

          // Incrementar Estoques dos Produtos & Atualizar Preços de Custos
          for (const item of purchaseItems) {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
              const newStock = prod.currentStock + item.quantity;
              const newAvailable = prod.availableStock + item.quantity;
              
              const currentAssetVal = prod.currentStock * prod.averageCost;
              const newPurchaseVal = item.quantity * item.unitCost;
              const finalAvgCost = parseFloat(((currentAssetVal + newPurchaseVal) / newStock).toFixed(2));
              
              const calculatedMargin = prod.sellPrice > 0 
                ? parseFloat((((prod.sellPrice - item.unitCost) / prod.sellPrice) * 100).toFixed(1)) 
                : 0;

              await updateDoc("products", prod.id, {
                currentStock: newStock,
                availableStock: newAvailable,
                costPrice: item.unitCost,
                averageCost: finalAvgCost,
                lastPurchasePrice: item.unitCost,
                lastPurchaseDate: new Date().toISOString(),
                profitMargin: calculatedMargin
              });

              await createDoc("inventory_transactions", {
                productId: prod.id,
                locationId: "deposito-central",
                type: "in" as const,
                quantity: item.quantity,
                costPriceAtTime: item.unitCost,
                reason: `Ordem de Compra Ref #${newPurchase.id}`
              });
            }
          }

          // Fluxo Financeiro da Compra:
          if (purchasePaymentMethod === "company_credit_card" || purchasePaymentMethod === "credit_card") {
            const targetCard = companyCards.find(c => c.id === selectedCardId);
            if (targetCard) {
              const newLimit = Math.max(0, targetCard.availableLimit - totalVal);
              await updateDoc("company_credit_cards", targetCard.id, {
                availableLimit: newLimit
              });
            }

            for (const inst of generatedPurchaseInstallments) {
              await createDoc("accounts_payable", {
                supplierId: selectedSupplierId || undefined,
                purchaseId: newPurchase.id,
                cardId: selectedCardId || undefined,
                description: `Fatura Cartão: Parcela ${inst.number}/${generatedPurchaseInstallments.length} - Ref #${newPurchase.id}`,
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: "pending" as const,
                paymentMethod: "company_credit_card" as const
              });
            }
          } else if (purchasePaymentMethod === "pix" || purchasePaymentMethod === "cash") {
            const targetBankId = purchasePaymentMethod === "pix" ? bankAccounts[1]?.id : bankAccounts[0]?.id;
            if (targetBankId) {
              const acc = bankAccounts.find(a => a.id === targetBankId);
              if (acc) {
                await updateDoc("bank_accounts", targetBankId, { balance: acc.balance - totalVal });
              }
              await createDoc("financial_transactions", {
                type: "expense" as const,
                category: "stock_purchase" as const,
                amount: totalVal,
                description: `Compra de Estoque Ref #${newPurchase.id}`,
                paymentDate: new Date().toISOString().split("T")[0],
                status: "paid" as const,
                bankAccountId: targetBankId,
                referenceId: newPurchase.id
              });
            }
          } else {
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
      }

      setDrawerOpen(false);
      await loadFinancialData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar.");
    }
  };

  // 5. Baixar Conta a Pagar
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

        await updateDoc("bank_accounts", paymentBankAccountId, {
          balance: bankAcc.balance - payDoc.amount
        });

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

        await updateDoc("accounts_payable", selectedPayId, {
          status: "paid" as const,
          paidAmount: payDoc.amount,
          paidDate: new Date().toISOString()
        });
      } 
      
      else if (selectedReceiveId) {
        const recDoc = receivables.find(r => r.id === selectedReceiveId);
        if (!recDoc) throw new Error("Documento não encontrado.");

        await updateDoc("bank_accounts", paymentBankAccountId, {
          balance: bankAcc.balance + recDoc.amount
        });

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

  // 6. Pagamento de Fatura do Cartão Corporativo
  const handleOpenCardInvoiceModal = (card: CompanyCreditCard) => {
    setSelectedCardForInvoice(card);
    const usedAmount = card.totalLimit - card.availableLimit;
    setInvoicePayAmount(usedAmount > 0 ? usedAmount : 0);
    setCardInvoiceModalOpen(true);
  };

  const handleConfirmInvoicePayment = async () => {
    if (!selectedCardForInvoice || !invoiceBankAccountId || invoicePayAmount <= 0) return;
    setLoading(true);

    try {
      const bankAcc = bankAccounts.find(a => a.id === invoiceBankAccountId);
      if (!bankAcc) throw new Error("Conta bancária não encontrada.");

      // Debitar valor da conta bancária
      await updateDoc("bank_accounts", invoiceBankAccountId, {
        balance: bankAcc.balance - invoicePayAmount
      });

      // Restaurar limite do cartão
      const newAvailableLimit = Math.min(selectedCardForInvoice.totalLimit, selectedCardForInvoice.availableLimit + invoicePayAmount);
      await updateDoc("company_credit_cards", selectedCardForInvoice.id, {
        availableLimit: newAvailableLimit
      });

      // Registrar transação financeira de pagamento de fatura
      await createDoc("financial_transactions", {
        type: "expense" as const,
        category: "card_invoice_payment" as const,
        amount: invoicePayAmount,
        description: `Pagamento Fatura: ${selectedCardForInvoice.name} (${selectedCardForInvoice.lastFourDigits})`,
        paymentDate: new Date().toISOString().split("T")[0],
        status: "paid" as const,
        bankAccountId: invoiceBankAccountId,
        cardId: selectedCardForInvoice.id
      });

      setCardInvoiceModalOpen(false);
      await loadFinancialData();
    } catch (e: any) {
      alert(e.message || "Erro ao processar pagamento da fatura.");
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
    if (confirm(`Deseja mover "${desc}" para a Lixeira Inteligente?`)) {
      try {
        if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
        const moduleLabel = collection === "financial_transactions" ? "Fluxo de Caixa"
          : collection === "accounts_payable" ? "Contas a Pagar"
          : collection === "accounts_receivable" ? "Contas a Receber"
          : collection === "purchases" ? "Compras de Estoque"
          : "Financeiro";

        await softDeleteDoc(collection, id, moduleLabel, desc);
        invalidateCache(collection);
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        await loadFinancialData();
      } catch (err: any) {
        alert(err.message || "Erro ao deletar.");
      }
    }
  };

  // Batch Handlers (Financeiro - Fluxo de Caixa / Lançamentos)
  const toggleSelectAllTransactions = (filteredList: any[]) => {
    if (selectedIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(item => item.id));
    }
  };

  const toggleSelectDocTransaction = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBatchDeleteTransactions = async (collection: string) => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja mover os ${selectedIds.length} registros selecionados para a Lixeira Inteligente?`)) {
      try {
        if (typeof window !== "undefined") localStorage.setItem("seeded_financial_v1", "true");
        const moduleLabel = collection === "financial_transactions" ? "Fluxo de Caixa"
          : collection === "accounts_payable" ? "Contas a Pagar"
          : collection === "accounts_receivable" ? "Contas a Receber"
          : collection === "purchases" ? "Compras de Estoque"
          : "Financeiro";

        for (const id of selectedIds) {
          let desc = "Registro Financeiro";
          if (collection === "financial_transactions") {
            const item = transactions.find(t => t.id === id);
            if (item) desc = item.description;
          } else if (collection === "accounts_payable") {
            const item = payables.find(p => p.id === id);
            if (item) desc = item.description;
          } else if (collection === "accounts_receivable") {
            const item = receivables.find(r => r.id === id);
            if (item) desc = item.description;
          }
          await softDeleteDoc(collection, id, moduleLabel, desc);
        }

        invalidateCache(collection);
        setSelectedIds([]);
        await loadFinancialData();
        alert(`${selectedIds.length} registros movidos para a Lixeira com sucesso.`);
      } catch (err: any) {
        alert(err.message || "Erro na exclusão em lote.");
      }
    }
  };

  const handleBatchExportTransactions = () => {
    if (selectedIds.length === 0) return;
    const selectedTrans = transactions.filter(t => selectedIds.includes(t.id));
    let csvContent = `data:text/csv;charset=utf-8,Data;Tipo;Categoria;Descricao;Valor;Status\n`;
    selectedTrans.forEach(t => {
      csvContent += `"${t.paymentDate}";"${t.type}";"${t.category}";"${t.description}";"${t.amount}";"${t.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lancamentos_Financeiros_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DRE de Caixa Simplificado (Cálculo)
  const getDREData = () => {
    const revenueTx = transactions.filter(t => t.type === "revenue" && t.status === "paid");
    const expenseTx = transactions.filter(t => t.type === "expense" && t.status === "paid");

    const totalRevenues = revenueTx.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalRevenues - totalExpenses;
    
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

  // Filtragem local por busca
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
      case "card_invoice_payment": return "Fatura de Cartão";
      default: return "Outras Despesas";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Controle <span className="font-semibold text-rosegold-500">Financeiro & Compras</span></h1>
          <p className="text-xs text-muted-foreground">Tesouraria SaaS, fluxo de caixa, cartões corporativos, contas a pagar/receber e compras de fornecedores.</p>
        </div>

        {activeTab !== "dre" && activeTab !== "accounts" && activeTab !== "cards" && (
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
            <span>+ Nova Conta Bancária</span>
          </button>
        )}

        {activeTab === "cards" && (
          <button
            onClick={() => handleOpenDrawer("company_card")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>+ Novo Cartão</span>
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
            { id: "cards", label: "Cartões da Empresa", icon: CardIcon },
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

        {/* Barra de Pesquisa */}
        {activeTab !== "dre" && activeTab !== "accounts" && activeTab !== "cards" && (
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
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                          onChange={() => toggleSelectAllTransactions(paginatedTransactions)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </th>
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
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum lançamento financeiro registrado.</td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((t) => {
                        const isSelected = selectedIds.includes(t.id);
                        return (
                          <tr key={t.id} className={cn("transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/10")}>
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectDocTransaction(t.id)}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </td>
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
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tela 2: Contas Bancárias & Saldos */}
            {activeTab === "accounts" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Contas Bancárias Cadastradas</h3>
                  <button
                    onClick={() => handleOpenDrawer("bank_account")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Nova Conta Bancária</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bankAccounts.map((a) => {
                    const bankMatch = BRAZILIAN_BANKS.find(b => 
                      a.name.toLowerCase().includes(b.name.toLowerCase()) || 
                      a.name.toLowerCase().includes(b.brand.toLowerCase()) ||
                      (a.bankName && a.bankName.toLowerCase().includes(b.name.toLowerCase()))
                    );

                    return (
                      <div key={a.id} className="p-5 rounded-xl border border-border bg-card/50 flex flex-col justify-between hover:border-primary/30 transition-all select-none group relative">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-foreground truncate block">{a.name}</span>
                            {a.bankName && <span className="text-[10px] text-muted-foreground block">{a.bankName}</span>}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="px-1.5 py-0.5 rounded bg-muted text-[8px] font-bold text-muted-foreground tracking-wider uppercase inline-block">
                                {a.type === "checking" ? "Corrente" : a.type === "savings" ? "Poupança" : a.type === "wallet" ? "Digital" : a.type === "cash_register" ? "Caixa" : a.type === "payment" ? "Pagamento" : a.type === "investment" ? "Investimento" : "Outro"}
                              </span>
                              {a.status === "inactive" && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[8px] font-bold uppercase">
                                  Inativa
                                </span>
                              )}
                            </div>
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

                        {(a.agency || a.accountNumber) && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-2">
                            Ag: {a.agency || "-"} | C/C: {a.accountNumber}{a.accountDigit ? `-${a.accountDigit}` : ""}
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground uppercase">Saldo Atual</span>
                          <h4 className="text-xl font-bold font-mono tracking-tight text-foreground">
                            {formatCurrency(a.balance)}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tela 3: Cartões da Empresa & Faturas */}
            {activeTab === "cards" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Cartões Corporativos da Empresa</h3>
                    <p className="text-xs text-muted-foreground">Gestão de cartões corporativos, parcelamentos de compras e controle de limites da fatura.</p>
                  </div>
                  <button
                    onClick={() => handleOpenDrawer("company_card")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Novo Cartão</span>
                  </button>
                </div>

                {/* Cards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companyCards.map((card) => {
                    const usedAmount = card.totalLimit - card.availableLimit;
                    const usedPercentage = Math.min(100, Math.max(0, (usedAmount / card.totalLimit) * 100));

                    return (
                      <div key={card.id} className="p-5 rounded-2xl border border-border bg-gradient-to-br from-card/80 via-card/40 to-muted/20 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-lg group relative overflow-hidden">
                        {/* Status bar */}
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider">
                            {card.flag.toUpperCase()} • CORPORATIVO
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCompanyCard(card)}
                              title="Editar cartão"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCompanyCard(card.id, card.name)}
                              title="Excluir cartão"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Name and Visual details */}
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-foreground leading-snug">{card.name}</h4>
                          <p className="text-xs text-muted-foreground">{card.issuerBank} • Final {card.lastFourDigits}</p>
                          <p className="text-[11px] font-mono font-medium text-foreground uppercase tracking-widest mt-1">{card.nameOnCard}</p>
                        </div>

                        {/* Limit Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Utilizado: <strong className="text-foreground">{formatCurrency(usedAmount)}</strong></span>
                            <span className="text-muted-foreground">Limite: <strong className="text-foreground">{formatCurrency(card.totalLimit)}</strong></span>
                          </div>

                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500 rounded-full",
                                usedPercentage > 85 ? "bg-red-500" : usedPercentage > 60 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${usedPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border/40 pt-3">
                          <div>
                            <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Limite Disponível</span>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(card.availableLimit)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Vencimento Fatura</span>
                            <span className="font-semibold text-foreground">Dia {card.dueDay} (Melhor: {card.closingDay + 1})</span>
                          </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-2">
                          <button
                            onClick={() => handleOpenCardInvoiceModal(card)}
                            disabled={usedAmount <= 0}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <DollarSign className="h-4 w-4" />
                            <span>Pagar Fatura ({formatCurrency(usedAmount)})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {companyCards.length === 0 && (
                    <div className="col-span-full py-16 text-center text-muted-foreground space-y-3">
                      <CardIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
                      <p className="text-sm font-medium">Nenhum cartão corporativo cadastrado.</p>
                      <button
                        onClick={() => handleOpenDrawer("company_card")}
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Cadastrar Primeiro Cartão</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabela 4: Contas a Pagar */}
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
                            <td className="p-4 uppercase text-[10px] text-muted-foreground">{p.paymentMethod === "company_credit_card" ? "Cartão Corporativo" : p.paymentMethod || "Boleto"}</td>
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

            {/* Tabela 5: Contas a Receber */}
            {activeTab === "receivable" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Cliente / Descrição</th>
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
                      paginatedReceivables.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-foreground">{r.description}</div>
                          </td>
                          <td className="p-4 font-mono">{formatDate(r.dueDate)}</td>
                          <td className="p-4 font-mono font-bold text-foreground">{formatCurrency(r.amount)}</td>
                          <td className="p-4 uppercase text-[10px] text-muted-foreground">{r.paymentMethod || "Cartão"}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                              r.status === "paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/30"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/30"
                            )}>
                              {r.status === "paid" ? "Recebido" : "Pendente"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {r.status === "pending" && (
                                <button
                                  onClick={() => handleOpenReceiveModal(r.id)}
                                  className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-950/50 hover:bg-green-600 hover:text-white font-semibold text-[10px] transition-colors"
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabela 6: Compras de Estoque */}
            {activeTab === "purchases" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Fornecedor</th>
                      <th className="p-4">NF / Ref</th>
                      <th className="p-4">Itens</th>
                      <th className="p-4">Subtotal</th>
                      <th className="p-4">Frete</th>
                      <th className="p-4">Total Geral</th>
                      <th className="p-4">Método</th>
                      <th className="p-4">Data Entrada</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma compra de estoque registrada.</td>
                      </tr>
                    ) : (
                      paginatedPurchases.map((pc) => {
                        const suppName = suppliers.find(s => s.id === pc.supplierId)?.name || "Fornecedor Geral";
                        return (
                          <tr key={pc.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4 font-semibold text-foreground">{suppName}</td>
                            <td className="p-4 font-mono text-muted-foreground">{pc.invoiceNumber || "-"}</td>
                            <td className="p-4">
                              <span className="font-mono">{pc.items?.length || 0} produto(s)</span>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground">{formatCurrency(pc.subtotal || pc.total)}</td>
                            <td className="p-4 font-mono text-rosegold-600 dark:text-rosegold-400 font-semibold">{formatCurrency(pc.freight || 0)}</td>
                            <td className="p-4 font-mono font-bold text-foreground">{formatCurrency(pc.total)}</td>
                            <td className="p-4 uppercase text-[10px] text-muted-foreground">{pc.paymentMethod === "company_credit_card" ? "Cartão Corporativo" : pc.paymentMethod}</td>
                            <td className="p-4 font-mono text-muted-foreground">{pc.receivedAt ? formatDate(pc.receivedAt) : "-"}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditPurchase(pc)}
                                  className="px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold text-[10px] transition-colors flex items-center gap-1"
                                >
                                  ✏️ Editar
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

            {/* Tela 7: DRE Gerencial */}
            {activeTab === "dre" && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-green-500/5 space-y-1">
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Receita Bruta Total</span>
                    <h3 className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(dre.totalRevenues)}</h3>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-red-500/5 space-y-1">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Despesas Operacionais Total</span>
                    <h3 className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{formatCurrency(dre.totalExpenses)}</h3>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-primary/5 space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Resultado Líquido do Exercício</span>
                    <h3 className={cn("text-2xl font-bold font-mono", dre.netIncome >= 0 ? "text-primary" : "text-red-500")}>
                      {formatCurrency(dre.netIncome)}
                    </h3>
                  </div>
                </div>

                {/* Detalhamento DRE */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Detalhamento de Custos & Despesas por Categoria</h4>
                  <div className="divide-y divide-border border border-border rounded-xl bg-card/50 overflow-hidden">
                    {Object.entries(dre.categoriesSum).map(([cat, val]) => (
                      <div key={cat} className="p-3.5 flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground">{getCategoryLabel(cat)}</span>
                        <span className="font-mono font-bold text-red-500">{formatCurrency(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Drawer Lateral Unificado */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-background border-l border-border h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-foreground">
                  {drawerType === "bank_account" ? (editingId ? "Editar Conta Bancária" : "Nova Conta Bancária") :
                   drawerType === "company_card" ? (editingId ? "Editar Cartão Corporativo" : "Novo Cartão Corporativo") :
                   drawerType === "transaction" ? "Novo Lançamento no Fluxo" : "Registrar Compra de Estoque"}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form id="drawerForm" onSubmit={handleSave} className="space-y-4 text-xs">
                
                {/* Form 1: Custom Bank Account */}
                {drawerType === "bank_account" && (
                  <>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Sugestão de Banco</label>
                      <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1 border border-border rounded-xl bg-muted/10">
                        {BRAZILIAN_BANKS.map(b => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => {
                              setSelectedBankObj(b);
                              setBBankName(b.name);
                              setBBankCode(b.code);
                              if (!bName) setBName(`${b.name} PJ`);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all",
                              selectedBankObj?.code === b.code ? "border-primary bg-primary/10" : "border-border hover:border-primary/30 bg-card"
                            )}
                          >
                            <div className={cn("h-5 w-5 rounded flex items-center justify-center font-bold text-[7px] shrink-0 border", b.color)}>
                              {b.brand}
                            </div>
                            <span className="text-[9px] font-semibold text-foreground truncate">{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome da Conta / Identificador *</label>
                        <input
                          type="text"
                          required
                          value={bName}
                          onChange={(e) => setBName(e.target.value)}
                          placeholder="Ex: Itaú PJ Principal"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card"
                        />
                        {errors.name && <p className="text-[10px] text-destructive">{errors.name}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Instituição / Banco</label>
                        <input
                          type="text"
                          value={bBankName}
                          onChange={(e) => setBBankName(e.target.value)}
                          placeholder="Ex: Banco Itaú, Nubank"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Cód. Banco</label>
                        <input type="text" value={bBankCode} onChange={(e) => setBBankCode(e.target.value)} placeholder="001" className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-mono text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Agência</label>
                        <input type="text" value={bAgency} onChange={(e) => setBAgency(e.target.value)} placeholder="0001" className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-mono text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta</label>
                        <input type="text" value={bAccountNumber} onChange={(e) => setBAccountNumber(e.target.value)} placeholder="12345" className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-mono text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Dígito</label>
                        <input type="text" value={bAccountDigit} onChange={(e) => setBAccountDigit(e.target.value)} placeholder="0" className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-mono text-center" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Tipo de Conta</label>
                        <select
                          value={bType}
                          onChange={(e) => setBType(e.target.value as any)}
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground"
                        >
                          <option value="checking">Conta Corrente</option>
                          <option value="savings">Poupança</option>
                          <option value="wallet">Carteira Digital</option>
                          <option value="cash_register">Caixa Interno / Físico</option>
                          <option value="payment">Conta de Pagamento</option>
                          <option value="investment">Investimento</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Saldo Inicial (BRL)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={bBalance || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBBalance(val);
                            if (!editingId) setBInitialBalance(val);
                          }}
                          placeholder="0,00"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Titular da Conta</label>
                        <input type="text" value={bHolderName} onChange={(e) => setBHolderName(e.target.value)} placeholder="Carol Ramos LTDA" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CPF / CNPJ Titular</label>
                        <input type="text" value={bHolderCpfCnpj} onChange={(e) => setBHolderCpfCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Chave PIX (Opcional)</label>
                      <input type="text" value={bPixKey} onChange={(e) => setBPixKey(e.target.value)} placeholder="contato@carolramos.com.br" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Status da Conta</label>
                        <select value={bStatus} onChange={(e) => setBStatus(e.target.value as any)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                          <option value="active">Ativa</option>
                          <option value="inactive">Inativa</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações</label>
                        <input type="text" value={bNotes} onChange={(e) => setBNotes(e.target.value)} placeholder="Observações adicionais..." className="w-full px-3.5 py-2 rounded-lg border border-border bg-card" />
                      </div>
                    </div>
                  </>
                )}

                {/* Form 2: Corporate Credit Card */}
                {drawerType === "company_card" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Identificador do Cartão *</label>
                        <input
                          type="text"
                          required
                          value={cName}
                          onChange={(e) => setCName(e.target.value)}
                          placeholder="Ex: Cartão Itaú Black Corp"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card"
                        />
                        {errors.name && <p className="text-[10px] text-destructive">{errors.name}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Banco Emissor *</label>
                        <input
                          type="text"
                          required
                          value={cIssuerBank}
                          onChange={(e) => setCIssuerBank(e.target.value)}
                          placeholder="Ex: Itaú, Nubank, C6"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card"
                        />
                        {errors.issuerBank && <p className="text-[10px] text-destructive">{errors.issuerBank}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Bandeira</label>
                        <select value={cFlag} onChange={(e) => setCFlag(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground">
                          <option value="visa">Visa</option>
                          <option value="mastercard">Mastercard</option>
                          <option value="elo">Elo</option>
                          <option value="amex">American Express</option>
                          <option value="hipercard">Hipercard</option>
                          <option value="other">Outras</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Final (4 dígitos) *</label>
                        <input
                          type="text"
                          maxLength={4}
                          required
                          value={cLast4}
                          onChange={(e) => setCLast4(e.target.value.replace(/\D/g, ""))}
                          placeholder="4589"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono text-center"
                        />
                        {errors.lastFourDigits && <p className="text-[10px] text-destructive">{errors.lastFourDigits}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Impresso *</label>
                        <input
                          type="text"
                          required
                          value={cNameOnCard}
                          onChange={(e) => setCNameOnCard(e.target.value.toUpperCase())}
                          placeholder="CAROL RAMOS"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono uppercase text-xs"
                        />
                        {errors.nameOnCard && <p className="text-[10px] text-destructive">{errors.nameOnCard}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Limite Total (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={cTotalLimit || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCTotalLimit(val);
                            if (!editingId) setCAvailableLimit(val);
                          }}
                          placeholder="10000,00"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono font-bold"
                        />
                        {errors.totalLimit && <p className="text-[10px] text-destructive">{errors.totalLimit}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Limite Disponível (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={cAvailableLimit || ""}
                          onChange={(e) => setCAvailableLimit(parseFloat(e.target.value) || 0)}
                          placeholder="10000,00"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono font-bold text-emerald-600 dark:text-emerald-400"
                        />
                        {errors.availableLimit && <p className="text-[10px] text-destructive">{errors.availableLimit}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Fechamento Fatura (Dia) *</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          required
                          value={cClosingDay}
                          onChange={(e) => setCClosingDay(parseInt(e.target.value) || 1)}
                          placeholder="25"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono text-center"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Vencimento Fatura (Dia) *</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          required
                          value={cDueDay}
                          onChange={(e) => setCDueDay(parseInt(e.target.value) || 1)}
                          placeholder="5"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta Bancária Vinculada</label>
                        <select value={cLinkedBankAccountId} onChange={(e) => setCLinkedBankAccountId(e.target.value)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                          <option value="">Nenhuma conta específica</option>
                          {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Responsável pelo Cartão</label>
                        <input type="text" value={cResponsiblePerson} onChange={(e) => setCResponsiblePerson(e.target.value)} placeholder="Carol Ramos" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Status do Cartão</label>
                        <select value={cStatus} onChange={(e) => setCStatus(e.target.value as any)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                          <option value="blocked">Bloqueado</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações</label>
                        <input type="text" value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Obs adicionais..." className="w-full px-3.5 py-2 rounded-lg border border-border bg-card" />
                      </div>
                    </div>
                  </>
                )}

                {/* Form 3: Transaction */}
                {drawerType === "transaction" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Tipo</label>
                        <select value={tType} onChange={(e) => setTType(e.target.value as any)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                          <option value="expense">Despesa (Saída)</option>
                          <option value="revenue">Receita (Entrada)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Categoria</label>
                        <select value={tCategory} onChange={(e) => setTCategory(e.target.value as any)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                          <option value="other">Outros Lançamentos</option>
                          <option value="rent">Aluguel / Condomínio</option>
                          <option value="marketing">Marketing & Tráfego</option>
                          <option value="salary">Salários & Pró-Labore</option>
                          <option value="stock_purchase">Compra de Mercadorias</option>
                          <option value="card_invoice_payment">Pagamento Fatura Cartão</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Descrição / Detalhe</label>
                      <input type="text" required value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="Ex: Compra embalagens correios" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Valor (R$)</label>
                        <input type="number" step="0.01" required value={tAmount || ""} onChange={(e) => setTAmount(parseFloat(e.target.value) || 0)} placeholder="0,00" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono" />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Data Pagamento</label>
                        <input type="text" required value={tDate} onChange={(e) => setTDate(e.target.value)} placeholder="AAAA-MM-DD" className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta Bancária Origem/Destino</label>
                      <select value={tBankAccountId} onChange={(e) => setTBankAccountId(e.target.value)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                        {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* Form 4: Purchase Order */}
                {drawerType === "purchase" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Fornecedor *</label>
                        <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground">
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          {suppliers.length === 0 && <option value="">Sem fornecedores cadastrados</option>}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Data da Compra *</label>
                        <input
                          type="date"
                          required
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono text-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Número da Nota Fiscal (NF)</label>
                        <input
                          type="text"
                          value={purchaseInvoiceNumber}
                          onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                          placeholder="Ex: NF-000104"
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Categoria do Lançamento</label>
                        <select
                          value={purchaseCategory}
                          onChange={(e) => setPurchaseCategory(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground"
                        >
                          <option value="stock_purchase">Compra de Estoque / Mercadorias</option>
                          <option value="raw_material">Matéria-Prima / Insumos</option>
                          <option value="packaging">Embalagens & Envelopes</option>
                          <option value="equipment">Equipamentos & Ferramentas</option>
                          <option value="other">Outros Suprimentos</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações / Detalhes do Pedido</label>
                      <input
                        type="text"
                        value={purchaseNotes}
                        onChange={(e) => setPurchaseNotes(e.target.value)}
                        placeholder="Ex: Entrega via transportadora XYZ com pagamento em 30 dias..."
                        className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-foreground"
                      />
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Adicionar Produtos à Compra</label>
                      <div className="border border-border rounded-xl p-2 max-h-36 overflow-y-auto space-y-1.5 bg-muted/20">
                        {products.map(p => (
                          <div key={p.id} className="flex justify-between items-center text-[10px] p-1 hover:bg-card rounded transition-colors">
                            <span className="font-medium text-foreground truncate max-w-[200px]">{p.name} (SKU: {p.sku})</span>
                            <button type="button" onClick={() => addPurchaseItem(p.id)} className="px-2 py-0.5 bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-900/50 dark:text-rosegold-300 rounded font-bold uppercase hover:bg-primary hover:text-white">
                              + Adicionar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[8px] text-muted-foreground">Itens da Ordem de Entrada ({purchaseItems.length})</span>
                        <span className="font-mono text-[9px] text-muted-foreground font-semibold">Subtotal: {formatCurrency(purchaseSubtotalCost)}</span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {purchaseItems.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                            Nenhum produto selecionado. Clique em &quot;+ Adicionar&quot; acima.
                          </p>
                        ) : (
                          purchaseItems.map(item => {
                            const prod = products.find(p => p.id === item.productId);
                            const itemTotal = item.quantity * item.unitCost;
                            return (
                              <div key={item.productId} className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-3 text-[10px]">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground truncate">{prod?.name || "Produto"}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span>Custo R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.unitCost || ""}
                                      onChange={(e) => updatePurchaseItemCost(item.productId, parseFloat(e.target.value) || 0)}
                                      className="w-16 p-0.5 border border-border rounded text-center font-mono"
                                    />
                                    <span className="text-muted-foreground ml-1">= {formatCurrency(itemTotal)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button type="button" onClick={() => updatePurchaseItemQty(item.productId, item.quantity - 1)} className="p-1 rounded bg-muted hover:bg-muted/80">
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="font-bold font-mono w-5 text-center">{item.quantity}</span>
                                  <button type="button" onClick={() => updatePurchaseItemQty(item.productId, item.quantity + 1)} className="p-1 rounded bg-muted hover:bg-muted/80">
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <button type="button" onClick={() => updatePurchaseItemQty(item.productId, 0)} className="p-1 rounded text-red-500 hover:bg-red-500/10 ml-1">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Novo Campo de Frete, Desconto e Acréscimo */}
                    <div className="p-3 rounded-xl border border-border bg-card/60 space-y-3">
                      <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground block border-b border-border/50 pb-1">
                        Ajustes Financeiros & Frete
                      </span>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-rosegold-600 dark:text-rosegold-400 uppercase tracking-wider text-[9px]">
                            🚚 Frete (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={purchaseFreight || ""}
                            onChange={(e) => setPurchaseFreight(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card font-mono text-xs font-bold text-rosegold-600 dark:text-rosegold-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider text-[9px]">
                            🏷️ Desconto (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={purchaseDiscount || ""}
                            onChange={(e) => setPurchaseDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card font-mono text-xs font-bold text-green-600 dark:text-green-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider text-[9px]">
                            ➕ Acréscimo (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={purchaseAddition || ""}
                            onChange={(e) => setPurchaseAddition(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card font-mono text-xs font-bold text-orange-600 dark:text-orange-400"
                          />
                        </div>
                      </div>

                      {/* Resumo Consolidado de Valores */}
                      <div className="pt-2 border-t border-border/40 space-y-1 font-mono text-[10px]">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal dos Produtos:</span>
                          <span>{formatCurrency(purchaseSubtotalCost)}</span>
                        </div>
                        {purchaseFreight > 0 && (
                          <div className="flex justify-between text-rosegold-600 dark:text-rosegold-400">
                            <span>(+) Frete:</span>
                            <span>{formatCurrency(purchaseFreight)}</span>
                          </div>
                        )}
                        {purchaseDiscount > 0 && (
                          <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>(-) Desconto:</span>
                            <span>{formatCurrency(purchaseDiscount)}</span>
                          </div>
                        )}
                        {purchaseAddition > 0 && (
                          <div className="flex justify-between text-orange-600 dark:text-orange-400">
                            <span>(+) Acréscimo:</span>
                            <span>{formatCurrency(purchaseAddition)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-xs text-foreground pt-1 border-t border-border/60">
                          <span>TOTAL DA COMPRA:</span>
                          <span className="text-primary font-extrabold">{formatCurrency(purchaseTotalCost)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div className="col-span-2 space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Método de Pagamento</label>
                        <select
                          value={purchasePaymentMethod}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setPurchasePaymentMethod(val);
                            if (val === "bank_slip" || val === "credit_card" || val === "company_credit_card") {
                              setPurchaseInstallmentsCount(1);
                              const cardObj = companyCards.find(c => c.id === selectedCardId);
                              generateDefaultPurchaseInstallments(1, purchaseTotalCost, cardObj?.dueDay);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                        >
                          <option value="pix">PIX (À Vista)</option>
                          <option value="cash">Dinheiro (À Vista)</option>
                          <option value="bank_account">Transferência / Conta Bancária</option>
                          <option value="bank_slip">Boleto Bancário (A Prazo)</option>
                          <option value="company_credit_card">Cartão de Crédito da Empresa</option>
                        </select>
                      </div>

                      {(purchasePaymentMethod === "company_credit_card" || purchasePaymentMethod === "credit_card") && (
                        <div className="col-span-2 space-y-1">
                          <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Selecione o Cartão Corporativo</label>
                          <select
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                          >
                            {companyCards.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} (Disp: {formatCurrency(c.availableLimit)})
                              </option>
                            ))}
                            {companyCards.length === 0 && <option value="">Nenhum cartão cadastrado</option>}
                          </select>
                        </div>
                      )}

                      {(purchasePaymentMethod === "bank_slip" || purchasePaymentMethod === "credit_card" || purchasePaymentMethod === "company_credit_card") && (
                        <div className="col-span-2 space-y-3 pt-2 border-t border-border/40 animate-in fade-in duration-200">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Condição de Pagamento / Parcelas</label>
                            <select
                              value={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].includes(purchaseInstallmentsCount) ? purchaseInstallmentsCount : "custom"}
                              onChange={(e) => {
                                const val = e.target.value;
                                const cardObj = companyCards.find(c => c.id === selectedCardId);
                                if (val === "custom") {
                                  setPurchaseInstallmentsCount(2);
                                  generateDefaultPurchaseInstallments(2, purchaseTotalCost, cardObj?.dueDay);
                                } else {
                                  const count = parseInt(val) || 1;
                                  setPurchaseInstallmentsCount(count);
                                  generateDefaultPurchaseInstallments(count, purchaseTotalCost, cardObj?.dueDay);
                                }
                              }}
                              className="w-full p-2 rounded-lg border border-border bg-card text-xs font-semibold"
                            >
                              <option value={1}>1x À Vista ({formatCurrency(purchaseTotalCost)})</option>
                              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].map(n => (
                                <option key={n} value={n}>{n}x de {formatCurrency(purchaseTotalCost / n)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-border flex justify-end gap-2">
                  <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 shadow">
                    {editingId ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Baixar / Dar Baixa em Contas a Pagar / Receber */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                {selectedPayId ? "Confirmar Pagamento de Conta" : "Confirmar Recebimento de Valor"}
              </h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">Selecione a conta bancária onde será processado este movimento financeiro:</p>
              <select
                value={paymentBankAccountId}
                onChange={(e) => setPaymentBankAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium"
              >
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPaymentModalOpen(false)} className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted">
                Cancelar
              </button>
              <button onClick={handleConfirmPayment} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95">
                Confirmar e Baixar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Pagamento de Fatura do Cartão Corporativo */}
      {cardInvoiceModalOpen && selectedCardForInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Pagar Fatura do Cartão Corporativo</h3>
              <button onClick={() => setCardInvoiceModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                <p className="font-semibold text-foreground">{selectedCardForInvoice.name}</p>
                <p className="text-muted-foreground">{selectedCardForInvoice.issuerBank} • Final {selectedCardForInvoice.lastFourDigits}</p>
                <p className="text-xs text-muted-foreground">Fatura Atual Utilizada: <strong className="text-foreground font-mono">{formatCurrency(selectedCardForInvoice.totalLimit - selectedCardForInvoice.availableLimit)}</strong></p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Valor a Pagar (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={invoicePayAmount || ""}
                  onChange={(e) => setInvoicePayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono font-bold text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Conta Bancária para Débito</label>
                <select
                  value={invoiceBankAccountId}
                  onChange={(e) => setInvoiceBankAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium"
                >
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCardInvoiceModalOpen(false)} className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted">
                Cancelar
              </button>
              <button onClick={handleConfirmInvoicePayment} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95">
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Batch Action Bar (Financeiro - Fluxo de Caixa) */}
      {activeTab === "cashflow" && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-2xl border border-primary/40 shadow-2xl rounded-2xl p-3 px-5 flex flex-wrap items-center gap-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-extrabold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-foreground">
              {selectedIds.length === 1 ? "1 lançamento selecionado" : `${selectedIds.length} lançamentos selecionados`}
            </span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchExportTransactions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all"
            >
              Exportar CSV
            </button>

            <button
              onClick={() => handleBatchDeleteTransactions("financial_transactions")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold transition-all shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir Selecionados</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-all"
              title="Cancelar Seleção"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
