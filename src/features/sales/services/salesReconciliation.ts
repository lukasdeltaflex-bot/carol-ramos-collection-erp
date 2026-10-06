import { Sale, SaleItem } from "@/features/sales/types";
import { Product } from "@/features/products/types";
import { calculateVipTier } from "@/features/customers/utils";
import { Customer } from "@/features/customers/types";

export interface KitItemComponent {
  productId: string;
  quantity: number;
}

export interface ProductKitDoc {
  id: string;
  name: string;
  items?: KitItemComponent[];
}

export interface PhysicalStockRequirement {
  productId: string;
  quantity: number;
  costPrice: number;
  productName: string;
}

/**
 * Expande uma lista de itens de venda para produtos físicos reais,
 * desmembrando kits em seus respectivos componentes unitários.
 */
export function expandToPhysicalItems(
  items: SaleItem[],
  products: Product[],
  kits: ProductKitDoc[] = []
): PhysicalStockRequirement[] {
  const result: PhysicalStockRequirement[] = [];

  for (const item of items) {
    const prod = products.find(p => p.id === item.productId);
    if (prod?.isKit && prod.kitId) {
      const kit = kits.find(k => k.id === prod.kitId);
      if (kit && kit.items && kit.items.length > 0) {
        for (const comp of kit.items) {
          const compProd = products.find(p => p.id === comp.productId);
          result.push({
            productId: comp.productId,
            quantity: comp.quantity * item.quantity,
            costPrice: compProd?.costPrice || 0,
            productName: compProd?.name || comp.productId
          });
        }
        continue;
      }
    }

    // Produto físico individual
    result.push({
      productId: item.productId,
      quantity: item.quantity,
      costPrice: item.costPrice || prod?.costPrice || 0,
      productName: item.name || prod?.name || item.productId
    });
  }

  return result;
}

export interface StockDelta {
  productId: string;
  productName: string;
  costPrice: number;
  delta: number; // > 0: aumento de venda (baixa no estoque) | < 0: redução/devolução (estorno ao estoque)
  oldQty: number;
  newQty: number;
}

/**
 * Calcula a diferença líquida de estoque físico entre o estado anterior e o novo estado da venda.
 * delta = newQty - oldQty:
 * - Se delta > 0: vendeu mais unidades -> baixar delta do estoque (inventory_transactions 'out')
 * - Se delta < 0: vendeu menos unidades ou trocou produto -> devolver |delta| ao estoque (inventory_transactions 'return')
 * - Se delta === 0: nenhuma alteração de quantidade para o produto
 */
export function calculateStockDeltas(
  oldItems: SaleItem[],
  newItems: SaleItem[],
  products: Product[],
  kits: ProductKitDoc[] = []
): StockDelta[] {
  const oldPhysical = expandToPhysicalItems(oldItems, products, kits);
  const newPhysical = expandToPhysicalItems(newItems, products, kits);

  const map = new Map<string, { oldQty: number; newQty: number; costPrice: number; productName: string }>();

  for (const item of oldPhysical) {
    const entry = map.get(item.productId) || {
      oldQty: 0,
      newQty: 0,
      costPrice: item.costPrice,
      productName: item.productName
    };
    entry.oldQty += item.quantity;
    if (item.costPrice) entry.costPrice = item.costPrice;
    if (item.productName) entry.productName = item.productName;
    map.set(item.productId, entry);
  }

  for (const item of newPhysical) {
    const entry = map.get(item.productId) || {
      oldQty: 0,
      newQty: 0,
      costPrice: item.costPrice,
      productName: item.productName
    };
    entry.newQty += item.quantity;
    if (item.costPrice) entry.costPrice = item.costPrice;
    if (item.productName) entry.productName = item.productName;
    map.set(item.productId, entry);
  }

  const deltas: StockDelta[] = [];
  map.forEach((data, productId) => {
    deltas.push({
      productId,
      productName: data.productName,
      costPrice: data.costPrice,
      delta: data.newQty - data.oldQty,
      oldQty: data.oldQty,
      newQty: data.newQty
    });
  });

  return deltas;
}

export interface DbInterface {
  getDocs: (collection: string) => Promise<any[]>;
  updateDoc: (collection: string, id: string, data: any) => Promise<any>;
  createDoc: (collection: string, data: any) => Promise<any>;
}

