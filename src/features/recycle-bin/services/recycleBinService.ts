import { RecycleBinItem, RecycleBinSettings } from "../types";
import { normalizeDate, toSafeISOString } from "@/lib/date";

export { toSafeISOString };

export interface ItemExpirationCheckResult {
  eligible: boolean;
  reason: "expired" | "within_retention_period" | "auto_purge_disabled" | "invalid_date";
  trashDate: Date | null;
  expirationDate: Date | null;
}

export const DEFAULT_RECYCLE_BIN_SETTINGS: RecycleBinSettings = {
  tenantId: "carol-ramos-collection",
  autoPurgeDays: 30,
  allowUserRestoration: true,
  restrictPermanentDeletionToAdmin: true
};

/**
 * Avalia de forma pura e determinística se um item da lixeira ultrapassou o período de retenção.
 * 
 * Regra de cálculo:
 * expirationTime = trashDate.getTime() + (autoPurgeDays * 24 * 60 * 60 * 1000)
 * elegível quando: currentDate.getTime() >= expirationTime
 * 
 * Segurança:
 * - Se autoPurgeDays <= 0 (desativado): nunca elegível.
 * - Se a data for ausente ou inválida: nunca elegível.
 */
export function checkItemExpiration(
  item: RecycleBinItem,
  autoPurgeDays: number,
  currentDate: Date = new Date()
): ItemExpirationCheckResult {
  // 1. Exclusão automática desativada (0 ou negativo)
  if (!autoPurgeDays || autoPurgeDays <= 0) {
    const trashDate = normalizeDate(item.deletedAt || (item as any).trashedAt || item.createdAt);
    return {
      eligible: false,
      reason: "auto_purge_disabled",
      trashDate,
      expirationDate: null
    };
  }

  // 2. Data-base correta: momento em que o registro foi movido para a lixeira (deletedAt)
  const trashDate = normalizeDate(
    item.deletedAt || 
    (item as any).trashedAt || 
    (item as any).movedToTrashAt || 
    item.createdAt
  );

  // Se não foi possível determinar ou normalizar a data de exclusão
  if (!trashDate) {
    return {
      eligible: false,
      reason: "invalid_date",
      trashDate: null,
      expirationDate: null
    };
  }

  // 3. Cálculo preciso do prazo com base em milissegundos reais
  const retentionMs = autoPurgeDays * 24 * 60 * 60 * 1000;
  const expirationTime = trashDate.getTime() + retentionMs;
  const expirationDate = new Date(expirationTime);

  const eligible = currentDate.getTime() >= expirationTime;

  return {
    eligible,
    reason: eligible ? "expired" : "within_retention_period",
    trashDate,
    expirationDate
  };
}

export interface RecycleBinDbInterface {
  getDocs?: (collectionName: string, includeDeleted?: boolean) => Promise<any[]>;
  getDocById?: (collectionName: string, id: string) => Promise<any>;
  updateDoc?: (collectionName: string, id: string, data: any) => Promise<any>;
  createDoc?: (collectionName: string, data: any) => Promise<any>;
  permanentlyDeleteDoc?: (recycleBinId: string, originalCollection: string, originalId: string) => Promise<any>;
}

/**
 * Carrega a configuração real de retenção do Firestore para o tenant.
 * Busca em integration_configs (channel: 'recycle_bin') e com fallback para companies/{tenantId}.
 */
