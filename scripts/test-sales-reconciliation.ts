import {
  calculateStockDeltas,
  expandToPhysicalItems,
  executeCancelSale,
  executeEditSale
} from '@/features/sales/services/salesReconciliation';
import { Sale, SaleItem } from '@/features/sales/types';
import { Product } from '@/features/products/types';

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
console.log("🧪 SUÍTE DE TESTES: RECONCILIAÇÃO SEGURA DE VENDAS");
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
    tenantId: "tenant-1",
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
    tenantId: "tenant-1",
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
    tenantId: "tenant-1",
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

// ▶️ 1. Testes de Deltas de Estoque
console.log("▶️ 1. Testes de Cálculo de Deltas de Estoque (calculateStockDeltas)");

// Caso A: Aumento de quantidade (+3 un.)
const oldItemsA: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }];
const newItemsA: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 5, unitPrice: 150, costPrice: 50, discount: 0 }];
const deltasA = calculateStockDeltas(oldItemsA, newItemsA, dummyProducts, dummyKits);
assert("1.1 Aumento de quantidade resulta em delta positivo (+3)", deltasA.length === 1 && deltasA[0].delta === 3);

// Caso B: Redução de quantidade (-2 un.)
const oldItemsB: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 5, unitPrice: 150, costPrice: 50, discount: 0 }];
const newItemsB: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 3, unitPrice: 150, costPrice: 50, discount: 0 }];
const deltasB = calculateStockDeltas(oldItemsB, newItemsB, dummyProducts, dummyKits);
assert("1.2 Redução de quantidade resulta em delta negativo (-2)", deltasB.length === 1 && deltasB[0].delta === -2);

// Caso C: Substituição de produto (remove prod-1, adiciona prod-2)
const oldItemsC: SaleItem[] = [{ productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }];
const newItemsC: SaleItem[] = [{ productId: "prod-2", name: "Blusa Linho", quantity: 3, unitPrice: 90, costPrice: 30, discount: 0 }];
const deltasC = calculateStockDeltas(oldItemsC, newItemsC, dummyProducts, dummyKits);
const dProd1 = deltasC.find(d => d.productId === "prod-1");
const dProd2 = deltasC.find(d => d.productId === "prod-2");
assert("1.3 Substituição de produto devolve prod-1 (-2) e baixa prod-2 (+3)", 
  deltasC.length === 2 && dProd1?.delta === -2 && dProd2?.delta === 3
);

// Caso D: Kit desmembrado em componentes
const itemsKit: SaleItem[] = [{ productId: "kit-1", name: "Kit Verão", quantity: 2, unitPrice: 220, costPrice: 80, discount: 0 }];
const physicalKit = expandToPhysicalItems(itemsKit, dummyProducts, dummyKits);
const comp1 = physicalKit.find(p => p.productId === "prod-1");
const comp2 = physicalKit.find(p => p.productId === "prod-2");
assert("1.4 Kit desmembrado gera 2 unidades de prod-1 e 4 unidades de prod-2",
  physicalKit.length === 2 && comp1?.quantity === 2 && comp2?.quantity === 4
);

// ▶️ 2. Testes de Cancelamento Seguro (executeCancelSale)
console.log("\n▶️ 2. Testes de Cancelamento Seguro (executeCancelSale)");

