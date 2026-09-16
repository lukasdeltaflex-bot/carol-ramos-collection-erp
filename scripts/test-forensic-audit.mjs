import fs from "fs";
import path from "path";

let passedCount = 0;
let failedCount = 0;

function assert(description, condition, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${description} - ${details}`);
  }
}

console.log("\n========================================================");
console.log("🔍 AUDITORIA FORENSE: VERIFICAÇÃO AUTOMATIZADA");
console.log("========================================================\n");

// 1. Verificar remoção de auto-seeders
console.log("▶️ 1. Verificação de Auto-Seeders e Mocks");
const productsCode = fs.readFileSync("src/app/(dashboard)/products/page.tsx", "utf8");
assert("products/page.tsx não contém INITIAL_CATEGORIES", !productsCode.includes("INITIAL_CATEGORIES"));
assert("products/page.tsx não contém INITIAL_PRODUCTS", !productsCode.includes("INITIAL_PRODUCTS"));
assert("products/page.tsx não contém seeded_products_v2", !productsCode.includes("seeded_products_v2"));

const contactsCode = fs.readFileSync("src/app/(dashboard)/contacts/page.tsx", "utf8");
assert("contacts/page.tsx não contém INITIAL_CUSTOMERS", !contactsCode.includes("INITIAL_CUSTOMERS"));
assert("contacts/page.tsx não contém seeded_customers_v1", !contactsCode.includes("seeded_customers_v1"));

const financeCode = fs.readFileSync("src/app/(dashboard)/finance/page.tsx", "utf8");
assert("finance/page.tsx não contém INITIAL_BANK_ACCOUNTS", !financeCode.includes("INITIAL_BANK_ACCOUNTS"));
assert("finance/page.tsx não contém INITIAL_TRANSACTIONS", !financeCode.includes("INITIAL_TRANSACTIONS"));
assert("finance/page.tsx não contém seeded_financial_v1", !financeCode.includes("seeded_financial_v1"));

const remindersCode = fs.readFileSync("src/app/(dashboard)/reminders/page.tsx", "utf8");
assert("reminders/page.tsx não contém INITIAL_REMINDERS", !remindersCode.includes("INITIAL_REMINDERS"));

const settingsCode = fs.readFileSync("src/app/(dashboard)/settings/page.tsx", "utf8");
assert("settings/page.tsx não contém INITIAL_AUTOMATIONS", !settingsCode.includes("INITIAL_AUTOMATIONS"));
assert("settings/page.tsx não contém shopeeSeed", !settingsCode.includes("shopeeSeed"));
assert("settings/page.tsx não contém handleSimulateWebhook", !settingsCode.includes("handleSimulateWebhook"));
assert("settings/page.tsx não contém Simulador de Webhook", !settingsCode.includes("Simulador de Webhook"));

// 2. Verificar simulações de conexão
console.log("\n▶️ 2. Verificação de Simulações e Fake Delays");
const accountsTabCode = fs.readFileSync("src/app/(dashboard)/marketplaces/components/AccountsTab.tsx", "utf8");
assert("AccountsTab.tsx não contém fake setTimeout com 145ms", !accountsTabCode.includes("145ms"));

const setupWizardCode = fs.readFileSync("src/app/(dashboard)/marketplaces/components/SetupWizardModal.tsx", "utf8");
assert("SetupWizardModal.tsx não contém fake setTimeout(1800)", !setupWizardCode.includes("1800"));
assert("SetupWizardModal.tsx importa listAccountsAction", setupWizardCode.includes("listAccountsAction"));

// 3. Verificar OAuth da Shopee
console.log("\n▶️ 3. Verificação de OAuth Shopee e Mercado Livre");
const shopeeProviderCode = fs.readFileSync("src/features/integrations/providers/ShopeeProvider.ts", "utf8");
assert("ShopeeProvider.ts não contém shopId hardcoded (123456789)", !shopeeProviderCode.includes("123456789"));

const shopeeAuthRouteCode = fs.readFileSync("src/app/api/marketplaces/shopee/auth/route.ts", "utf8");
assert("Shopee auth route extrai shop_id dos searchParams", shopeeAuthRouteCode.includes('searchParams.get("shop_id")'));

// 4. Verificar remoção de secrets hardcoded
console.log("\n▶️ 4. Verificação de Segurança e Secrets");
const shopeeWebhookCode = fs.readFileSync("src/app/api/webhooks/shopee/route.ts", "utf8");
assert("Shopee webhook não contém fallback 'shopee_partner_key_secret_2026'", !shopeeWebhookCode.includes("shopee_partner_key_secret_2026"));

// 5. Verificar arquivos órfãos deletados
console.log("\n▶️ 5. Verificação de Arquivos Órfãos Deletados");
assert("DiagnosticTab.tsx foi removido", !fs.existsSync("src/app/(dashboard)/marketplaces/components/DiagnosticTab.tsx"));
assert("EditorTab.tsx foi removido", !fs.existsSync("src/app/(dashboard)/marketplaces/components/EditorTab.tsx"));
assert("AiTab.tsx foi removido", !fs.existsSync("src/app/(dashboard)/marketplaces/components/AiTab.tsx"));

// 6. Verificar Firestore Rules
console.log("\n▶️ 6. Verificação de Regras do Firestore");
const firestoreRules = fs.readFileSync("firestore.rules", "utf8");
assert("firestore.rules protege /sales/", firestoreRules.includes("match /sales/"));
assert("firestore.rules protege /customers/", firestoreRules.includes("match /customers/"));
assert("firestore.rules protege /accounts_payable/", firestoreRules.includes("match /accounts_payable/"));
assert("firestore.rules protege /accounts_receivable/", firestoreRules.includes("match /accounts_receivable/"));
assert("firestore.rules protege /financial_transactions/", firestoreRules.includes("match /financial_transactions/"));
assert("firestore.rules protege /reminders/", firestoreRules.includes("match /reminders/"));
assert("firestore.rules protege /integration_configs/", firestoreRules.includes("match /integration_configs/"));

console.log("\n========================================================");
console.log(`📊 RESULTADO DA AUDITORIA FORENSE:`);
console.log(`   Total Executados: ${passedCount + failedCount}`);
console.log(`   Aprovados:        ${passedCount}`);
console.log(`   Falhas:           ${failedCount}`);
console.log("========================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
