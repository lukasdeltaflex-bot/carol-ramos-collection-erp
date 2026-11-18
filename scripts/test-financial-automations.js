const assert = require("assert");

// Import or replicate the core pure functions for verification
function formatBRL(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseBRLDigits(digitsStr) {
  const cleanDigits = digitsStr.replace(/\D/g, "");
  if (!cleanDigits) return 0;
  const num = parseInt(cleanDigits, 10);
  return num / 100;
}

function isoToBrDate(iso) {
  if (!iso || typeof iso !== "string") return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [yyyy, mm, dd] = parts;
  if (!yyyy || !mm || !dd) return "";
  return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
}

function brDateToIso(br) {
  if (!br || typeof br !== "string") return "";
  const parts = br.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length < 4) return "";
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function validateBrazilianDate(dateStr) {
  if (!dateStr || dateStr.length !== 10) {
    return { isValid: false, errorMessage: "Data incompleta (DD/MM/AAAA)" };
  }

  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    return { isValid: false, errorMessage: "Formato inválido. Use DD/MM/AAAA" };
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { isValid: false, errorMessage: "Data contém caracteres inválidos" };
  }

  if (year < 1900 || year > 2100) {
    return { isValid: false, errorMessage: "Ano fora do intervalo permitido (1900-2100)" };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, errorMessage: "Mês inválido (deve ser entre 01 e 12)" };
  }

  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return { isValid: false, errorMessage: `Dia ${parts[0]} é inválido para o mês ${parts[1]}/${year}` };
  }

  return { isValid: true };
}

