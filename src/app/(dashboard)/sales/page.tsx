"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/context/AuthContext";
import { Product, Category, StockLocation } from "@/features/products/types";
import { Customer } from "@/features/customers/types";
import { calculateVipTier } from "@/features/customers/utils";
import { Sale, CashRegister } from "@/features/sales/types";
import { CashRegisterSchema, SaleSchema } from "@/features/sales/schemas";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  User,
  PlusCircle,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  CreditCard,
  Wallet,
  Banknote,
  Sparkles,
  Calculator,
  ShieldAlert,
  AlertCircle,
  Layers,
  X,
  Printer,
  Building2,
  RefreshCw,
  Coins,
  Package,
  Calendar
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function SalesPOSPage() {
  const { createDoc, getDocs, updateDoc, getDocById } = useDb();
  const { user } = useAuth();

  // State Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Cash Register State
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [registerNotes, setRegisterNotes] = useState("");
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState("");
  const [isOpeningRegister, setIsOpeningRegister] = useState(false);
  const [isClosingRegister, setIsClosingRegister] = useState(false);

  // POS State
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; discount: number }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'debit_card' | 'pix' | 'cash' | 'split' | 'term'>("pix");
  const [installments, setInstallments] = useState(1);
  const [isCustomInstallments, setIsCustomInstallments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  // Installment Details (Req 2)
  const [generatedInstallments, setGeneratedInstallments] = useState<Array<{ number: number; amount: number; dueDate: string }>>([]);

  // Split Payment Details
  const [pixAmount, setPixAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);

  // Checkout Success Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Load Initial Data
  const loadPOSData = async () => {
    setLoading(true);
    try {
      const [prods, cats, custs, registers] = await Promise.all([
        getDocs("products"),
        getDocs("categories"),
        getDocs("customers"),
        getDocs("cash_registers") // Fetch register sessions
      ]);

      setProducts((prods as Product[]).filter(p => p.status === "active"));
      setCategories(cats as Category[]);
      setCustomers(custs as Customer[]);

      // Find open register for this user/tenant
      const openReg = (registers as CashRegister[]).find(r => r.status === "open");
      if (openReg) {
        setActiveRegister(openReg);
      } else {
        setActiveRegister(null);
      }
    } catch (e) {
      console.error("Erro ao carregar dados do PDV:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, []);

  // 1. Abrir Caixa
  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        openingBalance,
        notes: registerNotes,
      };

      const result = CashRegisterSchema.safeParse(payload);
      if (!result.success) {
        alert(result.error.issues[0].message);
        setLoading(false);
        return;
      }

      const newRegister = await createDoc("cash_registers", {
        openedAt: new Date().toISOString(),
        openedBy: user?.uid || "unknown",
        openingBalance,
        status: "open" as const,
        notes: registerNotes,
        expectedBalance: openingBalance,
        difference: 0
      });

      setActiveRegister(newRegister as CashRegister);
      setIsOpeningRegister(false);
      setOpeningBalance(0);
      setRegisterNotes("");
    } catch (err: any) {
      alert(err.message || "Erro ao abrir o caixa.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fechar Caixa
  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    setLoading(true);

    try {
      // Calcular faturamento real no caixa
      const allSales = await getDocs("sales");
      const sessionSales = (allSales as Sale[]).filter(
        s => s.cashRegisterId === activeRegister.id && s.status === "completed"
      );
      const salesTotal = sessionSales.reduce((sum, s) => sum + s.total, 0);
      const expected = activeRegister.openingBalance + salesTotal;
      const diff = closingBalance - expected;

      const updatedReg = await updateDoc("cash_registers", activeRegister.id, {
        closedAt: new Date().toISOString(),
        closedBy: user?.uid || "unknown",
        closingBalance,
        expectedBalance: expected,
        difference: diff,
        status: "closed" as const,
        notes: closeNotes
      });

      // Registrar transação financeira de fechamento / ajuste
      if (diff !== 0) {
        await createDoc("financial_transactions", {
          type: diff > 0 ? "revenue" as const : "expense" as const,
          category: "cash_register_adjustment",
          amount: Math.abs(diff),
          description: `Ajuste de caixa no fechamento - Diferença: R$ ${diff.toFixed(2)}`,
          paymentDate: new Date().toISOString(),
          status: "paid" as const,
          bankAccountId: "caixa-geral",
          referenceId: activeRegister.id
        });
      }

      setActiveRegister(null);
      setIsClosingRegister(false);
      setClosingBalance(0);
      setCloseNotes("");
      await loadPOSData();
    } catch (err: any) {
      alert(err.message || "Erro ao fechar caixa.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Adicionar Produto ao Carrinho
  const addToCart = (product: Product) => {
    if (product.availableStock <= 0) {
      alert("Produto esgotado no estoque!");
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.availableStock) {
        alert("Quantidade máxima disponível atingida!");
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
  };

  // 4. Alterar Quantidade no Carrinho
  const updateQty = (productId: string, delta: number) => {
    const idx = cart.findIndex(item => item.product.id === productId);
    if (idx === -1) return;

    const newCart = [...cart];
    const newQty = newCart[idx].quantity + delta;
    
    if (newQty <= 0) {
      newCart.splice(idx, 1);
    } else {
      const maxStock = newCart[idx].product.availableStock;
      if (newQty > maxStock) {
        alert("Quantidade máxima disponível atingida!");
        return;
      }
      newCart[idx].quantity = newQty;
    }
    setCart(newCart);
  };

  // 5. Alterar Desconto por Item
  const updateItemDiscount = (productId: string, val: number) => {
    const idx = cart.findIndex(item => item.product.id === productId);
    if (idx === -1) return;

    const newCart = [...cart];
    newCart[idx].discount = val;
    setCart(newCart);
  };

  // 6. Cálculos do Carrinho
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
  const totalItemDiscount = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const total = Math.max(0, subtotal - totalItemDiscount - globalDiscount);

  // Inicializa valores do split payment se o total mudar
  useEffect(() => {
    if (paymentMethod === "split") {
      setPixAmount(parseFloat((total / 2).toFixed(2)));
      setCardAmount(parseFloat((total / 2).toFixed(2)));
      setCashAmount(0);
    }
  }, [total, paymentMethod]);

  const generateDefaultInstallments = (count: number, saleTotal: number) => {
    if (count <= 0) return;
    const list = [];
    const baseAmount = parseFloat((saleTotal / count).toFixed(2));
    let accumulated = 0;
    for (let i = 1; i <= count; i++) {
      let amount = baseAmount;
      if (i === count) {
        amount = parseFloat((saleTotal - accumulated).toFixed(2));
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
    setGeneratedInstallments(list);
  };

  const handleUpdateInstallmentAmount = (index: number, newAmount: number) => {
    setGeneratedInstallments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: newAmount };
      return updated;
    });
  };

  const handleUpdateInstallmentDate = (index: number, newDate: string) => {
    setGeneratedInstallments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dueDate: newDate };
      return updated;
    });
  };

  // Regenerar parcelas se o total ou método mudar
  useEffect(() => {
    if (paymentMethod === "term" || paymentMethod === "credit_card") {
      generateDefaultInstallments(installments, total);
    } else {
      setGeneratedInstallments([]);
    }
  }, [total, paymentMethod, installments]);

  // 7. Concluir Venda (Checkout)
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    if (cart.length === 0) return;

    setLoading(true);

    try {
      const itemsPayload = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellPrice,
        costPrice: item.product.costPrice,
        discount: item.discount
      }));

      const paymentDetailsPayload: any = {};
      if (paymentMethod === "credit_card" || paymentMethod === "term") {
        paymentDetailsPayload.installments = installments;
      } else if (paymentMethod === "split") {
        paymentDetailsPayload.splitDetails = [
          { method: "pix", amount: pixAmount },
          { method: "credit_card", amount: cardAmount },
          { method: "cash", amount: cashAmount }
        ].filter(d => d.amount > 0);
      }

      const payload = {
        customerId: selectedCustomerId || undefined,
        items: itemsPayload,
        discount: globalDiscount,
        paymentMethod,
        paymentDetails: Object.keys(paymentDetailsPayload).length > 0 ? paymentDetailsPayload : undefined,
        channel: "pos" as const
      };

      // Zod Validation
      const result = SaleSchema.safeParse(payload);
      if (!result.success) {
        alert(result.error.issues[0].message);
        setLoading(false);
        return;
      }

      // 1. Criar a Venda no Banco
      const newSale = await createDoc("sales", {
        ...payload,
        subtotal,
        total,
        status: "completed" as const,
        cashRegisterId: activeRegister.id
      });

      // 2. Abater Estoque Físico & Criar Histórico de Estoque (Suporte a Kits e Produtos Individuais)
      for (const item of cart) {
        const prod = item.product;

        if (prod.isKit && prod.kitId) {
          // Se for Kit, carregar o kit e abater o estoque de cada produto componente!
          try {
            const kitDoc: any = await getDocs("product_kits");
            const kit = (kitDoc || []).find((k: any) => k.id === prod.kitId);
            if (kit && kit.items) {
              for (const kitComp of kit.items) {
                const compProd = products.find(p => p.id === kitComp.productId);
                if (compProd) {
                  const qtyDeduct = kitComp.quantity * item.quantity;
                  const newCurrent = compProd.currentStock - qtyDeduct;
                  const newAvailable = compProd.availableStock - qtyDeduct;

                  await updateDoc("products", compProd.id, {
                    currentStock: newCurrent,
                    availableStock: newAvailable
                  });

                  await createDoc("inventory_transactions", {
                    productId: compProd.id,
                    locationId: "loja-fisica",
                    type: "out" as const,
                    quantity: qtyDeduct,
                    costPriceAtTime: compProd.costPrice,
                    reason: `Venda do Kit "${kit.name}" Ref #${newSale.id}`
                  });
                }
              }
            }
          } catch (errKit) {
            console.error("Erro ao abater estoque dos componentes do kit:", errKit);
          }
        } else {
          // Produto normal
          const newCurrent = prod.currentStock - item.quantity;
          const newAvailable = prod.availableStock - item.quantity;

          // Atualizar produto
          await updateDoc("products", prod.id, {
            currentStock: newCurrent,
            availableStock: newAvailable
          });

          // Registrar InventoryTransaction
          await createDoc("inventory_transactions", {
            productId: prod.id,
            locationId: "loja-fisica",
            type: "out" as const,
            quantity: item.quantity,
            costPriceAtTime: prod.costPrice,
            reason: `Venda PDV Ref #${newSale.id}`
          });
        }
      }

      // 3. Registrar Lançamento Financeiro (Revenue) ou Contas a Receber (Receivables)
      const customerName = selectedCustomerId 
        ? (customers.find(c => c.id === selectedCustomerId)?.name || "Cliente") 
        : "Não Identificado";

      if (paymentMethod === "term" || (paymentMethod === "credit_card" && installments > 1)) {
        for (const inst of generatedInstallments) {
          await createDoc("accounts_receivable", {
            customerId: selectedCustomerId || undefined,
            saleId: newSale.id,
            description: `Parcela ${inst.number}/${generatedInstallments.length} - Venda PDV Ref #${newSale.id} - Cliente: ${customerName}`,
            amount: inst.amount,
            dueDate: inst.dueDate,
            status: "pending" as const,
            paymentMethod: paymentMethod,
            installments: generatedInstallments.length,
            currentInstallment: inst.number
          });
        }
      } else {
        await createDoc("financial_transactions", {
          type: "revenue" as const,
          category: "sale",
          amount: total,
          description: `Venda PDV Ref #${newSale.id} - Cliente: ${customerName}`,
          paymentDate: new Date().toISOString(),
          status: "paid" as const,
          bankAccountId: "caixa-geral",
          referenceId: newSale.id,
          cashRegisterId: activeRegister.id
        });
      }

      // 4. Incrementar métricas de compras e atualizar VIP Tier do cliente
      if (selectedCustomerId) {
        const client = customers.find(c => c.id === selectedCustomerId);
        if (client) {
          const newOrders = (client.metrics?.totalOrders || 0) + 1;
          const newSpent = (client.metrics?.totalSpent || 0) + total;
          const newVipTier = calculateVipTier(newSpent, newOrders);

          const updatedMetrics = {
            totalOrders: newOrders,
            totalSpent: newSpent,
            lastPurchaseDate: new Date().toISOString()
          };
          await updateDoc("customers", selectedCustomerId, {
            metrics: updatedMetrics,
            vipTier: newVipTier
          });
        }
      }

      // Concluído
      setCompletedSale(newSale as Sale);
      setCart([]);
      setSelectedCustomerId("");
      setGlobalDiscount(0);
      setPaymentMethod("pix");
      setInstallments(1);
      setIsCustomInstallments(false);
      setCheckoutSuccess(true);
      await loadPOSData();
    } catch (err: any) {
      alert(err.message || "Erro ao processar venda.");
    } finally {
      setLoading(false);
    }
  };

  // Filtragem local de produtos para busca rápida
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId === "all" || p.categoryId === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col justify-between">
      
      {/* 1. SE NÃO HOUVER CAIXA ABERTO */}
      {!activeRegister && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-lg space-y-6 text-center select-none">
            <div className="mx-auto h-14 w-14 rounded-full bg-rosegold-100 dark:bg-rosegold-950/30 text-rosegold-500 flex items-center justify-center">
              <Coins className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-display font-light">Caixa Fechado</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Para começar a registrar vendas no PDV, abra uma sessão de caixa inserindo o fundo de troco inicial.
              </p>
            </div>

            <form onSubmit={handleOpenRegister} className="space-y-4 text-left text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Saldo Inicial (Fundo de Troco BRL)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações</label>
                <textarea
                  value={registerNotes}
                  onChange={(e) => setRegisterNotes(e.target.value)}
                  placeholder="Ex: Abertura turno da tarde, gaveta sem moedas..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "Abrindo..." : "Abrir Caixa Operador"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. SE HOUVER CAIXA ABERTO (TELA DO PDV) */}
      {activeRegister && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
          
          {/* Coluna Esquerda: Catálogo Rápido (70%) */}
          <div className="lg:col-span-2 flex flex-col justify-between h-full min-h-0 bg-card/30 border border-border rounded-2xl p-4">
            
            {/* Cabeçalho do Catálogo */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">Caixa Aberto (Fundo: R$ {activeRegister.openingBalance.toFixed(2)})</span>
                </div>
                <button
                  onClick={() => setIsClosingRegister(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-950/30 text-red-600 dark:text-red-400 text-[10px] font-bold tracking-wider uppercase transition-colors"
                >
                  Fechar Caixa
                </button>
              </div>

              {/* Filtro Categorias & Pesquisa */}
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar produto por nome ou SKU..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card placeholder-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Grid de Itens (Scrollável) */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 scrollbar-thin">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.availableStock <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={cn(
                      "p-3 rounded-xl border border-border bg-card/60 hover:bg-card flex flex-col justify-between h-40 text-left hover:border-primary/20 transition-all group relative",
                      isOutOfStock && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className="h-16 w-full rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 mb-2">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-[11px] font-semibold text-foreground truncate leading-snug">{p.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{p.sku}</p>
                    </div>
                    <div className="flex items-end justify-between mt-2 pt-1 border-t border-border/40 w-full text-[10px]">
                      <span className="font-bold text-foreground">R$ {p.sellPrice.toFixed(2)}</span>
                      <span className={cn("font-medium", p.availableStock <= p.minStock ? "text-red-500 font-bold" : "text-muted-foreground")}>
                        {p.availableStock} un
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center text-xs text-muted-foreground">Nenhum produto cadastrado ativo.</div>
              )}
            </div>

          </div>

          {/* Coluna Direita: Carrinho e Checkout (30%) */}
          <div className="flex flex-col justify-between h-full min-h-0 bg-card/40 border border-border rounded-2xl p-4">
            
            {/* Topo: Carrinho de Compras */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 border-b border-border pb-3 shrink-0">
                <ShoppingCart className="h-4.5 w-4.5 text-rosegold-500" />
                <span className="font-semibold text-xs text-foreground">Carrinho de Compras ({cart.length} itens)</span>
              </div>

              {/* Lista do Carrinho (Scrollável) */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 scrollbar-thin">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-2.5 rounded-xl border border-border bg-card/30 flex items-center justify-between text-xs hover:border-primary/10 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h5 className="font-semibold text-foreground truncate">{item.product.name}</h5>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-rosegold-600 dark:text-rosegold-400">R$ {item.product.sellPrice.toFixed(2)}</span>
                        {/* Campo Desconto Item */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">Desc: R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.discount || ""}
                            onChange={(e) => updateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-12 p-0.5 border border-border bg-card rounded text-[10px] text-center font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Controles Qtd */}
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded bg-muted hover:bg-border text-muted-foreground hover:text-foreground">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-semibold font-mono text-[11px] w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded bg-muted hover:bg-border text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-20 text-center text-xs text-muted-foreground select-none">O carrinho está vazio. Adicione itens clicando no catálogo.</div>
                )}
              </div>
            </div>

            {/* Rodapé: Cliente e Checkout Form */}
            <div className="border-t border-border pt-4 mt-2 space-y-3.5 shrink-0 text-xs">
              
              {/* Seleção do Cliente */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-rosegold-500" />
                  <span>Identificar Cliente</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card"
                >
                  <option value="">Consumidor Final (Não Identificado)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>

              {/* Meios de Pagamento */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "pix", label: "PIX", icon: Wallet },
                    { id: "cash", label: "Dinheiro", icon: Banknote },
                    { id: "credit_card", label: "Crédito", icon: CreditCard },
                    { id: "debit_card", label: "Débito", icon: CreditCard },
                    { id: "term", label: "A Prazo", icon: Calendar },
                    { id: "split", label: "Misto", icon: Calculator }
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as any);
                          if (m.id === "term") {
                            setInstallments(1);
                            generateDefaultInstallments(1, total);
                          }
                        }}
                        className={cn(
                          "py-2 rounded-lg border text-[10px] font-semibold flex flex-col items-center gap-1 transition-all",
                          paymentMethod === m.id
                            ? "bg-primary border-primary text-primary-foreground shadow"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configurações Extra de Pagamento */}
              {paymentMethod === "credit_card" && (
                <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3 animate-in fade-in duration-200 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Configurar Parcelas (Cartão)</label>
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">Total: {formatCurrency(total)}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Nº de Parcelas</label>
                      <select
                        value={isCustomInstallments ? "custom" : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(installments) ? installments : "custom"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setIsCustomInstallments(true);
                          } else {
                            setIsCustomInstallments(false);
                            const count = parseInt(val) || 1;
                            setInstallments(count);
                            generateDefaultInstallments(count, total);
                          }
                        }}
                        className="w-full p-2 rounded-lg border border-border bg-card text-xs font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>{n}x de {formatCurrency(total / n)} {(n === 1 ? "sem juros" : "")}</option>
                        ))}
                        <option value="custom">Outra quantidade...</option>
                      </select>
                    </div>

                    {(isCustomInstallments || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(installments)) && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Qtd (Máx 36)</label>
                        <input
                          type="number"
                          min={1}
                          max={36}
                          value={installments}
                          onChange={(e) => {
                            const val = Math.min(36, Math.max(1, parseInt(e.target.value) || 1));
                            setInstallments(val);
                            generateDefaultInstallments(val, total);
                          }}
                          className="w-full p-2.5 rounded-lg border border-border bg-card font-mono text-center font-bold text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Parcelas geradas com edição individual */}
                  {generatedInstallments.length > 0 && installments > 1 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Lista de Vencimentos & Valores</span>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {generatedInstallments.map((inst, idx) => (
                          <div key={inst.number} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/40">
                            <span className="col-span-3 font-semibold text-[10px] text-muted-foreground text-center">#{inst.number}</span>
                            
                            <div className="col-span-5 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={inst.amount}
                                onChange={(e) => handleUpdateInstallmentAmount(idx, parseFloat(e.target.value) || 0)}
                                className="w-full pl-7 pr-1 py-1.5 rounded border border-border bg-card font-mono text-xs"
                              />
                            </div>

                            <input
                              type="date"
                              value={inst.dueDate}
                              onChange={(e) => handleUpdateInstallmentDate(idx, e.target.value)}
                              className="col-span-4 p-1.5 rounded border border-border bg-card font-mono text-[10px]"
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Validação de soma */}
                      {Math.abs(total - generatedInstallments.reduce((sum, item) => sum + item.amount, 0)) > 0.01 && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded-lg text-[10px] flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Diferença nas parcelas: <strong>{formatCurrency(total - generatedInstallments.reduce((sum, item) => sum + item.amount, 0))}</strong>.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "term" && (
                <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3 animate-in fade-in duration-200 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Configurar Parcelas</label>
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">Total: {formatCurrency(total)}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Nº de Parcelas</label>
                      <select
                        value={isCustomInstallments ? "custom" : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].includes(installments) ? installments : "custom"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setIsCustomInstallments(true);
                          } else {
                            setIsCustomInstallments(false);
                            const count = parseInt(val) || 1;
                            setInstallments(count);
                            generateDefaultInstallments(count, total);
                          }
                        }}
                        className="w-full p-2 rounded-lg border border-border bg-card text-xs font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].map(n => (
                          <option key={n} value={n}>{n}x de {formatCurrency(total / n)}</option>
                        ))}
                        <option value="custom">Outra quantidade...</option>
                      </select>
                    </div>

                    {(isCustomInstallments || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].includes(installments)) && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Qtd (Máx 36)</label>
                        <input
                          type="number"
                          min={1}
                          max={36}
                          value={installments}
                          onChange={(e) => {
                            const val = Math.min(36, Math.max(1, parseInt(e.target.value) || 1));
                            setInstallments(val);
                            generateDefaultInstallments(val, total);
                          }}
                          className="w-full p-2.5 rounded-lg border border-border bg-card font-mono text-center font-bold text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Parcelas geradas com edição individual */}
                  {generatedInstallments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Lista de Vencimentos & Valores</span>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {generatedInstallments.map((inst, idx) => (
                          <div key={inst.number} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/40">
                            <span className="col-span-3 font-semibold text-[10px] text-muted-foreground text-center">#{inst.number}</span>
                            
                            <div className="col-span-5 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={inst.amount}
                                onChange={(e) => handleUpdateInstallmentAmount(idx, parseFloat(e.target.value) || 0)}
                                className="w-full pl-7 pr-1 py-1.5 rounded border border-border bg-card font-mono text-xs"
                              />
                            </div>

                            <input
                              type="date"
                              value={inst.dueDate}
                              onChange={(e) => handleUpdateInstallmentDate(idx, e.target.value)}
                              className="col-span-4 p-1.5 rounded border border-border bg-card font-mono text-[10px]"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Validação de soma */}
                      {Math.abs(total - generatedInstallments.reduce((sum, item) => sum + item.amount, 0)) > 0.01 && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded-lg text-[10px] flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Diferença nas parcelas: <strong>{formatCurrency(total - generatedInstallments.reduce((sum, item) => sum + item.amount, 0))}</strong>.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "split" && (
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 animate-in fade-in duration-200">
                  <h5 className="text-[8px] font-bold text-muted-foreground uppercase">Divisão de Meios</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-muted-foreground font-semibold">PIX</span>
                      <input
                        type="number"
                        step="0.01"
                        value={pixAmount || ""}
                        onChange={(e) => setPixAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-border bg-card rounded text-center font-mono"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-muted-foreground font-semibold">Cartão</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cardAmount || ""}
                        onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-border bg-card rounded text-center font-mono"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-muted-foreground font-semibold">Dinheiro</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cashAmount || ""}
                        onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-border bg-card rounded text-center font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-right font-mono font-semibold pt-1 border-t border-border/40">
                    Soma: R$ {(pixAmount + cardAmount + cashAmount).toFixed(2)} / Faltam: R$ {Math.max(0, total - (pixAmount + cardAmount + cashAmount)).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Desconto Global */}
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-muted-foreground">Desconto Global:</span>
                <div className="relative w-28">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={globalDiscount || ""}
                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-border bg-card text-right font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Resumo Final de Valores */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                  <span>Subtotal</span>
                  <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
                </div>
                {totalItemDiscount + globalDiscount > 0 && (
                  <div className="flex items-center justify-between text-red-500 text-[10px] font-medium">
                    <span>Total Descontos</span>
                    <span className="font-mono">- R$ {(totalItemDiscount + globalDiscount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-foreground font-bold text-sm pt-1 border-t border-border/60">
                  <span>Total Geral</span>
                  <span className="font-mono">R$ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Botão Final de Fechamento de Venda */}
              <button
                type="button"
                disabled={
                  cart.length === 0 || 
                  loading || 
                  (paymentMethod === "split" && Math.abs((pixAmount + cardAmount + cashAmount) - total) > 0.05) ||
                  (paymentMethod === "term" && Math.abs(generatedInstallments.reduce((sum, item) => sum + item.amount, 0) - total) > 0.02)
                }
                onClick={handleCheckout}
                className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Concluir Venda (R$ {total.toFixed(2)})</span>
              </button>

            </div>

          </div>

        </div>
      )}

      {/* 3. MODAL: CHECHOUT SUCESSO */}
      {checkoutSuccess && completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 text-center relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setCheckoutSuccess(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/30 text-green-500 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Venda Concluída!</h3>
              <p className="text-[10px] text-muted-foreground font-mono">Ref: {completedSale.id}</p>
            </div>

            {/* Recibo Simulado */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-left text-xs font-mono space-y-2">
              <div className="text-[10px] text-muted-foreground border-b border-border/40 pb-1 flex justify-between">
                <span>Data: {new Date(completedSale.createdAt).toLocaleDateString()}</span>
                <span>PDV Caixa</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="truncate max-w-[180px]">{item.name}</span>
                    <span>{item.quantity}x R$ {item.unitPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 pt-1.5 text-xs text-foreground font-bold flex justify-between">
                <span>TOTAL PAGO</span>
                <span>R$ {completedSale.total.toFixed(2)}</span>
              </div>
              <div className="text-[9px] text-muted-foreground text-center pt-1 border-t border-dashed border-border/60">
                Obrigado pela preferência!
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => alert("Impressora fiscal não configurada. Funcionalidade fiscal listada no roadmap futuro.")}
                className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-1"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Recibo</span>
              </button>
              <button
                onClick={() => setCheckoutSuccess(false)}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: FECHAMENTO DE CAIXA */}
      {isClosingRegister && activeRegister && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Coins className="h-4.5 w-4.5 text-rosegold-500" />
                <span>Fechar Caixa Turno</span>
              </h3>
              <button
                onClick={() => setIsClosingRegister(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCloseRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/20 font-medium">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase">Fundo Inicial</span>
                  <p className="font-bold text-foreground text-sm font-mono">R$ {activeRegister.openingBalance.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase">Abertura</span>
                  <p className="text-[11px] text-foreground font-mono">{new Date(activeRegister.openedAt).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Saldo Físico Final em Caixa (BRL)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={closingBalance || ""}
                    onChange={(e) => setClosingBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações / Ocorrências de Caixa</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ex: Diferença de troco de 10 centavos, sangria feita..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsClosingRegister(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                >
                  {loading ? "Fechando..." : "Confirmar Fechamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