export interface CancelSaleParams {
  sale: Sale;
  reason?: string;
  userId: string;
  db: DbInterface;
}

/**
 * Executa o cancelamento seguro e atômico de uma venda:
 * 1. Valida se a venda já não foi cancelada previamente (idempotência).
 * 2. Estorna as quantidades ao estoque físico dos produtos (ou componentes de kits).
 * 3. Registra movimentações de estoque (inventory_transactions) com type: 'return'.
 * 4. Cancela transações financeiras vinculadas (financial_transactions -> status: 'cancelled').
 * 5. Cancela parcelas a receber vinculadas (accounts_receivable -> status: 'cancelled').
 * 6. Abate métricas do cliente vinculado (totalSpent, totalOrders) e recalcula VIP tier.
 * 7. Atualiza o status da venda para 'cancelled' com carimbo de data, motivo e operador.
 */
export async function executeCancelSale({
  sale,
  reason,
  userId,
  db
}: CancelSaleParams): Promise<{ success: boolean; message?: string }> {
  if (sale.status === "cancelled") {
    throw new Error("Esta venda já se encontra cancelada.");
  }

  const [prods, kits, finTransactions, receivables, customers] = await Promise.all([
    db.getDocs("products"),
    db.getDocs("product_kits"),
    db.getDocs("financial_transactions"),
    db.getDocs("accounts_receivable"),
    db.getDocs("customers")
  ]);

  const physicalItems = expandToPhysicalItems(sale.items, prods, kits);

  // 1. Estornar estoque físico
  for (const item of physicalItems) {
    const prod = prods.find((p: any) => p.id === item.productId);
    if (prod) {
      const newCurrent = (prod.currentStock || 0) + item.quantity;
      const newAvailable = (prod.availableStock || 0) + item.quantity;

      await db.updateDoc("products", prod.id, {
        currentStock: newCurrent,
        availableStock: newAvailable
      });

      await db.createDoc("inventory_transactions", {
        productId: prod.id,
        locationId: "loja-fisica",
        type: "return",
        quantity: item.quantity,
        costPriceAtTime: item.costPrice || prod.costPrice || 0,
        reason: `Cancelamento da Venda Ref #${sale.id}`
      });
    }
  }

  // 2. Cancelar lançamentos financeiros de receita
  const linkedFin = (finTransactions || []).filter(
    (t: any) => t.referenceId === sale.id && t.status !== "cancelled"
  );
  for (const ft of linkedFin) {
    await db.updateDoc("financial_transactions", ft.id, {
      status: "cancelled"
    });
  }

  // 3. Cancelar parcelas a receber
  const linkedReceivables = (receivables || []).filter(
    (r: any) => r.saleId === sale.id && r.status !== "cancelled"
  );
  for (const ar of linkedReceivables) {
    await db.updateDoc("accounts_receivable", ar.id, {
      status: "cancelled"
    });
  }

  // 4. Reverter métricas do cliente
  if (sale.customerId) {
    const client = (customers || []).find((c: any) => c.id === sale.customerId);
    if (client) {
      const currentOrders = client.metrics?.totalOrders || 1;
      const currentSpent = client.metrics?.totalSpent || sale.total;
      const newOrders = Math.max(0, currentOrders - 1);
      const newSpent = Math.max(0, currentSpent - sale.total);
      const newVipTier = calculateVipTier(newSpent, newOrders);

      await db.updateDoc("customers", client.id, {
        metrics: {
          ...(client.metrics || {}),
          totalOrders: newOrders,
          totalSpent: newSpent
        },
        vipTier: newVipTier
      });
    }
  }

  // 5. Marcar venda como cancelada
  const now = new Date().toISOString();
  await db.updateDoc("sales", sale.id, {
    status: "cancelled",
    cancelledAt: now,
    cancelledBy: userId,
    cancellationReason: reason || "Cancelamento manual efetuado pelo operador",
    updatedAt: now,
    updatedBy: userId
  });

  return { success: true };
}

export interface EditSaleParams {
  oldSale: Sale;
  newData: {
    customerId?: string;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'split' | 'term';
    paymentDetails?: any;
    generatedInstallments?: Array<{ number: number; amount: number; dueDate: string }>;
    notes?: string;
  };
  userId: string;
  db: DbInterface;
}