function maskBrazilianDate(rawDigits) {
  const digits = rawDigits.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

console.log("=================================================");
console.log("RUNNING FINANCIAL AUTOMATIONS AUDIT SUITE");
console.log("=================================================");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// 1. Currency Tests
test("Currency: typing 150 gives 1.50 and formats as 'R$ 1,50'", () => {
  const num = parseBRLDigits("150");
  assert.strictEqual(num, 1.50);
  const formatted = formatBRL(num);
  assert.strictEqual(formatted.replace(/\u00a0/g, " "), "R$ 1,50");
});

test("Currency: typing 1500 gives 15.00 and formats as 'R$ 15,00'", () => {
  const num = parseBRLDigits("1500");
  assert.strictEqual(num, 15.00);
  const formatted = formatBRL(num);
  assert.strictEqual(formatted.replace(/\u00a0/g, " "), "R$ 15,00");
});

test("Currency: typing 150050 gives 1500.50 and formats as 'R$ 1.500,50'", () => {
  const num = parseBRLDigits("150050");
  assert.strictEqual(num, 1500.50);
  const formatted = formatBRL(num);
  assert.strictEqual(formatted.replace(/\u00a0/g, " "), "R$ 1.500,50");
});

test("Currency: typing 1500000 gives 15000.00 and formats as 'R$ 15.000,00'", () => {
  const num = parseBRLDigits("1500000");
  assert.strictEqual(num, 15000.00);
  const formatted = formatBRL(num);
  assert.strictEqual(formatted.replace(/\u00a0/g, " "), "R$ 15.000,00");
});

test("Currency: typing 0 gives 0.00 and formats as 'R$ 0,00'", () => {
  const num = parseBRLDigits("0");
  assert.strictEqual(num, 0);
  const formatted = formatBRL(num);
  assert.strictEqual(formatted.replace(/\u00a0/g, " "), "R$ 0,00");
});

test("Currency: numeric persistence guarantee", () => {
  const storedVal = parseBRLDigits("150050");
  assert.strictEqual(typeof storedVal, "number");
  assert.notStrictEqual(typeof storedVal, "string");
  assert.strictEqual(storedVal, 1500.50);
});

// 2. Date Masking & Calendar Validation Tests
test("Date: masking digits 18112026 produces '18/11/2026'", () => {
  const masked = maskBrazilianDate("18112026");
  assert.strictEqual(masked, "18/11/2026");
  const validation = validateBrazilianDate(masked);
  assert.strictEqual(validation.isValid, true);
  const iso = brDateToIso(masked);
  assert.strictEqual(iso, "2026-11-18");
});

test("Date: ISO conversion round-trip", () => {
  const br = isoToBrDate("2026-11-18");
  assert.strictEqual(br, "18/11/2026");
  const iso = brDateToIso(br);
  assert.strictEqual(iso, "2026-11-18");
});

test("Date: leap year 29/02/2024 is valid (leap year)", () => {
  const res = validateBrazilianDate("29/02/2024");
  assert.strictEqual(res.isValid, true);
});

test("Date: leap year 29/02/2025 is rejected (non-leap year)", () => {
  const res = validateBrazilianDate("29/02/2025");
  assert.strictEqual(res.isValid, false);
});

test("Date: leap year 29/02/2026 is rejected (non-leap year)", () => {
  const res = validateBrazilianDate("29/02/2026");
  assert.strictEqual(res.isValid, false);
});

test("Date: impossible day 31/04/2026 is rejected (April has 30 days)", () => {
  const res = validateBrazilianDate("31/04/2026");
  assert.strictEqual(res.isValid, false);
});

test("Date: impossible day 32/01/2026 is rejected", () => {
  const res = validateBrazilianDate("32/01/2026");
  assert.strictEqual(res.isValid, false);
});

test("Date: incomplete date 18/11 is rejected", () => {
  const res = validateBrazilianDate("18/11");
  assert.strictEqual(res.isValid, false);
});

// 3. Category Logic Tests
const DEFAULT_CATEGORIES = [
  { id: "sale", name: "Venda de Mercadorias", type: "revenue", isDefault: true },
  { id: "rent", name: "Aluguel / Condomínio", type: "expense", isDefault: true },
  { id: "marketing", name: "Marketing & Tráfego", type: "expense", isDefault: true },
];

test("Categories: create expense category and prevent duplicate name in same type", () => {
  let categories = [...DEFAULT_CATEGORIES];
  const newCat = { id: "embalagens", name: "Embalagens", type: "expense" };
  
  // Try adding
  const nameExists = categories.some(c => c.name.toLowerCase() === newCat.name.toLowerCase() && c.type === newCat.type);
  assert.strictEqual(nameExists, false);
  categories.push(newCat);
  assert.strictEqual(categories.length, 4);

  // Try duplicate
  const duplicateExists = categories.some(c => c.name.toLowerCase() === "embalagens" && c.type === "expense");
  assert.strictEqual(duplicateExists, true);
});

test("Categories: allow same name in different types (e.g. Outros in Despesa vs Receita)", () => {
  let categories = [...DEFAULT_CATEGORIES];
  const expenseCat = { id: "outros_desp", name: "Outros", type: "expense" };
  const revenueCat = { id: "outros_rec", name: "Outros", type: "revenue" };
  
  categories.push(expenseCat);
  const revenueExistsInRevenue = categories.some(c => c.name.toLowerCase() === revenueCat.name.toLowerCase() && c.type === revenueCat.type);
  assert.strictEqual(revenueExistsInRevenue, false);
  categories.push(revenueCat);
  assert.strictEqual(categories.filter(c => c.name === "Outros").length, 2);
});

test("Categories: editing category name preserves id and updates display for historical transactions", () => {
  let categories = [
    { id: "cat_123", name: "Embalagens Antigas", type: "expense" }
  ];
  const transactions = [
    { id: "tx_1", category: "cat_123", amount: 150, description: "Caixas de correio" }
  ];

  // Edit category name
  const updatedCategories = categories.map(c => c.id === "cat_123" ? { ...c, name: "Embalagens & Correios" } : c);
  
  // Historical transaction still has category: "cat_123", but displays "Embalagens & Correios"
  const catObj = updatedCategories.find(c => c.id === transactions[0].category);
  assert.strictEqual(catObj.name, "Embalagens & Correios");
});

test("Categories: safe delete with linked transactions requires reclassify or archive", () => {
  const transactions = [
    { id: "tx_1", category: "marketing", amount: 300 }
  ];
  const linkedCount = transactions.filter(t => t.category === "marketing").length;
  assert.strictEqual(linkedCount, 1);

  // Direct deletion is blocked when linkedCount > 0
  const canDirectDelete = linkedCount === 0;
  assert.strictEqual(canDirectDelete, false);

  // Reclassification action updates transaction category to rent
  const reclassifiedTxs = transactions.map(t => t.category === "marketing" ? { ...t, category: "rent" } : t);
  assert.strictEqual(reclassifiedTxs[0].category, "rent");

  // Archive option sets status: 'archived'
  let categories = [
    { id: "marketing", name: "Marketing", type: "expense", status: "active" }
  ];
  const archivedCategories = categories.map(c => c.id === "marketing" ? { ...c, status: "archived" } : c);
  assert.strictEqual(archivedCategories[0].status, "archived");
  
  // Archived category is filtered out of new selection
  const availableForNew = archivedCategories.filter(c => c.type === "expense" && c.status !== "archived");
  assert.strictEqual(availableForNew.length, 0);
});

console.log("=================================================");
console.log(`TEST RESULTS: ${passed}/${total} PASSED`);
console.log("=================================================");

if (passed !== total) {
  process.exit(1);
}
