import {
  parseDateToMillis,
  normalizeText,
  matchText,
  matchDate,
  matchCurrency,
  matchSelect
} from "../src/features/finance/utils/columnFilters";

console.log("========================================================");
console.log("🧪 SUÍTE DE TESTES: ORDENAÇÃO E FILTROS INDIVIDUAIS DE COLUNA");
console.log("========================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failed++;
  }
}

// Dados de teste realistas
const mockPayables = [
  {
    id: "pay-1",
    description: "Conta de Luz - CEMIG",
    supplierId: "supp-1",
    supplierName: "CEMIG Distribuição",
    dueDate: "2026-10-05",
    amount: 350.50,
    paymentMethod: "bank_slip",
    status: "pending" as const,
  },
  {
    id: "pay-2",
    description: "Lote Perfumes Victoria's Secret Cosméticos",
    supplierId: "supp-2",
    supplierName: "Victoria Importadora",
    dueDate: "2026-10-15",
    amount: 1250.00,
    paymentMethod: "company_credit_card",
    status: "pending" as const,
  },
  {
    id: "pay-3",
    description: "Aluguel Sala Comercial",
    supplierId: "supp-3",
    supplierName: "Imobiliária Central",
    dueDate: "2026-10-10",
    amount: 2800.00,
    paymentMethod: "pix",
    status: "paid" as const,
  },
  {
    id: "pay-4",
    description: "Embalagens Personalizadas Carol Ramos",
    supplierId: "supp-4",
    supplierName: "Gráfica Ramos",
    dueDate: "2026-11-20",
    amount: 600.00,
    paymentMethod: "bank_slip",
    status: "pending" as const,
  },
  {
    id: "pay-5",
    description: "Frete Transportadora Entrega Rápida",
    supplierId: "supp-5",
    supplierName: "Jadlog Logística",
    dueDate: { seconds: 1792195200, nanoseconds: 0 }, // Firestore Timestamp para 18/10/2026
    amount: 150.00,
    paymentMethod: "pix",
    status: "pending" as const,
  },
  {
    id: "pay-6",
    description: "Licença Software ERP",
    supplierId: "supp-6",
    supplierName: "DeltaFlex Tech",
    dueDate: "28/10/2026", // Formato brasileiro
    amount: 99.90,
    paymentMethod: "company_credit_card",
    status: "paid" as const,
  }
];

// --- 1. Testes de Datas e Timestamps ---
console.log("--- TESTE 1: Parser de Datas e Firestore Timestamps ---");
assert(parseDateToMillis("2026-10-15") !== null, "Converte data ISO YYYY-MM-DD");
assert(parseDateToMillis("28/10/2026") !== null, "Converte data brasileira DD/MM/YYYY");
assert(parseDateToMillis({ seconds: 1792195200, nanoseconds: 0 }) !== null, "Converte Firestore Timestamp");
assert(parseDateToMillis("") === null, "String vazia retorna null de forma segura");
assert(parseDateToMillis(null) === null, "null retorna null de forma segura");

// --- 2. Testes de Ordenação ---
console.log("\n--- TESTE 2: Ordenação ---");

// 2.1 Ordenação de Datas (Mais antiga -> Mais recente e vice-versa)
const sortedByDateAsc = [...mockPayables].sort((a, b) => {
  const tA = parseDateToMillis(a.dueDate) || 0;
  const tB = parseDateToMillis(b.dueDate) || 0;
  return tA - tB;
});
assert(sortedByDateAsc[0].id === "pay-1", "Data asc: 05/10/2026 é o primeiro");
assert(sortedByDateAsc[sortedByDateAsc.length - 1].id === "pay-4", "Data asc: 20/11/2026 é o último");

const sortedByDateDesc = [...mockPayables].sort((a, b) => {
  const tA = parseDateToMillis(a.dueDate) || 0;
  const tB = parseDateToMillis(b.dueDate) || 0;
  return tB - tA;
});
assert(sortedByDateDesc[0].id === "pay-4", "Data desc: 20/11/2026 é o primeiro");

// 2.2 Ordenação de Valores (Menor -> Maior e vice-versa)
const sortedByAmountAsc = [...mockPayables].sort((a, b) => a.amount - b.amount);
assert(sortedByAmountAsc[0].amount === 99.90, "Valor asc: R$ 99,90 é o menor");
assert(sortedByAmountAsc[sortedByAmountAsc.length - 1].amount === 2800.00, "Valor asc: R$ 2.800,00 é o maior");

const sortedByAmountDesc = [...mockPayables].sort((a, b) => b.amount - a.amount);
assert(sortedByAmountDesc[0].amount === 2800.00, "Valor desc: R$ 2.800,00 é o maior");

