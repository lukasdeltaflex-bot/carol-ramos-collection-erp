import {
  checkItemExpiration,
  executeAutoPurge,
  RecycleBinDbInterface
} from '../src/features/recycle-bin/services/recycleBinService';
import { RecycleBinItem } from '../src/features/recycle-bin/types';

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

async function runTests() {
  console.log("\n========================================================");
  console.log("🧪 SUÍTE DE TESTES: EXCLUSÃO AUTOMÁTICA DA LIXEIRA");
  console.log("========================================================\n");

  // Data de referência para os testes temporais: 2026-10-05T12:00:00.000Z
  const REF_NOW = new Date("2026-10-05T12:00:00.000Z");

  // ========================================================
  // CASO 1: Item com 29 dias (NÃO deve ser excluído com 30 dias de retenção)
  // ========================================================
  console.log("--- Teste 1: Item com 29 dias e regra de 30 dias ---");
  const date29DaysAgo = new Date(REF_NOW.getTime() - 29 * 24 * 60 * 60 * 1000);
  const item29Days: RecycleBinItem = {
    id: "item-29d",
    tenantId: "carol-ramos-collection",
    itemName: "Item 29 dias",
    originalCollection: "products",
    originalId: "prod-29d",
    deletedAt: date29DaysAgo.toISOString()
  } as any;

  const check29d = checkItemExpiration(item29Days, 30, REF_NOW);
  assert("Item com 29 dias NÃO deve ser elegível para exclusão", check29d.eligible === false);
  assert("Motivo deve ser within_retention_period", check29d.reason === "within_retention_period");

  // ========================================================
  // CASO 2: Item com 30 dias exatos (DEVE ser excluído com 30 dias de retenção)
  // ========================================================
  console.log("\n--- Teste 2: Item com 30 dias e regra de 30 dias ---");
  const date30DaysAgo = new Date(REF_NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
  const item30Days: RecycleBinItem = {
    id: "item-30d",
    tenantId: "carol-ramos-collection",
    itemName: "Item 30 dias",
    originalCollection: "products",
    originalId: "prod-30d",
    deletedAt: date30DaysAgo.toISOString()
  } as any;

  const check30d = checkItemExpiration(item30Days, 30, REF_NOW);
  assert("Item com 30 dias exatos DEVE ser elegível para exclusão", check30d.eligible === true);
  assert("Motivo deve ser expired", check30d.reason === "expired");

  // ========================================================
  // CASO 3: Item com 31 dias (DEVE ser excluído com 30 dias de retenção)
  // ========================================================
  console.log("\n--- Teste 3: Item com 31 dias e regra de 30 dias ---");
  const date31DaysAgo = new Date(REF_NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
  const item31Days: RecycleBinItem = {
    id: "item-31d",
    tenantId: "carol-ramos-collection",
    itemName: "Item 31 dias",
    originalCollection: "products",
    originalId: "prod-31d",
    deletedAt: date31DaysAgo.toISOString()
  } as any;

  const check31d = checkItemExpiration(item31Days, 30, REF_NOW);
  assert("Item com 31 dias DEVE ser elegível para exclusão", check31d.eligible === true);
  assert("Motivo deve ser expired", check31d.reason === "expired");

  // ========================================================
  // CASO 4: Item com 60 dias e regra de 30 dias (DEVE ser excluído)
  // ========================================================
  console.log("\n--- Teste 4: Item com 60 dias e regra de 30 dias ---");
  const date60DaysAgo = new Date(REF_NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
  const item60Days: RecycleBinItem = {
    id: "item-60d",
    tenantId: "carol-ramos-collection",
    itemName: "Item 60 dias",
    originalCollection: "sales",
    originalId: "sale-60d",
    deletedAt: date60DaysAgo.toISOString()
  } as any;

  const check60d = checkItemExpiration(item60Days, 30, REF_NOW);
  assert("Item com 60 dias DEVE ser elegível para exclusão em regra de 30 dias", check60d.eligible === true);
  assert("Motivo deve ser expired", check60d.reason === "expired");

  // ========================================================
  // CASO 5: Item com 29 dias e regra configurada para 60 dias (NÃO deve ser excluído)
  // ========================================================
  console.log("\n--- Teste 5: Item com 29 dias e regra configurada para 60 dias ---");
  const check29dRule60 = checkItemExpiration(item29Days, 60, REF_NOW);
  assert("Item com 29 dias NÃO deve ser elegível com regra de 60 dias", check29dRule60.eligible === false);
  assert("Motivo deve ser within_retention_period", check29dRule60.reason === "within_retention_period");

  // ========================================================
  // CASO 6: Item com data inválida (NÃO deve ser excluído - segurança contra corrupção)
  // ========================================================
  console.log("\n--- Teste 6: Item com data inválida ---");
  const itemInvalidDate: RecycleBinItem = {
    id: "item-inv",
    tenantId: "carol-ramos-collection",
    itemName: "Item Data Inválida",
    originalCollection: "products",
    originalId: "prod-inv",
    deletedAt: "data_invalida_corrompida"
  } as any;

  const checkInvalid = checkItemExpiration(itemInvalidDate, 30, REF_NOW);
  assert("Item com data inválida NÃO deve ser excluído", checkInvalid.eligible === false);
  assert("Motivo deve ser invalid_date", checkInvalid.reason === "invalid_date");

  // ========================================================
  // CASO 7: Item sem data / undefined / null (NÃO deve ser excluído)
  // ========================================================
  console.log("\n--- Teste 7: Item sem data ---");
  const itemNoDate: RecycleBinItem = {
    id: "item-nodate",
    tenantId: "carol-ramos-collection",
    itemName: "Item Sem Data",
    originalCollection: "products",
    originalId: "prod-nodate"
  } as any;

  const checkNoDate = checkItemExpiration(itemNoDate, 30, REF_NOW);
  assert("Item sem data NÃO deve ser excluído", checkNoDate.eligible === false);
  assert("Motivo deve ser invalid_date", checkNoDate.reason === "invalid_date");

  // ========================================================
  // CASO 8: Regra de retenção desativada (0 dias / 'Nunca')
  // ========================================================
  console.log("\n--- Teste 8: Regra de retenção desativada (autoPurgeDays = 0) ---");
  const checkDisabled = checkItemExpiration(item60Days, 0, REF_NOW);
  assert("Item antigo NÃO deve ser excluído se retenção automática estiver desativada (0)", checkDisabled.eligible === false);
  assert("Motivo deve ser auto_purge_disabled", checkDisabled.reason === "auto_purge_disabled");

  // ========================================================
  // CASO 9: Isolamento multi-tenant (itens de outro tenant não devem ser processados)
  // ========================================================
  console.log("\n--- Teste 9: Isolamento de Tenant na execução ---");
  const deletedDocCalls: Array<{ recycleBinId: string; originalCollection: string; originalId: string }> = [];

  const mockDb: RecycleBinDbInterface = {
    permanentlyDeleteDoc: async (recycleBinId: string, originalCollection: string, originalId: string) => {
      deletedDocCalls.push({ recycleBinId, originalCollection, originalId });
    }
  };

  const foreignItem: RecycleBinItem = {
    id: "item-foreign",
    tenantId: "outro-inquilino-hacker",
    itemName: "Item Inquilino Estranho",
    originalCollection: "products",
    originalId: "prod-foreign",
    deletedAt: date60DaysAgo.toISOString()
  } as any;

  const resultForeign = await executeAutoPurge({
    tenantId: "carol-ramos-collection",
    items: [foreignItem],
    settings: {
      tenantId: "carol-ramos-collection",
      autoPurgeDays: 30,
      allowUserRestoration: true,
      restrictPermanentDeletionToAdmin: true
    },
    db: mockDb,
    currentDate: REF_NOW
  });

  assert("Itens de outro tenant devem ser ignorados da avaliação do tenant", resultForeign.totalEvaluated === 0);
  assert("Nenhum item estrangeiro foi excluído", resultForeign.deletedCount === 0);
  assert("Mock db permanentlyDeleteDoc não foi chamado para item de outro tenant", !deletedDocCalls.some(c => c.recycleBinId === "item-foreign"));

  // ========================================================
  // CASO 10: Item já restaurado (deleted === false) NÃO deve ser excluído
  // ========================================================
  console.log("\n--- Teste 10: Item já restaurado ---");
  const restoredItem: RecycleBinItem = {
    id: "item-restored",
    tenantId: "carol-ramos-collection",
    itemName: "Item Restaurado",
    originalCollection: "products",
    originalId: "prod-restored",
    deleted: false,
    deletedAt: date60DaysAgo.toISOString()
  } as any;

  const resultRestored = await executeAutoPurge({
    tenantId: "carol-ramos-collection",
    items: [restoredItem],
    settings: {
      tenantId: "carol-ramos-collection",
      autoPurgeDays: 30,
      allowUserRestoration: true,
      restrictPermanentDeletionToAdmin: true
    },
    db: mockDb,
    currentDate: REF_NOW
  });

  assert("Item restaurado deve ser ignorado", resultRestored.skippedCount === 1);
  assert("Item restaurado não foi excluído", resultRestored.deletedCount === 0);
  assert("Motivo registrado deve ser already_restored", resultRestored.details[0]?.reason === "already_restored");

  // ========================================================
  // CASO 11: Suporte a Firestore Timestamp { seconds, nanoseconds }
  // ========================================================
  console.log("\n--- Teste 11: Suporte a Firestore Timestamp ---");
  const date45DaysAgo = new Date(REF_NOW.getTime() - 45 * 24 * 60 * 60 * 1000);
  const firestoreTimestamp = {
    seconds: Math.floor(date45DaysAgo.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date45DaysAgo
  };

  const itemWithTimestamp: RecycleBinItem = {
    id: "item-ts",
    tenantId: "carol-ramos-collection",
    itemName: "Item com Firestore Timestamp",
    originalCollection: "orders",
    originalId: "ord-ts",
    deletedAt: firestoreTimestamp as any
  } as any;

  const checkTimestamp = checkItemExpiration(itemWithTimestamp, 30, REF_NOW);
  assert("Item com Firestore Timestamp { seconds } deve ser reconhecido", checkTimestamp.trashDate !== null);
  assert("Item com Firestore Timestamp de 45 dias atrás DEVE ser elegível", checkTimestamp.eligible === true);

  // ========================================================
  // CASO 12: Suporte a formato de data brasileira '28/07/2026'
  // ========================================================
  console.log("\n--- Teste 12: Suporte a formato brasileiro DD/MM/YYYY ---");
  const itemBrazilianDate: RecycleBinItem = {
    id: "item-br-date",
    tenantId: "carol-ramos-collection",
    itemName: "Item com Formato BR",
    originalCollection: "customers",
    originalId: "cust-br",
    deletedAt: "28/07/2026" as any
  } as any;

  const checkBrDate = checkItemExpiration(itemBrazilianDate, 30, REF_NOW);
  assert("Item com data em formato DD/MM/YYYY '28/07/2026' deve ser normalizado com sucesso", checkBrDate.trashDate !== null);
  assert("Ano normalizado deve ser 2026", checkBrDate.trashDate?.getUTCFullYear() === 2026);
  assert("Mês normalizado deve ser Julho (índice 6)", checkBrDate.trashDate?.getUTCMonth() === 6);
  assert("Dia normalizado deve ser 28", checkBrDate.trashDate?.getUTCDate() === 28);

  // ========================================================
  // CASO 13: CASO DE TESTE REAL DO PROMPT:
  // Item na lixeira com data de 28/07/2026
  // Data de avaliação: 05/10/2026
  // Retenção: 30 dias
  // Tempo decorrido: ~69 dias (> 30 dias)
  // RESULTADO ESPERADO: ELEGÍVEL PARA EXCLUSÃO AUTOMÁTICA
  // ========================================================
  console.log("\n--- Teste 13: CASO REAL OBRIGATÓRIO (28/07/2026 vs 05/10/2026) ---");
  const realTrashDate = new Date("2026-07-28T14:30:00.000Z");
  const realEvaluationDate = new Date("2026-10-05T12:00:00.000Z");

  const realItem: RecycleBinItem = {
    id: "real-trash-item-28-07-2026",
    tenantId: "carol-ramos-collection",
    itemName: "Registro Excluído em 28/07/2026",
    originalCollection: "products",
    originalId: "real-prod-001",
    deletedAt: realTrashDate.toISOString()
  } as any;

  const realCheck = checkItemExpiration(realItem, 30, realEvaluationDate);
  assert("Caso Real: Item de 28/07/2026 avaliado em 05/10/2026 DEVE ser elegível para exclusão", realCheck.eligible === true);
  assert("Caso Real: Motivo deve ser 'expired'", realCheck.reason === "expired");

  // Verificação matemática exata dos dias decorridos
  const diffMs = realEvaluationDate.getTime() - realTrashDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  assert(`Caso Real: Dias decorridos (${diffDays} dias) devem ser maiores que o prazo de retenção (30 dias)`, diffDays > 30);

  // Execução completa com exclusão no mock DB
  const mockRealDbCalls: Array<{ recycleBinId: string; originalCollection: string; originalId: string }> = [];
  const mockRealDb: RecycleBinDbInterface = {
    permanentlyDeleteDoc: async (recycleBinId: string, originalCollection: string, originalId: string) => {
      mockRealDbCalls.push({ recycleBinId, originalCollection, originalId });
    }
  };

  const purgeResult = await executeAutoPurge({
    tenantId: "carol-ramos-collection",
    items: [realItem],
    settings: {
      tenantId: "carol-ramos-collection",
      autoPurgeDays: 30,
      allowUserRestoration: true,
      restrictPermanentDeletionToAdmin: true
    },
    db: mockRealDb,
    currentDate: realEvaluationDate
  });

  assert("Caso Real: deletedCount deve ser exatamente 1", purgeResult.deletedCount === 1);
  assert("Caso Real: deletedIds deve conter o ID do item real", purgeResult.deletedIds.includes("real-trash-item-28-07-2026"));
  assert("Caso Real: permanentlyDeleteDoc deve ter sido chamado para o item da lixeira", mockRealDbCalls.some(c => c.recycleBinId === "real-trash-item-28-07-2026"));
  assert("Caso Real: permanentlyDeleteDoc recebeu a originalCollection correta", mockRealDbCalls[0]?.originalCollection === "products");
  assert("Caso Real: permanentlyDeleteDoc recebeu o originalId correto", mockRealDbCalls[0]?.originalId === "real-prod-001");

  console.log("\n========================================================");
  console.log(`📊 RESULTADO FINAL DA SUÍTE DE TESTES DA LIXEIRA:`);
  console.log(`   Total Passados: ${passedCount}`);
  console.log(`   Total Falhados: ${failedCount}`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Erro fatal ao rodar testes:", err);
  process.exit(1);
});