export async function getRecycleBinSettings(
  tenantId: string,
  db: RecycleBinDbInterface
): Promise<RecycleBinSettings> {
  const defaultTenant = tenantId || "carol-ramos-collection";

  try {
    // 1. Tentar carregar de integration_configs
    if (db.getDocs) {
      const configs = await db.getDocs("integration_configs");
      const found = (configs || []).find(
        (c: any) => 
          (c.channel === "recycle_bin" || c.type === "recycle_bin") && 
          (c.tenantId === defaultTenant || c.tenantId === "shared")
      );
      if (found && typeof found.autoPurgeDays === "number") {
        return {
          id: found.id,
          tenantId: defaultTenant,
          autoPurgeDays: found.autoPurgeDays,
          allowUserRestoration: found.allowUserRestoration ?? true,
          restrictPermanentDeletionToAdmin: found.restrictPermanentDeletionToAdmin ?? true
        };
      }
    }

    // 2. Tentar carregar do perfil da empresa em companies
    if (db.getDocById) {
      const company = await db.getDocById("companies", defaultTenant);
      if (company?.recycleBinSettings && typeof company.recycleBinSettings.autoPurgeDays === "number") {
        return {
          tenantId: defaultTenant,
          autoPurgeDays: company.recycleBinSettings.autoPurgeDays,
          allowUserRestoration: company.recycleBinSettings.allowUserRestoration ?? true,
          restrictPermanentDeletionToAdmin: company.recycleBinSettings.restrictPermanentDeletionToAdmin ?? true
        };
      }
    }
  } catch (err) {
    console.warn("[TRASH_AUTO_DELETE] Erro ao buscar configurações no Firestore, usando padrão:", err);
  }

  // 3. Fallback para padrão do sistema (30 dias)
  return {
    ...DEFAULT_RECYCLE_BIN_SETTINGS,
    tenantId: defaultTenant
  };
}

/**
 * Salva a configuração de retenção da lixeira no Firestore.
 */
