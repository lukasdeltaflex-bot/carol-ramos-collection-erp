import {
  evaluateCondition,
  applyCustomFilters,
  normalizeText,
  parseNumeric,
  parseToDate
} from "../src/features/finance/utils/filterEngine";
import { ColumnDefinition, CustomFilterGroup, FilterCondition } from "../src/features/finance/types/filters";

console.log("========================================================");
console.log("🧪 SUÍTE DE TESTES: MOTOR DE FILTROS PERSONALIZÁVEIS");
console.log("========================================================");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    totalFailed++;
  }
}

// 1. Mock de Dados Representativos
const mockPayables = [
  {
    id: "pay-1",
    description: "Compra de Cosméticos Faciais",
    supplierId: "supp-1",
    supplierName: "Natura Cosméticos",
    amount: 150.0,
    paidAmount: 0,
    dueDate: "2026-10-25T00:00:00.000Z",
    status: "pending",
    category: "Cosméticos",
    paymentMethod: "bank_slip",
    notes: "Pedido urgente"
  },
  {
    id: "pay-2",
    description: "Aluguel Sala Comercial",
    supplierId: "supp-2",
    supplierName: "Imobiliária Ramos",
    amount: 2500.0,
    paidAmount: 2500.0,
    dueDate: "2026-10-05T00:00:00.000Z",
    status: "paid",
    category: "Aluguel",
    paymentMethod: "pix",
    notes: ""
  },
  {
    id: "pay-3",
    description: "Embalagens de Luxo",
    supplierId: "supp-3",
    supplierName: "Gráfica Carol",
    amount: 85.5,
    paidAmount: 0,
    dueDate: { seconds: 1785000000 }, // Firestore Timestamp simulado (julho 2026)
    status: "pending",
    category: "Embalagens",
    paymentMethod: "credit_card",
    notes: null
  },
  {
    id: "pay-4",
    description: "Serviço de Marketing Digital",
    supplierId: "supp-4",
    supplierName: "Agência Alpha",
    amount: 1200.0,
    paidAmount: 600.0,
    dueDate: "2026-10-10T00:00:00.000Z",
    status: "partially_paid",
    category: "Marketing",
    paymentMethod: "transfer",
    notes: "Parcela 1 de 2"
  }
];

const payableColumns: ColumnDefinition<any>[] = [
  { id: "description", label: "Descrição", type: "text", getValue: (i) => i.description },
  { id: "supplier", label: "Fornecedor", type: "select", getValue: (i) => i.supplierName },
  { id: "amount", label: "Valor Original", type: "number", getValue: (i) => i.amount },
  { id: "pendingAmount", label: "Valor Pendente", type: "number", getValue: (i) => i.amount - (i.paidAmount || 0) },
  { id: "dueDate", label: "Vencimento", type: "date", getValue: (i) => i.dueDate },
  { id: "status", label: "Status", type: "status", getValue: (i) => i.status },
  { id: "category", label: "Categoria", type: "category", getValue: (i) => i.category },
  { id: "paymentMethod", label: "Forma de Pagamento", type: "select", getValue: (i) => i.paymentMethod },
  { id: "notes", label: "Observações", type: "text", getValue: (i) => i.notes }
];

// --- TESTE 1: Normalização de Texto e Acentos ---
console.log("\n--- TESTE 1: Texto e Diacríticos ---");
assert(normalizeText("Cosméticos") === "cosmeticos", "normalizeText remove acento de Cosméticos");
assert(normalizeText("  Natura PJ  ") === "natura pj", "normalizeText trim e minúsculas");

const resText1 = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c1", field: "description", operator: "contains", value: "cosmeticos" }
  ]
}, payableColumns);
assert(resText1.length === 1 && resText1[0].id === "pay-1", "Filtro 'contém' sem acento acha registro com acento");

const resText2 = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c2", field: "notes", operator: "is_empty", value: "" }
  ]
}, payableColumns);
assert(resText2.length === 2 && resText2.some(p => p.id === "pay-2") && resText2.some(p => p.id === "pay-3"), "Filtro 'is_empty' acha vazios e nulos");

// --- TESTE 2: Valores Numéricos e Monetários ---
console.log("\n--- TESTE 2: Valores Monetários ---");
assert(parseNumeric("R$ 1.200,00") === 1200, "parseNumeric converte 'R$ 1.200,00' para 1200");
assert(parseNumeric("85,50") === 85.5, "parseNumeric converte '85,50' para 85.5");