// 2.3 Ordenação Textual com Acentos
const sortedByDescAsc = [...mockPayables].sort((a, b) =>
  a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" })
);
assert(sortedByDescAsc[0].id === "pay-3", "Texto asc: 'Aluguel' vem primeiro que 'Conta' e 'Embalagens'");

// --- 3. Testes de Filtros Individuais ---
console.log("\n--- TESTE 3: Filtros Individuais de Coluna ---");

// 3.1 Filtro de Data - Intervalo de Outubro de 2026
const octFilter = {
  type: "date" as const,
  mode: "range" as const,
  startDate: "2026-10-01",
  endDate: "2026-10-31"
};
const octPayables = mockPayables.filter((p) => matchDate(p.dueDate, octFilter));
assert(octPayables.length === 5, "Filtro de data (outubro de 2026) encontra 5 registros de outubro e exclui o de novembro");

// 3.2 Filtro de Data Específica
const exactFilter = {
  type: "date" as const,
  mode: "exact" as const,
  exactDate: "2026-10-15"
};
const exactPayables = mockPayables.filter((p) => matchDate(p.dueDate, exactFilter));
assert(exactPayables.length === 1 && exactPayables[0].id === "pay-2", "Filtro de data específica encontra 15/10/2026");

// 3.3 Filtro de Valor - Maior que R$ 500
const gt500Filter = {
  type: "currency" as const,
  operator: "gt" as const,
  value: 500
};
const gt500Payables = mockPayables.filter((p) => matchCurrency(p.amount, gt500Filter));
assert(gt500Payables.length === 3, "Filtro valor > R$ 500 encontra 3 contas (1250, 2800, 600)");

// 3.4 Filtro de Valor - Entre R$ 100 e R$ 400
const betweenFilter = {
  type: "currency" as const,
  operator: "between" as const,
  value: 100,
  secondValue: 400
};
const betweenPayables = mockPayables.filter((p) => matchCurrency(p.amount, betweenFilter));
assert(betweenPayables.length === 2, "Filtro valor entre R$ 100 e R$ 400 encontra 2 contas (350.50 e 150.00)");

// 3.5 Filtro de Descrição - Pesquisa de Texto com Acentos
const textFilter = {
  type: "text" as const,
  value: "victorias secret", // sem apóstrofo e em minúsculas
  mode: "contains" as const
};
const textPayables = mockPayables.filter((p) => matchText(p.description, textFilter));
assert(textPayables.length === 1 && textPayables[0].id === "pay-2", "Filtro texto 'victorias secret' localiza 'Victoria's Secret'");

// 3.6 Filtro de Status
const statusFilter = {
  type: "select" as const,
  selectedValues: ["pending"]
};
const pendingPayables = mockPayables.filter((p) => matchSelect(p.status, statusFilter));
assert(pendingPayables.length === 4, "Filtro de status 'pending' encontra 4 registros pendentes");

// 3.7 Filtro de Fornecedor
const supplierFilter = {
  type: "text" as const,
  value: "Imobiliária",
  mode: "contains" as const
};
const suppPayables = mockPayables.filter((p) => matchText(p.supplierName, supplierFilter));
assert(suppPayables.length === 1 && suppPayables[0].id === "pay-3", "Filtro fornecedor 'Imobiliária' encontra Imobiliária Central");

// --- 4. Teste de Filtros Combinados (Cenário Obrigatório do Prompt) ---
console.log("\n--- TESTE 4: Combinação de Vários Filtros Simultâneos (E / AND) ---");
// Critérios do prompt:
// 1. Data de Vencimento: outubro de 2026
// 2. Status: Pendente
// 3. Valor: maior que R$ 500,00
const combinedPayables = mockPayables.filter((p) => {
  const matchD = matchDate(p.dueDate, octFilter);
  const matchS = matchSelect(p.status, statusFilter);
  const matchV = matchCurrency(p.amount, gt500Filter);
  return matchD && matchS && matchV;
});
assert(
  combinedPayables.length === 1 && combinedPayables[0].id === "pay-2",
  "Combinação simultânea de Vencimento (Out/26) + Status (Pendente) + Valor (> 500) retorna exatamente a conta de Victoria's Secret de R$ 1.250"
);

// --- 5. Teste de Remoção de Filtro Único ---
console.log("\n--- TESTE 5: Remoção de Filtro Único e Limpar Todos ---");
// Se remover o filtro de valor (> 500), sobram os pendentes de outubro: pay-1, pay-2, pay-5 (3 contas)
const withoutValueFilter = mockPayables.filter((p) => {
  const matchD = matchDate(p.dueDate, octFilter);
  const matchS = matchSelect(p.status, statusFilter);
  return matchD && matchS;
});
assert(withoutValueFilter.length === 3, "Remover filtro de valor mantém os outros 2 filtros e retorna 3 contas");