export async function saveRecycleBinSettings(
  tenantId: string,
  settings: Partial<RecycleBinSettings>,
  db: RecycleBinDbInterface
): Promise<RecycleBinSettings> {
  const defaultTenant = tenantId || "carol-ramos-collection";
  const updatedSettings: RecycleBinSettings = {
    tenantId: defaultTenant,
    autoPurgeDays: typeof settings.autoPurgeDays === "number" ? settings.autoPurgeDays : 30,
    allowUserRestoration: settings.allowUserRestoration ?? true,
    restrictPermanentDeletionToAdmin: settings.restrictPermanentDeletionToAdmin ?? true
  };

  try {
    // 1. Salvar em companies/{tenantId}
    if (db.updateDoc) {
      await db.updateDoc("companies", defaultTenant, {
        recycleBinSettings: updatedSettings,
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Salvar ou atualizar em integration_configs
    if (db.getDocs && (db.updateDoc || db.createDoc)) {
      const configs = await db.getDocs("integration_configs");
      const existing = (configs || []).find(
        (c: any) => 
          (c.channel === "recycle_bin" || c.type === "recycle_bin") && 
          (c.tenantId === defaultTenant || c.tenantId === "shared")
      );

      if (existing && db.updateDoc) {
        await db.updateDoc("integration_configs", existing.id, {
          ...updatedSettings,
          channel: "recycle_bin",
          type: "recycle_bin",
          updatedAt: new Date().toISOString()
        });
      } else if (db.createDoc) {
        await db.createDoc("integration_configs", {
          ...updatedSettings,
          channel: "recycle_bin",
          type: "recycle_bin",
          name: "Configurações da Lixeira Inteligente",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("[TRASH_AUTO_DELETE] Erro ao salvar configurações no Firestore:", err);
    throw err;
  }

  return updatedSettings;
}

export interface AutoPurgeResult {
  tenantId: string;
  totalEvaluated: number;
  deletedCount: number;
  skippedCount: number;
  deletedIds: string[];
  details: Array<{
    itemId: string;
    itemName: string;
    action: "delete" | "skipped";
    reason: string;
    trashDate?: string | null;
    expirationDate?: string | null;
  }>;
}

/**
 * Executa a rotina de exclusão automática permanente de itens vencidos da lixeira.
 * Pode ser executada pelo cliente (via useDb) ou em segundo plano.
 */
export async function executeAutoPurge({
  tenantId,
  items,
  settings,
  db,
  currentDate = new Date()
}: {
  tenantId: string;
  items?: RecycleBinItem[];
  settings?: RecycleBinSettings;
  db: RecycleBinDbInterface;
  currentDate?: Date;
}): Promise<AutoPurgeResult> {
  const currentTenant = tenantId || "carol-ramos-collection";

  // 1. Obter configurações reais se não fornecidas
  const activeSettings = settings || await getRecycleBinSettings(currentTenant, db);

  // 2. Obter itens se não fornecidos
  let rawItems = items;
  if (!rawItems && db.getDocs) {
    rawItems = await db.getDocs("recycle_bin", true);
  }

  // 3. Garantir isolamento por tenant
  const tenantItems = (rawItems || []).filter(item => {
    const itemTenant = item.tenantId || "carol-ramos-collection";
    return itemTenant === currentTenant || itemTenant === "shared";
  });

  const result: AutoPurgeResult = {
    tenantId: currentTenant,
    totalEvaluated: tenantItems.length,
    deletedCount: 0,
    skippedCount: 0,
    deletedIds: [],
    details: []
  };

  // Se auto-purge estiver desativado (0 dias)
  if (activeSettings.autoPurgeDays <= 0) {
    console.log(`[TRASH_AUTO_DELETE] Limpeza automática desativada (autoPurgeDays = 0) para o tenant "${currentTenant}".`);
    for (const item of tenantItems) {
      result.skippedCount++;
      result.details.push({
        itemId: item.id || "unknown",
        itemName: item.itemName || "Item",
        action: "skipped",
        reason: "auto_purge_disabled"
      });
    }
    return result;
  }

  // 4. Avaliar cada item
  for (const item of tenantItems) {
    const itemId = item.id || "unknown";
    const itemName = item.itemName || "Item sem nome";

    // Item que já foi restaurado (não está mais soft-deleted)
    if ((item as any).deleted === false || item.originalData?.deleted === false) {
      console.log(`[TRASH_AUTO_DELETE] item: ${itemId} (${itemName}) | action: skipped | reason: already_restored`);
      result.skippedCount++;
      result.details.push({
        itemId,
        itemName,
        action: "skipped",
        reason: "already_restored"
      });
      continue;
    }

    const check = checkItemExpiration(item, activeSettings.autoPurgeDays, currentDate);

    if (!check.eligible) {
      console.log(`[TRASH_AUTO_DELETE] item: ${itemId} (${itemName}) | action: skipped | reason: ${check.reason}`);
      result.skippedCount++;
      result.details.push({
        itemId,
        itemName,
        action: "skipped",
        reason: check.reason,
        trashDate: toSafeISOString(check.trashDate),
        expirationDate: toSafeISOString(check.expirationDate)
      });
      continue;
    }

    // ITEM ELEGÍVEL PARA EXCLUSÃO AUTOMÁTICA
    console.log(
      `[TRASH_AUTO_DELETE]\n` +
      `item: ${itemId} (${itemName})\n` +
      `retentionDays: ${activeSettings.autoPurgeDays}\n` +
      `trashDate: ${toSafeISOString(check.trashDate)}\n` +
      `expirationDate: ${toSafeISOString(check.expirationDate)}\n` +
      `now: ${currentDate.toISOString()}\n` +
      `eligible: true\n` +
      `action: delete`
    );

    try {
      if (db.permanentlyDeleteDoc) {
        await db.permanentlyDeleteDoc(itemId, item.originalCollection, item.originalId);
      }
      result.deletedCount++;
      result.deletedIds.push(itemId);
      result.details.push({
        itemId,
        itemName,
        action: "delete",
        reason: "expired",
        trashDate: toSafeISOString(check.trashDate),
        expirationDate: toSafeISOString(check.expirationDate)
      });
    } catch (err) {
      console.error(`[TRASH_AUTO_DELETE] Falha ao excluir item ${itemId}:`, err);
      result.skippedCount++;
      result.details.push({
        itemId,
        itemName,
        action: "skipped",
        reason: "delete_error"
      });
    }
  }

  return result;
}