const resNum1 = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c3", field: "amount", operator: "gt", value: "100" }
  ]
}, payableColumns);
assert(resNum1.length === 3, "Filtro amount > 100 acha 3 registros (150, 2500, 1200)");

const resNum2 = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c4", field: "amount", operator: "between", value: 80, secondValue: 200 }
  ]
}, payableColumns);
assert(resNum2.length === 2 && resNum2.some(p => p.id === "pay-1") && resNum2.some(p => p.id === "pay-3"), "Filtro amount between 80 e 200 acha 85.5 e 150");

// --- TESTE 3: Datas (ISO, Timestamp Firestore, Intervalos) ---
console.log("\n--- TESTE 3: Datas e Timestamps Firestore ---");
const dateParsed = parseToDate({ seconds: 1785000000 });
assert(dateParsed instanceof Date && !isNaN(dateParsed.getTime()), "parseToDate converte objeto Firestore Timestamp");

const resDate1 = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c5", field: "dueDate", operator: "between", value: "2026-10-01", secondValue: "2026-10-31" }
  ]
}, payableColumns);
assert(resDate1.length === 3, "Filtro between de datas acha lançamentos de outubro de 2026");

// --- TESTE 4: Status e Categorias ---
console.log("\n--- TESTE 4: Status e Categorias ---");
const resStatus = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c6", field: "status", operator: "equals", value: "pending" }
  ]
}, payableColumns);
assert(resStatus.length === 2, "Filtro status = pending acha 2 registros");

const resCat = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "c7", field: "category", operator: "equals", value: "Cosméticos" }
  ]
}, payableColumns);
assert(resCat.length === 1 && resCat[0].id === "pay-1", "Filtro category = Cosméticos acha 1 registro");

// --- TESTE 5: Exemplo Real do Prompt: 4 Critérios Combinados com E (AND) ---
console.log("\n--- TESTE 5: Caso do Prompt: 4 Critérios Combinados com E (AND) ---");
/*
  Exemplo do Prompt:
  Categoria: Cosméticos
  Status: Pendente
  Vencimento: entre 01/10/2026 e 31/10/2026
  Valor: maior que R$ 100,00
*/
const resPromptExample = applyCustomFilters(mockPayables, {
  logicalOperator: "AND",
  conditions: [
    { id: "p1", field: "category", operator: "equals", value: "Cosméticos" },
    { id: "p2", field: "status", operator: "equals", value: "pending" },
    { id: "p3", field: "dueDate", operator: "between", value: "2026-10-01", secondValue: "2026-10-31" },
    { id: "p4", field: "amount", operator: "gt", value: 100.0 }
  ]
}, payableColumns);
assert(
  resPromptExample.length === 1 && resPromptExample[0].id === "pay-1",
  "4 critérios com E (AND) encontram exatamente a conta de Cosméticos pendente de R$ 150 em outubro"
);

// --- TESTE 6: Combinação com OU (OR) ---
console.log("\n--- TESTE 6: Combinação com OU (OR) ---");
const resOr = applyCustomFilters(mockPayables, {
  logicalOperator: "OR",
  conditions: [
    { id: "o1", field: "category", operator: "equals", value: "Cosméticos" },
    { id: "o2", field: "category", operator: "equals", value: "Aluguel" }
  ]
}, payableColumns);
assert(resOr.length === 2, "Critérios com OU (OR) encontram registros de Cosméticos e Aluguel");

// --- TESTE 7: Limpeza de Filtros e Remoção Individual ---
console.log("\n--- TESTE 7: Limpeza e Remoção ---");
const emptyFilterGroup: CustomFilterGroup = {
  logicalOperator: "AND",
  conditions: []
};
const resClean = applyCustomFilters(mockPayables, emptyFilterGroup, payableColumns);
assert(resClean.length === mockPayables.length, "Filtro vazio retorna todos os registros originais");

console.log("\n========================================================");
console.log(`📊 RESULTADO DA SUÍTE DE TESTES DE FILTROS:`);
console.log(`   Total Passados: ${totalPassed}`);
console.log(`   Total Falhados: ${totalFailed}`);
console.log("========================================================\n");

if (totalFailed > 0) {
  process.exit(1);
}