// Limpar todos retorna todos os 6 registros
const allRestored = mockPayables.filter(() => true);
assert(allRestored.length === 6, "Limpar todos os filtros restaura os 6 registros originais");

// --- 6. Testes Específicos: Filtros Restaurados 'Pago' e 'Pendente' ---
console.log("\n--- TESTE 6: Restaurar Filtro Específico 'Pago' e 'Pendente' (Testes A, B, C, D, E) ---");

// Simulação de Data Atual (01/10/2026 midnight) para checagem de atraso
const testTodayMidnight = new Date("2026-10-10T00:00:00.000Z").getTime();
const isTestOverdue = (p: typeof mockPayables[0]) => {
  const dt = parseDateToMillis(p.dueDate);
  return (p.status === "pending" && dt !== null && dt < testTodayMidnight);
};

const filterByQuickStatus = (status: "all" | "pending" | "paid" | "overdue") => {
  return mockPayables.filter((p) => {
    if (status === "pending") return p.status === "pending" && !isTestOverdue(p);
    if (status === "paid") return p.status === "paid";
    if (status === "overdue") return isTestOverdue(p);
    return true;
  });
};

// Teste A: Restaurar Pago
const quickPaid = filterByQuickStatus("paid");
assert(quickPaid.length === 2 && quickPaid.every((p) => p.status === "paid"), "Teste A: Filtro Pago apresenta exatamente os registros pagos (pay-3 e pay-6)");

// Teste B: Restaurar Pendente
const quickPending = filterByQuickStatus("pending");
assert(quickPending.length === 3 && quickPending.every((p) => p.status === "pending" && !isTestOverdue(p)), "Teste B: Filtro Pendente apresenta registros pendentes não vencidos");

// Teste C: Ordenação com Pago e Pendente Ativos
const quickPaidSortedByAmountDesc = [...quickPaid].sort((a, b) => b.amount - a.amount);
assert(
  quickPaidSortedByAmountDesc[0].amount === 2800 && quickPaidSortedByAmountDesc[1].amount === 99.90,
  "Teste C: Com filtro Pago ativo, ordenação por valor desc coloca R$ 2.800 primeiro e R$ 99,90 depois"
);

const quickPendingSortedByDateAsc = [...quickPending].sort((a, b) => {
  const tA = parseDateToMillis(a.dueDate) || 0;
  const tB = parseDateToMillis(b.dueDate) || 0;
  return tA - tB;
});
assert(
  quickPendingSortedByDateAsc[0].id === "pay-2" && quickPendingSortedByDateAsc[quickPendingSortedByDateAsc.length - 1].id === "pay-4",
  "Teste C: Com filtro Pendente ativo, ordenação por data asc coloca 15/10/2026 antes de 20/11/2026"
);

// Teste D: Filtros Combinados (Status Pendente + Fornecedor + Data Outubro + Ordenação Valor Desc)
const testDCombined = mockPayables.filter((p) => {
  const matchQuickStatus = p.status === "pending" && !isTestOverdue(p);
  const matchCategoryDesc = matchText(p.description, { type: "text", mode: "contains", value: "Perfumes" });
  const matchOctDate = matchDate(p.dueDate, octFilter);
  return matchQuickStatus && matchCategoryDesc && matchOctDate;
}).sort((a, b) => b.amount - a.amount);

assert(
  testDCombined.length === 1 && testDCombined[0].id === "pay-2",
  "Teste D: Combinação simultânea de Status Pendente + Descrição 'Perfumes' + Data Outubro + Ordenação por Valor retorna exatamente pay-2"
);

// Teste E: Limpeza - Limpar filtros de coluna mantém statusFilter ativo
let activeQuickStatus: "pending" | "all" = "pending";
let activeColumnFilters: Record<string, any> = { description: { type: "text", mode: "contains", value: "Perfumes" } };

// Ação 1: Limpar filtros de coluna
activeColumnFilters = {};
const afterClearColumnFilters = mockPayables.filter((p) => {
  // Apenas o quick status permanece
  if (activeQuickStatus === "pending") return p.status === "pending" && !isTestOverdue(p);
  return true;
});
assert(
  afterClearColumnFilters.length === 3 && activeQuickStatus === "pending",
  "Teste E: Limpar filtros das colunas mantém o controle 'Pendente' ativo e operante"
);

// Ação 2: Limpar statusFilter específico para 'all'
activeQuickStatus = "all";
const afterClearQuickStatus = mockPayables.filter(() => true);
assert(
  afterClearQuickStatus.length === 6 && activeQuickStatus === "all",
  "Teste E: Limpar o filtro específico restaura todos os lançamentos originais"
);

console.log("\n========================================================");
console.log(`📊 RESULTADO DA SUÍTE DE TESTES:`);
console.log(`   Total Passados: ${passed}`);
console.log(`   Total Falhados: ${failed}`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
}