/**
 * Executa a edição segura e atômica de uma venda existente:
 * 1. Calcula os deltas de estoque por produto (respeitando kits e produtos individuais).
 * 2. Aplica apenas a diferença (baixa ou estorno proporcional).
 * 3. Reconcilia o financeiro (atualiza receita ou recria parcelas a receber).
 * 4. Reconcilia métricas do cliente anterior e novo cliente se houver troca.
 * 5. Registra o histórico de alterações (editHistory) e atualiza o documento da venda.
 */
export async function executeEditSale({
  oldSale,
  newData,
  userId,
  db
}: EditSaleParams): Promise<{ success: boolean; message?: string }> {
  if (oldSale.status === "cancelled") {
    throw new Error("Não é possível editar uma venda que já foi cancelada.");
  }

  const [prods, kits, finTransactions, receivables, customers] = await Promise.all([
    db.getDocs("products"),
    db.getDocs("product_kits"),
    db.getDocs("financial_transactions"),
    db.getDocs("accounts_receivable"),
    db.getDocs("customers")
  ]);

  // 1. Reconciliação cirúrgica de estoque
  const deltas = calculateStockDeltas(oldSale.items, newData.items, prods, kits);

  for (const d of deltas) {
    if (d.delta === 0) continue;

    const prod = prods.find((p: any) => p.id === d.productId);
    if (prod) {
      if (d.delta > 0) {
        // Vendeu mais unidades -> Baixa a diferença adicional
        const newCurrent = (prod.currentStock || 0) - d.delta;
        const newAvailable = (prod.availableStock || 0) - d.delta;

        await db.updateDoc("products", prod.id, {
          currentStock: newCurrent,
          availableStock: newAvailable
        });

        await db.createDoc("inventory_transactions", {
          productId: prod.id,
          locationId: "loja-fisica",
          type: "out",
          quantity: d.delta,
          costPriceAtTime: d.costPrice || prod.costPrice || 0,
          reason: `Ajuste Edição Venda Ref #${oldSale.id} (Adição de +${d.delta} un.)`
        });
      } else {
        // Vendeu menos unidades ou item removido -> Devolve |delta| ao estoque
        const returnQty = Math.abs(d.delta);
        const newCurrent = (prod.currentStock || 0) + returnQty;
        const newAvailable = (prod.availableStock || 0) + returnQty;

        await db.updateDoc("products", prod.id, {
          currentStock: newCurrent,
          availableStock: newAvailable
        });

        await db.createDoc("inventory_transactions", {
          productId: prod.id,
          locationId: "loja-fisica",
          type: "return",
          quantity: returnQty,
          costPriceAtTime: d.costPrice || prod.costPrice || 0,
          reason: `Ajuste Edição Venda Ref #${oldSale.id} (Devolução de ${returnQty} un.)`
        });
      }
    }
  }

  // 2. Reconciliação Financeira
  const isTermOrMultiInstallment = 
    newData.paymentMethod === "term" || 
    (newData.paymentMethod === "credit_card" && (newData.paymentDetails?.installments || 1) > 1);

  const existingFin = (finTransactions || []).filter(
    (t: any) => t.referenceId === oldSale.id && t.status !== "cancelled"
  );
  const existingReceivables = (receivables || []).filter(
    (r: any) => r.saleId === oldSale.id && r.status !== "cancelled"
  );

  const customerName = newData.customerId
    ? ((customers || []).find((c: any) => c.id === newData.customerId)?.name || "Cliente")
    : "Não Identificado";

  if (isTermOrMultiInstallment) {
    // Cancela receita imediata anterior se houver
    for (const ft of existingFin) {
      await db.updateDoc("financial_transactions", ft.id, { status: "cancelled" });
    }
    // Cancela parcelas anteriores para recriar as novas
    for (const ar of existingReceivables) {
      await db.updateDoc("accounts_receivable", ar.id, { status: "cancelled" });
    }

    // Cria as novas parcelas
    const instList = newData.generatedInstallments || [];
    for (const inst of instList) {
      await db.createDoc("accounts_receivable", {
        customerId: newData.customerId || undefined,
        saleId: oldSale.id,
        description: `Parcela ${inst.number}/${instList.length} - Venda PDV Ref #${oldSale.id} - Cliente: ${customerName}`,
        amount: inst.amount,
        dueDate: inst.dueDate,
        status: "pending",
        paymentMethod: newData.paymentMethod,
        installments: instList.length,
        currentInstallment: inst.number
      });
    }
  } else {
    // Pagamento imediato (à vista, PIX, débito, crédito 1x, split)
    // Cancela qualquer parcela a receber anterior
    for (const ar of existingReceivables) {
      await db.updateDoc("accounts_receivable", ar.id, { status: "cancelled" });
    }

    if (existingFin.length > 0) {
      const mainFt = existingFin[0];
      await db.updateDoc("financial_transactions", mainFt.id, {
        amount: newData.total,
        description: `Venda PDV Ref #${oldSale.id} (Editada) - Cliente: ${customerName}`,
        paymentDate: new Date().toISOString()
      });
      for (let i = 1; i < existingFin.length; i++) {
        await db.updateDoc("financial_transactions", existingFin[i].id, { status: "cancelled" });
      }
    } else {
      await db.createDoc("financial_transactions", {
        type: "revenue",
        category: "sale",
        amount: newData.total,
        description: `Venda PDV Ref #${oldSale.id} (Editada) - Cliente: ${customerName}`,
        paymentDate: new Date().toISOString(),
        status: "paid",
        bankAccountId: "caixa-geral",
        referenceId: oldSale.id,
        cashRegisterId: oldSale.cashRegisterId
      });
    }
  }

  // 3. Reconciliação das métricas do cliente
  const oldCustomerId = oldSale.customerId;
  const newCustomerId = newData.customerId;

  if (oldCustomerId === newCustomerId) {
    if (newCustomerId) {
      const client = (customers || []).find((c: any) => c.id === newCustomerId);
      if (client) {
        const deltaSpent = newData.total - oldSale.total;
        const newSpent = Math.max(0, (client.metrics?.totalSpent || 0) + deltaSpent);
        const orderCount = client.metrics?.totalOrders || 1;
        const newVipTier = calculateVipTier(newSpent, orderCount);

        await db.updateDoc("customers", client.id, {
          metrics: {
            ...(client.metrics || {}),
            totalSpent: newSpent
          },
          vipTier: newVipTier
        });
      }
    }
  } else {
    if (oldCustomerId) {
      const oldClient = (customers || []).find((c: any) => c.id === oldCustomerId);
      if (oldClient) {
        const newOrders = Math.max(0, (oldClient.metrics?.totalOrders || 1) - 1);
        const newSpent = Math.max(0, (oldClient.metrics?.totalSpent || oldSale.total) - oldSale.total);
        const newVipTier = calculateVipTier(newSpent, newOrders);
        await db.updateDoc("customers", oldClient.id, {
          metrics: { ...(oldClient.metrics || {}), totalOrders: newOrders, totalSpent: newSpent },
          vipTier: newVipTier
        });
      }
    }
    if (newCustomerId) {
      const newClient = (customers || []).find((c: any) => c.id === newCustomerId);
      if (newClient) {
        const newOrders = (newClient.metrics?.totalOrders || 0) + 1;
        const newSpent = (newClient.metrics?.totalSpent || 0) + newData.total;
        const newVipTier = calculateVipTier(newSpent, newOrders);
        await db.updateDoc("customers", newClient.id, {
          metrics: { ...(newClient.metrics || {}), totalOrders: newOrders, totalSpent: newSpent, lastPurchaseDate: new Date().toISOString() },
          vipTier: newVipTier
        });
      }
    }
  }

  // 4. Salvar histórico e atualizar a venda
  const now = new Date().toISOString();
  const editEntry = {
    editedAt: now,
    editedBy: userId,
    previousTotal: oldSale.total,
    newTotal: newData.total,
    reason: newData.notes || "Edição de itens/valores pelo operador"
  };

  await db.updateDoc("sales", oldSale.id, {
    customerId: newData.customerId || null,
    items: newData.items,
    subtotal: newData.subtotal,
    discount: newData.discount,
    total: newData.total,
    paymentMethod: newData.paymentMethod,
    paymentDetails: newData.paymentDetails || null,
    updatedAt: now,
    updatedBy: userId,
    editHistory: [...(oldSale.editHistory || []), editEntry]
  });

  return { success: true };
}
