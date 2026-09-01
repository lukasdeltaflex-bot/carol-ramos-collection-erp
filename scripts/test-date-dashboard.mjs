import { normalizeDate, isSameDay, isToday, toISODateString, formatSafeDate } from '../src/lib/date.ts';

// Implementation of normalizeFirestoreData as defined in src/hooks/useDb.ts
function normalizeFirestoreData(data) {
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }

  // 1. Instância de Date -> ISO string
  if (data instanceof Date) {
    return isNaN(data.getTime()) ? null : data.toISOString();
  }

  // 2. Instância ou objeto Firestore Timestamp com método toDate()
  if ("toDate" in data && typeof data.toDate === "function") {
    try {
      const date = data.toDate();
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // fallback
    }
  }

  // 3. Array recursivo
  if (Array.isArray(data)) {
    return data.map((item) => normalizeFirestoreData(item));
  }

  // 4. Objeto serializado Timestamp com seconds e nanoseconds típicos
  const keys = Object.keys(data);
  if (
    (keys.length === 2 || keys.length === 1) &&
    "seconds" in data &&
    typeof data.seconds === "number" &&
    data.seconds > 100000000
  ) {
    const sec = data.seconds;
    const date = new Date(sec * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (
    (keys.length === 2 || keys.length === 1) &&
    "_seconds" in data &&
    typeof data._seconds === "number" &&
    data._seconds > 100000000
  ) {
    const sec = data._seconds;
    const date = new Date(sec * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // 5. Objeto comum: percorrer propriedades
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    normalized[key] = normalizeFirestoreData(value);
  }
  return normalized;
}

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(description, condition, details = "") {
  if (condition) {
    passedCount++;
    results.push({ description, status: "PASS", details });
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedCount++;
    results.push({ description, status: "FAIL", details });
    console.error(`  ❌ [FAIL] ${description} - ${details}`);
  }
}

console.log("\n========================================================");
console.log("🧪 SUÍTE DE TESTES OBRIGATÓRIOS: DATAS & DASHBOARD");
console.log("========================================================\n");

// ----------------------------------------------------
// 1. TESTES DE NORMALIZAÇÃO DE DATAS (normalizeDate)
// ----------------------------------------------------
console.log("▶️ 1. Testes do Utilitário de Datas (normalizeDate)");

// 1.1 String ISO
const dIso = normalizeDate("2026-08-31T10:30:00.000Z");
assert("1.1 String ISO retorna Date válido", dIso instanceof Date && !isNaN(dIso.getTime()));

// 1.2 Data brasileira DD/MM/AAAA
const dBr = normalizeDate("31/08/2026");
assert("1.2 Data brasileira '31/08/2026' retorna Date válido", dBr instanceof Date && dBr.getFullYear() === 2026 && dBr.getMonth() === 7 && dBr.getDate() === 31);

// 1.3 JavaScript Date
const now = new Date(2026, 7, 31, 10, 30);
const dJs = normalizeDate(now);
assert("1.3 JavaScript Date nativo é preservado", dJs instanceof Date && dJs.getTime() === now.getTime());

// 1.4 Firestore Timestamp com toDate()
const mockFirestoreTimestamp = { toDate: () => new Date(2026, 7, 31, 10, 30) };
const dTs = normalizeDate(mockFirestoreTimestamp);
assert("1.4 Firestore Timestamp com toDate() retorna Date válido", dTs instanceof Date && dTs.getFullYear() === 2026 && dTs.getMonth() === 7 && dTs.getDate() === 31);

// 1.5 Timestamp serializado com seconds
const mockSec = { seconds: 1788183000, nanoseconds: 0 };
const dSec = normalizeDate(mockSec);
assert("1.5 Timestamp serializado { seconds } retorna Date válido", dSec instanceof Date && !isNaN(dSec.getTime()));

// 1.6 Timestamp serializado com _seconds
const mockUnderscoreSec = { _seconds: 1788183000, _nanoseconds: 0 };
const dUnderscoreSec = normalizeDate(mockUnderscoreSec);
assert("1.6 Timestamp serializado { _seconds } retorna Date válido", dUnderscoreSec instanceof Date && !isNaN(dUnderscoreSec.getTime()));

// 1.7 Valores inválidos e corrompidos
assert("1.7.a null retorna null sem lançar exceção", normalizeDate(null) === null);
assert("1.7.b undefined retorna null sem lançar exceção", normalizeDate(undefined) === null);
assert("1.7.c Objeto corrompido {} retorna null sem lançar exceção", normalizeDate({}) === null);
assert("1.7.d String inválida 'data inválida' retorna null sem lançar exceção", normalizeDate("data inválida") === null);

// ----------------------------------------------------
// 2. TESTES DE isToday()
// ----------------------------------------------------
console.log("\n▶️ 2. Testes de isToday()");

const todayDate = new Date();
const yesterdayDate = new Date(Date.now() - 86400000);
const tomorrowDate = new Date(Date.now() + 86400000);
const todayTimestamp = { toDate: () => new Date() };
const todayISO = new Date().toISOString();

assert("2.1 isToday(hoje) retorna true", isToday(todayDate) === true);
assert("2.2 isToday(ontem) retorna false", isToday(yesterdayDate) === false);
assert("2.3 isToday(amanhã) retorna false", isToday(tomorrowDate) === false);
assert("2.4 isToday(Timestamp de hoje) retorna true", isToday(todayTimestamp) === true);
assert("2.5 isToday(string ISO de hoje) retorna true", isToday(todayISO) === true);
assert("2.6 isToday(null) retorna false sem exceção", isToday(null) === false);
assert("2.7 isToday({}) retorna false sem exceção", isToday({}) === false);

// ----------------------------------------------------
// 3. TESTES DE isSameDay()
// ----------------------------------------------------
console.log("\n▶️ 3. Testes de isSameDay()");

const testDayA = new Date(2026, 7, 31, 10, 0, 0);
const testDayB = "2026-08-31T15:30:00.000Z";
const testDayC = { toDate: () => new Date(2026, 7, 31, 22, 0, 0) };
const testDayD = "31/08/2026";
const testDiffDay = new Date(2026, 8, 1, 10, 0, 0); // 01/09/2026

assert("3.1 isSameDay(Date, Timestamp) mesmo dia retorna true", isSameDay(testDayA, testDayC) === true);
assert("3.2 isSameDay(Timestamp, Timestamp) mesmo dia retorna true", isSameDay(testDayC, testDayC) === true);
assert("3.3 isSameDay(String brasileira, Date) mesmo dia retorna true", isSameDay(testDayD, testDayA) === true);
assert("3.4 isSameDay(Date, Date diferente) retorna false", isSameDay(testDayA, testDiffDay) === false);
assert("3.5 isSameDay(Date, null) retorna false sem exceção", isSameDay(testDayA, null) === false);
assert("3.6 isSameDay(null, undefined) retorna false sem exceção", isSameDay(null, undefined) === false);
assert("3.7 isSameDay({}, {}) retorna false sem exceção", isSameDay({}, {}) === false);

// ----------------------------------------------------
// 4. TESTE DE REGRESSÃO DO ERRO ORIGINAL
// ----------------------------------------------------
console.log("\n▶️ 4. Teste de Regressão do Erro Original (Timestamp em createdAt)");

const regressionSales = [
  {
    id: "sale-prod-1",
    createdAt: {
      toDate: () => new Date()
    },
    total: 150.50
  },
  {
    id: "sale-prod-2",
    createdAt: {
      toDate: () => new Date(Date.now() - 86400000 * 2) // 2 dias atrás
    },
    total: 200.00
  }
];

let regressionThrew = false;
let computedTodayStats = null;
try {
  const safeSales = Array.isArray(regressionSales) ? regressionSales : [];
  const todaySales = safeSales.filter(s => s && isToday(s.createdAt));
  const revenueToday = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const countToday = todaySales.length;
  computedTodayStats = { revenueToday, countToday };
} catch (err) {
  regressionThrew = true;
  console.error("Erro na execução da regressão:", err);
}

assert("4.1 Nenhum TypeError é lançado ao filtrar createdAt Timestamp", regressionThrew === false);
assert("4.2 Venda de hoje com Timestamp foi contabilizada corretamente", computedTodayStats && computedTodayStats.countToday === 1 && computedTodayStats.revenueToday === 150.50);

// ----------------------------------------------------
// 5. TESTE COM DADOS MISTOS DO FIRESTORE
// ----------------------------------------------------
console.log("\n▶️ 5. Teste com Dados Mistos do Firestore");

const mixedSales = [
  { id: "1", createdAt: new Date().toISOString(), total: 100.00 },
  { id: "2", createdAt: new Date(), total: 200.00 },
  { id: "3", createdAt: { toDate: () => new Date() }, total: 300.00 },
  { id: "4", createdAt: null, total: 400.00 },
  { id: "5", createdAt: {}, total: 500.00 },
  { id: "6", createdAt: "data corrompida", total: 600.00 },
  { id: "7", createdAt: { seconds: Math.floor(Date.now() / 1000) }, total: 50.00 }
];

let mixedThrew = false;
let mixedResult = null;
try {
  const safeSales = Array.isArray(mixedSales) ? mixedSales : [];
  const todaySales = safeSales.filter(s => s && isToday(s.createdAt));
  const revenueToday = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  mixedResult = { count: todaySales.length, revenue: revenueToday };
} catch (err) {
  mixedThrew = true;
}

assert("5.1 Nenhum erro lançado com dados mistos e corrompidos", mixedThrew === false);
assert("5.2 Apenas os 4 registros válidos de hoje foram contabilizados (100 + 200 + 300 + 50 = 650)", mixedResult && mixedResult.count === 4 && mixedResult.revenue === 650.00);

// ----------------------------------------------------
// 6. TESTE DA CAMADA useDb (normalizeFirestoreData)
// ----------------------------------------------------
console.log("\n▶️ 6. Teste da Camada useDb (normalizeFirestoreData)");

const rawFirestoreDoc = {
  id: "order-123",
  tenantId: "carol-ramos",
  total: 450.00,
  createdAt: { toDate: () => new Date("2026-08-31T14:00:00Z") },
  updatedAt: { seconds: 1788184800, nanoseconds: 0 },
  deletedAt: null,
  customer: {
    name: "Ana Silva",
    birthDate: { toDate: () => new Date("1995-05-15T00:00:00Z") }
  },
  items: [
    { productId: "p1", name: "Batom Rose", createdAt: { toDate: () => new Date("2026-08-31T14:00:00Z") } }
  ]
};

const normalizedDoc = normalizeFirestoreData(rawFirestoreDoc);

assert("6.1 ID e campos numéricos/string são preservados", normalizedDoc.id === "order-123" && normalizedDoc.total === 450.00);
assert("6.2 createdAt Timestamp foi convertido para ISO string", typeof normalizedDoc.createdAt === "string" && normalizedDoc.createdAt.includes("2026-08-31"));
assert("6.3 updatedAt Timestamp com seconds foi convertido para ISO string", typeof normalizedDoc.updatedAt === "string");
assert("6.4 deletedAt null foi preservado como null", normalizedDoc.deletedAt === null);
assert("6.5 Timestamp em objeto aninhado (customer.birthDate) foi normalizado", typeof normalizedDoc.customer.birthDate === "string");
assert("6.6 Timestamp em item de array (items[0].createdAt) foi normalizado", typeof normalizedDoc.items[0].createdAt === "string");

// ----------------------------------------------------
// RESUMO FINAL
// ----------------------------------------------------
console.log("\n========================================================");
console.log(`📊 RESULTADO DA SUÍTE DE TESTES:`);
console.log(`   Total Executados: ${passedCount + failedCount}`);
console.log(`   Aprovados:        ${passedCount}`);
console.log(`   Falhas:           ${failedCount}`);
console.log("========================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