async function testCancellation() {
  const sale: Sale = {
    id: "sale-100",
    tenantId: "tenant-1",
    customerId: "cust-1",
    items: [
      { productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }
    ],
    subtotal: 300,
    discount: 0,
    total: 300,
    paymentMethod: "pix",
    status: "completed",
    channel: "pos"
  } as unknown as Sale;

  const mockProducts = [
    { id: "prod-1", currentStock: 8, availableStock: 8, costPrice: 50 }
  ];
  const mockCustomers = [
    { id: "cust-1", metrics: { totalOrders: 2, totalSpent: 600 } }
  ];
  const mockFin = [
    { id: "fin-100", referenceId: "sale-100", status: "paid" }
  ];

  const updateCalls: Array<{ collection: string; id: string; data: any }> = [];
  const createCalls: Array<{ collection: string; data: any }> = [];

  const mockDb = {
    getDocs: async (col: string) => {
      if (col === "products") return mockProducts;
      if (col === "product_kits") return dummyKits;
      if (col === "financial_transactions") return mockFin;
      if (col === "accounts_receivable") return [];
      if (col === "customers") return mockCustomers;
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

  const res = await executeCancelSale({
    sale,
    reason: "Desistência do cliente",
    userId: "user-test",
    db: mockDb
  });

  assert("2.1 Cancelamento executado com sucesso", res.success === true);

  const prodUp = updateCalls.find(c => c.collection === "products" && c.id === "prod-1");
  assert("2.2 Estoque devolvido corretamente (8 + 2 = 10)", prodUp?.data.currentStock === 10 && prodUp?.data.availableStock === 10);

  const invTx = createCalls.find(c => c.collection === "inventory_transactions");
  assert("2.3 inventory_transactions gerado com type: 'return'", invTx?.data.type === "return" && invTx?.data.quantity === 2);

  const finUp = updateCalls.find(c => c.collection === "financial_transactions" && c.id === "fin-100");
  assert("2.4 Transação financeira cancelada", finUp?.data.status === "cancelled");

  const custUp = updateCalls.find(c => c.collection === "customers" && c.id === "cust-1");
  assert("2.5 Métricas do cliente abatidas (totalOrders: 1, totalSpent: 300)", 
    custUp?.data.metrics.totalOrders === 1 && custUp?.data.metrics.totalSpent === 300
  );

  const saleUp = updateCalls.find(c => c.collection === "sales" && c.id === "sale-100");
  assert("2.6 Documento da venda marcado como 'cancelled'", 
    saleUp?.data.status === "cancelled" && saleUp?.data.cancellationReason === "Desistência do cliente"
  );

  // Idempotência
  let errorThrown = false;
  try {
    sale.status = "cancelled";
    await executeCancelSale({ sale, reason: "Teste", userId: "user-test", db: mockDb });
  } catch (e) {
    errorThrown = true;
  }
  assert("2.7 Idempotência garantida: cancelar venda já cancelada lança erro", errorThrown);
}

// ▶️ 3. Testes de Edição Segura (executeEditSale)
console.log("\n▶️ 3. Testes de Edição Segura (executeEditSale)");

async function testEditing() {
  const oldSale: Sale = {
    id: "sale-200",
    tenantId: "tenant-1",
    customerId: "cust-1",
    items: [
      { productId: "prod-1", name: "Vestido Seda", quantity: 2, unitPrice: 150, costPrice: 50, discount: 0 }
    ],
    subtotal: 300,
    discount: 0,
    total: 300,
    paymentMethod: "pix",
    status: "completed",
    channel: "pos"
  } as unknown as Sale;

  const mockProducts = [
    { id: "prod-1", currentStock: 8, availableStock: 8, costPrice: 50 }
  ];
  const mockCustomers = [
    { id: "cust-1", metrics: { totalOrders: 1, totalSpent: 300 } }
  ];
  const mockFin = [
    { id: "fin-200", referenceId: "sale-200", status: "paid", amount: 300 }
  ];

  const updateCalls: Array<{ collection: string; id: string; data: any }> = [];
  const createCalls: Array<{ collection: string; data: any }> = [];

  const mockDb = {
    getDocs: async (col: string) => {
      if (col === "products") return mockProducts;
      if (col === "product_kits") return dummyKits;
      if (col === "financial_transactions") return mockFin;
      if (col === "accounts_receivable") return [];
      if (col === "customers") return mockCustomers;
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

  // Edita de 2 unidades para 3 (+1 un)
  const res = await executeEditSale({
    oldSale,
    newData: {
      customerId: "cust-1",
      items: [
        { productId: "prod-1", name: "Vestido Seda", quantity: 3, unitPrice: 150, costPrice: 50, discount: 0 }
      ],
      subtotal: 450,
      discount: 0,
      total: 450,
      paymentMethod: "pix"
    },
    userId: "user-edit",
    db: mockDb
  });

  assert("3.1 Edição executada com sucesso", res.success === true);

  const prodUp = updateCalls.find(c => c.collection === "products" && c.id === "prod-1");
  assert("3.2 Apenas o delta de estoque (+1) foi abatido (8 - 1 = 7)", 
    prodUp?.data.currentStock === 7 && prodUp?.data.availableStock === 7
  );

  const invTx = createCalls.find(c => c.collection === "inventory_transactions");
  assert("3.3 inventory_transactions gerado com type: 'out' e quantidade: 1", 
    invTx?.data.type === "out" && invTx?.data.quantity === 1
  );

  const finUp = updateCalls.find(c => c.collection === "financial_transactions" && c.id === "fin-200");
  assert("3.4 Transação financeira atualizada com novo total (R$ 450)", finUp?.data.amount === 450);

  const custUp = updateCalls.find(c => c.collection === "customers" && c.id === "cust-1");
  assert("3.5 Métricas do cliente atualizadas (+150 -> totalSpent: 450)", custUp?.data.metrics.totalSpent === 450);

  const saleUp = updateCalls.find(c => c.collection === "sales" && c.id === "sale-200");
  assert("3.6 Histórico de edição registrado em editHistory", 
    Array.isArray(saleUp?.data.editHistory) && saleUp?.data.editHistory.length === 1 && saleUp?.data.editHistory[0].previousTotal === 300
  );
}

Promise.all([testCancellation(), testEditing()]).then(() => {
  console.log("\n========================================================");
  console.log(`📊 RESULTADO DOS TESTES DE RECONCILIAÇÃO:`);
  console.log(`   Total Executados: ${passedCount + failedCount}`);
  console.log(`   Aprovados:        ${passedCount}`);
  console.log(`   Falhas:           ${failedCount}`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
});
