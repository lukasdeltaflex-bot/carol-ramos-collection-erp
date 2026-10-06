import {
  calculateStockDeltas,
  expandToPhysicalItems,
  executeCancelSale,
  executeEditSale
} from '../src/features/sales/services/salesReconciliation';
import { Sale, SaleItem } from '../src/features/sales/types';
import { Product } from '../src/features/products/types';

let passedCount = 0;
let failedCount = 0;

function assert(description: string, condition: boolean, details: string = "") {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${description} - ${details}`);
  }
}

console.log("\n========================================================");
console.log("🧪 SUÍTE DE TESTES: RECONCILIAÇÃO SEGURA DE VENDAS RÁPIDAS");
console.log("========================================================\n");

const dummyProducts: Product[] = [
  {
    id: "prod-1",
    sku: "PROD-001",
    name: "Vestido Seda",
    costPrice: 50,
    currentStock: 10,
    availableStock: 10,
    status: "active",
    tenantId: "carol-ramos-collection",
    categoryId: "cat-1",
    salePrice: 150
  } as any,
  {
    id: "prod-2",
    sku: "PROD-002",
    name: "Blusa Linho",
    costPrice: 30,
    currentStock: 20,
    availableStock: 20,
    status: "active",
    tenantId: "carol-ramos-collection",
    categoryId: "cat-1",
    salePrice: 90
  } as any,
  {
    id: "kit-1",
    sku: "KIT-001",
    name: "Kit Verão",
    isKit: true,
    kitId: "kit-doc-1",
    costPrice: 80,
    currentStock: 5,
    availableStock: 5,
    status: "active",
    tenantId: "carol-ramos-collection",
    categoryId: "cat-1",
    salePrice: 220
  } as any
];

const dummyKits = [
  {
    id: "kit-doc-1",
    name: "Kit Verão",
    items: [
      { productId: "prod-1", quantity: 1 },
      { productId: "prod-2", quantity: 2 }
    ]
  }
];

async function runAllSalesTests() {
  // ========================================================
  // TESTE 1: Edição simples (Apenas observação / notas)
  // Venda R$ 100 -> editar observação -> salvar
  // Confirmar: venda atualizada, estoque e financeiro sem alteração indevida
  // ========================================================
  console.log("--- TESTE 1: Edição simples (Apenas notas/observação) ---");
  {
    const sale1: Sale = {
      id: "sale-simple-edit",
      tenantId: "carol-ramos-collection",
      customerId: "cust-1",
      items: [{ productId: "prod-1", name: "Vestido Seda", quantity: 1, unitPrice: 100, costPrice: 50, discount: 0 }],
      subtotal: 100,
      discount: 0,
      total: 100,
      paymentMethod: "pix",
      status: "completed",
      channel: "pos"
    } as any;

    const mockProds = [{ id: "prod-1", currentStock: 10, availableStock: 10, costPrice: 50 }];
    const mockFin = [{ id: "fin-1", referenceId: "sale-simple-edit", amount: 100, status: "paid" }];
    const mockCust = [{ id: "cust-1", metrics: { totalOrders: 1, totalSpent: 100 } }];

    const updateCalls: Array<{ collection: string; id: string; data: any }> = [];
    const createCalls: Array<{ collection: string; data: any }> = [];

    const mockDb = {
      getDocs: async (col: string) => {
        if (col === "products") return mockProds;
        if (col === "product_kits") return dummyKits;
        if (col === "financial_transactions") return mockFin;
        if (col === "accounts_receivable") return [];
        if (col === "customers") return mockCust;
        return [];
      },
      updateDoc: async (col: string, id: string, data: any) => {
        updateCalls.push({ collection: col, id, data });
        return { id, ...data };
      },
      createDoc: async (col: string, data: any) => {
        createCalls.push({ collection: col, data });
        return { id: "new-id", ...data };
      }
    };

    const editRes = await executeEditSale({
      oldSale: sale1,
      newData: {
        customerId: "cust-1",
        items: [{ productId: "prod-1", name: "Vestido Seda", quantity: 1, unitPrice: 100, costPrice: 50, discount: 0 }],
        subtotal: 100,
        discount: 0,
        total: 100,
        paymentMethod: "pix",
        notes: "Observação corrigida pelo operador"
      },
      userId: "user-op",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    assert("1.1 Venda atualizada com sucesso na edição simples", editRes.success === true);
    assert("1.2 Estoque não sofreu alteração indevida (zero updates em products)", !updateCalls.some(c => c.collection === "products"));
    assert("1.3 Nenhuma movimentação de estoque criada (zero inventory_transactions)", !createCalls.some(c => c.collection === "inventory_transactions"));
    assert("1.4 Financeiro não sofreu alteração indevida", !updateCalls.some(c => c.collection === "financial_transactions"));
  }

  // ========================================================
  // TESTE 2: Alterar quantidade (Aumento: 2 un -> 5 un)
  // Confirmar: somente +3 unidades de impacto no estoque
  // ========================================================
  console.log("\n--- TESTE 2: Alterar quantidade (Aumento 2 -> 5) ---");
  {
    const oldItems: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }];
    const newItems: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 5, unitPrice: 150, costPrice: 50, discount: 0 }];
    const deltas = calculateStockDeltas(oldItems, newItems, dummyProducts, dummyKits);

    assert("2.1 Delta calculado é exatamente +3 unidades", deltas.length === 1 && deltas[0].delta === 3);

    const mockProds = [{ id: "prod-1", currentStock: 8, availableStock: 8, costPrice: 50 }];
    const updateCalls: Array<{ collection: string; id: string; data: any }> = [];
    const createCalls: Array<{ collection: string; data: any }> = [];

    const mockDb = {
      getDocs: async (col: string) => col === "products" ? mockProds : [],
      updateDoc: async (col: string, id: string, data: any) => { updateCalls.push({ collection: col, id, data }); return { id, ...data }; },
      createDoc: async (col: string, data: any) => { createCalls.push({ collection: col, data }); return { id: "new-id", ...data }; }
    };

    const oldSale: Sale = {
      id: "sale-qty-inc",
      tenantId: "carol-ramos-collection",
      items: oldItems,
      subtotal: 300,
      discount: 0,
      total: 300,
      paymentMethod: "pix",
      status: "completed"
    } as any;

    await executeEditSale({
      oldSale,
      newData: { items: newItems, subtotal: 750, discount: 0, total: 750, paymentMethod: "pix" },
      userId: "user-op",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    const prodUp = updateCalls.find(c => c.collection === "products" && c.id === "prod-1");
    assert("2.2 Apenas 3 unidades adicionais foram baixadas do estoque (8 - 3 = 5)", prodUp?.data.currentStock === 5);

    const invTx = createCalls.find(c => c.collection === "inventory_transactions");
    assert("2.3 inventory_transactions gerado com type: 'out' e quantidade: 3", invTx?.data.type === "out" && invTx?.data.quantity === 3);
  }

  // ========================================================
  // TESTE 3: Reduzir quantidade (Redução: 5 un -> 2 un)
  // Confirmar: devolução de 3 unidades ao estoque
  // ========================================================
  console.log("\n--- TESTE 3: Reduzir quantidade (Redução 5 -> 2) ---");
  {
    const oldItems: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 5, unitPrice: 150, costPrice: 50, discount: 0 }];
    const newItems: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }];
    const deltas = calculateStockDeltas(oldItems, newItems, dummyProducts, dummyKits);

    assert("3.1 Delta calculado é exatamente -3 unidades", deltas.length === 1 && deltas[0].delta === -3);

    const mockProds = [{ id: "prod-1", currentStock: 5, availableStock: 5, costPrice: 50 }];
    const updateCalls: Array<{ collection: string; id: string; data: any }> = [];
    const createCalls: Array<{ collection: string; data: any }> = [];

    const mockDb = {
      getDocs: async (col: string) => col === "products" ? mockProds : [],
      updateDoc: async (col: string, id: string, data: any) => { updateCalls.push({ collection: col, id, data }); return { id, ...data }; },
      createDoc: async (col: string, data: any) => { createCalls.push({ collection: col, data }); return { id: "new-id", ...data }; }
    };

    const oldSale: Sale = {
      id: "sale-qty-dec",
      tenantId: "carol-ramos-collection",
      items: oldItems,
      subtotal: 750,
      discount: 0,
      total: 750,
      paymentMethod: "pix",
      status: "completed"
    } as any;

    await executeEditSale({
      oldSale,
      newData: { items: newItems, subtotal: 300, discount: 0, total: 300, paymentMethod: "pix" },
      userId: "user-op",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    const prodUp = updateCalls.find(c => c.collection === "products" && c.id === "prod-1");
    assert("3.2 Exatamente 3 unidades foram devolvidas ao estoque (5 + 3 = 8)", prodUp?.data.currentStock === 8);

    const invTx = createCalls.find(c => c.collection === "inventory_transactions");
    assert("3.3 inventory_transactions gerado com type: 'return' e quantidade: 3", invTx?.data.type === "return" && invTx?.data.quantity === 3);
  }

  // ========================================================
  // TESTE 4: Trocar produto (Produto A x2 -> Produto B x2)
  // Confirmar: A +2 devolvido, B -2 baixado
  // ========================================================
  console.log("\n--- TESTE 4: Trocar produto (Produto A x2 -> Produto B x2) ---");
  {
    const oldItems: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }];
    const newItems: SaleItem[] = [{ productId: "prod-2", name: "Blusa Linho", quantity: 2, unitPrice: 90, costPrice: 30, discount: 0 }];
    const deltas = calculateStockDeltas(oldItems, newItems, dummyProducts, dummyKits);

    const deltaA = deltas.find(d => d.productId === "prod-1");
    const deltaB = deltas.find(d => d.productId === "prod-2");

    assert("4.1 Produto A tem delta -2 (devolução ao estoque)", deltaA?.delta === -2);
    assert("4.2 Produto B tem delta +2 (baixa no estoque)", deltaB?.delta === 2);

    const mockProds = [
      { id: "prod-1", currentStock: 8, availableStock: 8, costPrice: 50 },
      { id: "prod-2", currentStock: 20, availableStock: 20, costPrice: 30 }
    ];
    const updateCalls: Array<{ collection: string; id: string; data: any }> = [];

    const mockDb = {
      getDocs: async (col: string) => col === "products" ? mockProds : [],
      updateDoc: async (col: string, id: string, data: any) => { updateCalls.push({ collection: col, id, data }); return { id, ...data }; },
      createDoc: async (col: string, data: any) => ({ id: "new-id", ...data })
    };

    const oldSale: Sale = {
      id: "sale-swap",
      tenantId: "carol-ramos-collection",
      items: oldItems,
      subtotal: 300,
      total: 300,
      paymentMethod: "pix",
      status: "completed"
    } as any;

    await executeEditSale({
      oldSale,
      newData: { items: newItems, subtotal: 180, discount: 0, total: 180, paymentMethod: "pix" },
      userId: "user-op",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    const upA = updateCalls.find(c => c.id === "prod-1");
    const upB = updateCalls.find(c => c.id === "prod-2");

    assert("4.3 Produto A devolveu 2 unidades (8 + 2 = 10)", upA?.data.currentStock === 10);
    assert("4.4 Produto B baixou 2 unidades (20 - 2 = 18)", upB?.data.currentStock === 18);
  }

  // ========================================================
  // TESTE 5: Alterar valor (R$ 100 -> R$ 120)
  // Confirmar: consistência financeira e saldo atualizado
  // ========================================================
  console.log("\n--- TESTE 5: Alterar valor (R$ 100 -> R$ 120) ---");
  {
    const oldSale: Sale = {
      id: "sale-fin-100",
      tenantId: "carol-ramos-collection",
      customerId: "cust-1",
      items: [{ productId: "prod-1", name: "Vestido Seda", quantity: 1, unitPrice: 100, costPrice: 50, discount: 0 }],
      subtotal: 100,
      discount: 0,
      total: 100,
      paymentMethod: "pix",
      status: "completed"
    } as any;

    const mockFin = [{ id: "fin-trans-1", referenceId: "sale-fin-100", amount: 100, status: "paid" }];
    const mockCust = [{ id: "cust-1", metrics: { totalOrders: 1, totalSpent: 100 } }];
    const updateCalls: Array<{ collection: string; id: string; data: any }> = [];

    const mockDb = {
      getDocs: async (col: string) => {
        if (col === "products") return dummyProducts;
        if (col === "financial_transactions") return mockFin;
        if (col === "customers") return mockCust;
        return [];
      },
      updateDoc: async (col: string, id: string, data: any) => { updateCalls.push({ collection: col, id, data }); return { id, ...data }; },
      createDoc: async (col: string, data: any) => ({ id: "new-id", ...data })
    };

    await executeEditSale({
      oldSale,
      newData: {
        customerId: "cust-1",
        items: [{ productId: "prod-1", name: "Vestido Seda", quantity: 1, unitPrice: 120, costPrice: 50, discount: 0 }],
        subtotal: 120,
        discount: 0,
        total: 120,
        paymentMethod: "pix"
      },
      userId: "user-op",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    const finUp = updateCalls.find(c => c.collection === "financial_transactions" && c.id === "fin-trans-1");
    assert("5.1 Lançamento financeiro atualizado para R$ 120", finUp?.data.amount === 120);

    const custUp = updateCalls.find(c => c.collection === "customers" && c.id === "cust-1");
    assert("5.2 Métricas de consumo do cliente ajustadas para R$ 120", custUp?.data.metrics.totalSpent === 120);
  }

  // ========================================================
  // TESTE 6: Cancelamento de venda ativa
  // Confirmar: venda cancelada, estoque devolvido, financeiro cancelado
  // ========================================================
  console.log("\n--- TESTE 6: Cancelamento de venda ativa ---");
  {
    const saleToCancel: Sale = {
      id: "sale-to-cancel-full",
      tenantId: "carol-ramos-collection",
      customerId: "cust-1",
      items: [{ productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }],
      subtotal: 300,
      discount: 0,
      total: 300,
      paymentMethod: "pix",
      status: "completed"
    } as any;

    const mockProds = [{ id: "prod-1", currentStock: 8, availableStock: 8, costPrice: 50 }];
    const mockFin = [{ id: "fin-c-1", referenceId: "sale-to-cancel-full", status: "paid" }];
    const mockCust = [{ id: "cust-1", metrics: { totalOrders: 2, totalSpent: 600 } }];

    const updateCalls: Array<{ collection: string; id: string; data: any }> = [];
    const createCalls: Array<{ collection: string; data: any }> = [];

    const mockDb = {
      getDocs: async (col: string) => {
        if (col === "products") return mockProds;
        if (col === "product_kits") return dummyKits;
        if (col === "financial_transactions") return mockFin;
        if (col === "accounts_receivable") return [];
        if (col === "customers") return mockCust;
        return [];
      },
      updateDoc: async (col: string, id: string, data: any) => { updateCalls.push({ collection: col, id, data }); return { id, ...data }; },
      createDoc: async (col: string, data: any) => { createCalls.push({ collection: col, data }); return { id: "new-id", ...data }; }
    };

    const cancelRes = await executeCancelSale({
      sale: saleToCancel,
      reason: "Desistência formal do cliente",
      userId: "user-op",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    assert("6.1 Cancelamento executado com sucesso", cancelRes.success === true);

    const saleUp = updateCalls.find(c => c.collection === "sales" && c.id === "sale-to-cancel-full");
    assert("6.2 Status da venda atualizado para 'cancelled'", saleUp?.data.status === "cancelled");
    assert("6.3 Motivo de cancelamento registrado na venda", saleUp?.data.cancellationReason === "Desistência formal do cliente");

    const prodUp = updateCalls.find(c => c.collection === "products" && c.id === "prod-1");
    assert("6.4 Estoque físico devolvido integralmente (8 + 2 = 10)", prodUp?.data.currentStock === 10);

    const finUp = updateCalls.find(c => c.collection === "financial_transactions" && c.id === "fin-c-1");
    assert("6.5 Transação financeira cancelada", finUp?.data.status === "cancelled");

    const custUp = updateCalls.find(c => c.collection === "customers" && c.id === "cust-1");
    assert("6.6 Métricas do cliente abatidas (totalOrders: 1, totalSpent: 300)", 
      custUp?.data.metrics.totalOrders === 1 && custUp?.data.metrics.totalSpent === 300
    );
  }

  // ========================================================
  // TESTE 7: Duplo cancelamento (Idempotência)
  // Tentar cancelar venda já cancelada -> NÃO duplicar devolução de estoque
  // ========================================================
  console.log("\n--- TESTE 7: Duplo cancelamento (Idempotência) ---");
  {
    const alreadyCancelledSale: Sale = {
      id: "sale-already-cancelled",
      tenantId: "carol-ramos-collection",
      status: "cancelled",
      items: [{ productId: "prod-1", name: "Vestido", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }]
    } as any;

    let errorThrown = false;
    let errorMessage = "";
    const updateCalls: any[] = [];

    const mockDb = {
      getDocs: async () => [],
      updateDoc: async (col: string, id: string, data: any) => { updateCalls.push({ col, id, data }); },
      createDoc: async () => ({ id: "1" })
    };

    try {
      await executeCancelSale({
        sale: alreadyCancelledSale,
        reason: "Tentativa repetida",
        userId: "user-op",
        tenantId: "carol-ramos-collection",
        db: mockDb
      });
    } catch (e: any) {
      errorThrown = true;
      errorMessage = e.message;
    }

    assert("7.1 Tentativa de duplo cancelamento lançou erro", errorThrown);
    assert("7.2 Mensagem informa que venda já está cancelada", errorMessage.includes("já se encontra cancelada"));
    assert("7.3 Nenhum documento foi atualizado na segunda tentativa (zero devolução de estoque)", updateCalls.length === 0);
  }

  // ========================================================
  // TESTE 8: Persistência após cancelamento
  // Após cancelar, recarregar e confirmar que status permanece correto
  // ========================================================
  console.log("\n--- TESTE 8: Persistência após cancelamento ---");
  {
    const persistentDbStore: Record<string, any> = {
      "sale-persisted-1": {
        id: "sale-persisted-1",
        tenantId: "carol-ramos-collection",
        status: "completed",
        items: [{ productId: "prod-1", quantity: 1, unitPrice: 100, costPrice: 50 }]
      }
    };

    const mockDb = {
      getDocs: async () => [dummyProducts[0]],
      updateDoc: async (col: string, id: string, data: any) => {
        if (col === "sales" && persistentDbStore[id]) {
          persistentDbStore[id] = { ...persistentDbStore[id], ...data };
        }
        return { id, ...data };
      },
      createDoc: async () => ({ id: "1" })
    };

    await executeCancelSale({
      sale: persistentDbStore["sale-persisted-1"],
      reason: "Cancelado pelo cliente",
      userId: "user-1",
      tenantId: "carol-ramos-collection",
      db: mockDb
    });

    // Simula reload (leitura do banco)
    const reloadedSale = persistentDbStore["sale-persisted-1"];
    assert("8.1 Venda persiste como 'cancelled' após cancelamento", reloadedSale.status === "cancelled");
    assert("8.2 Data do cancelamento gravada", Boolean(reloadedSale.cancelledAt));
    assert("8.3 Responsável pelo cancelamento gravado", reloadedSale.cancelledBy === "user-1");
  }

  // ========================================================
  // TESTE 9: Segurança / Isolamento multi-tenant
  // Tentar editar ou cancelar venda de outro inquilino deve ser bloqueado
  // ========================================================
  console.log("\n--- TESTE 9: Segurança e Isolamento Multi-tenant ---");
  {
    const foreignSale: Sale = {
      id: "sale-foreign-tenant",
      tenantId: "outro-inquilino-empresa-x",
      status: "completed",
      items: [{ productId: "prod-1", quantity: 1, unitPrice: 100, costPrice: 50 }]
    } as any;

    let cancelBlocked = false;
    let editBlocked = false;

    const mockDb = {
      getDocs: async () => [],
      updateDoc: async () => {},
      createDoc: async () => ({ id: "1" })
    };

    try {
      await executeCancelSale({
        sale: foreignSale,
        userId: "user-attacker",
        tenantId: "carol-ramos-collection",
        db: mockDb
      });
    } catch (e: any) {
      if (e.message.includes("outro inquilino")) cancelBlocked = true;
    }

    try {
      await executeEditSale({
        oldSale: foreignSale,
        newData: { items: [], subtotal: 0, discount: 0, total: 0, paymentMethod: "pix" },
        userId: "user-attacker",
        tenantId: "carol-ramos-collection",
        db: mockDb
      });
    } catch (e: any) {
      if (e.message.includes("outro inquilino")) editBlocked = true;
    }

    assert("9.1 Tentativa de cancelar venda de outro inquilino é bloqueada", cancelBlocked);
    assert("9.2 Tentativa de editar venda de outro inquilino é bloqueada", editBlocked);
  }

  // ========================================================
  // TESTE 10: Integridade de Kits e Multi-produtos
  // Desmembramento de kit em itens físicos e preservação de SKUs não alterados
  // ========================================================
  console.log("\n--- TESTE 10: Integridade de Kits e Multi-produtos ---");
  {
    const itemsWithKit: SaleItem[] = [
      { productId: "kit-1", name: "Kit Verão", quantity: 2, unitPrice: 220, costPrice: 80, discount: 0 },
      { productId: "prod-2", name: "Blusa Linho", quantity: 1, unitPrice: 90, costPrice: 30, discount: 0 }
    ];

    const physicalItems = expandToPhysicalItems(itemsWithKit, dummyProducts, dummyKits);

    // kit-1 contém: prod-1 x1 e prod-2 x2. Como vendemos 2 kits:
    // prod-1 = 2 un.
    // prod-2 = 4 un + 1 un avulsa = 5 un.
    const p1 = physicalItems.find(p => p.productId === "prod-1");
    const p2Items = physicalItems.filter(p => p.productId === "prod-2");
    const totalP2 = p2Items.reduce((acc, curr) => acc + curr.quantity, 0);

    assert("10.1 Kit expandiu 2 unidades físicas do prod-1", p1?.quantity === 2);
    assert("10.2 Kit + item avulso somaram exatamente 5 unidades físicas do prod-2", totalP2 === 5);
  }

  console.log("\n========================================================");
  console.log(`📊 RESULTADO FINAL DA SUÍTE DE TESTES DE VENDAS RÁPIDAS:`);
  console.log(`   Total Passados: ${passedCount}`);
  console.log(`   Total Falhados: ${failedCount}`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllSalesTests().catch(err => {
  console.error("Erro fatal na execução dos testes de vendas:", err);
  process.exit(1);
});
