import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkItemExpiration, toSafeISOString } from "@/features/recycle-bin/services/recycleBinService";
import { RecycleBinItem, RecycleBinSettings } from "@/features/recycle-bin/types";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Limpeza Automática da Lixeira (Execução Server-Side)
 * 
 * Pode ser acionado por:
 * - Vercel Cron Jobs (vercel.json)
 * - Agendadores externos (Cloud Scheduler, GitHub Actions, cURL)
 * - Manutenção do ERP em segundo plano
 */
async function handleAutoPurge(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantParam = url.searchParams.get("tenantId") || "carol-ramos-collection";

    // 1. Carregar configurações de retenção do tenant
    let autoPurgeDays = 30;

    try {
      const configSnap = await adminDb
        .collection("integration_configs")
        .where("tenantId", "==", tenantParam)
        .where("channel", "==", "recycle_bin")
        .limit(1)
        .get();

      if (!configSnap.empty) {
        const configData = configSnap.docs[0].data();
        if (typeof configData.autoPurgeDays === "number") {
          autoPurgeDays = configData.autoPurgeDays;
        }
      } else {
        const companySnap = await adminDb.collection("companies").doc(tenantParam).get();
        if (companySnap.exists) {
          const compData = companySnap.data();
          if (compData?.recycleBinSettings?.autoPurgeDays !== undefined) {
            autoPurgeDays = compData.recycleBinSettings.autoPurgeDays;
          }
        }
      }
    } catch (confErr) {
      console.warn("[TRASH_AUTO_DELETE] Aviso ao carregar configurações via Admin Firestore, usando 30 dias:", confErr);
    }

    // Se autoPurgeDays for 0, exclusão automática desativada
    if (autoPurgeDays <= 0) {
      return NextResponse.json({
        success: true,
        message: "Limpeza automática desativada para este tenant (autoPurgeDays = 0).",
        tenantId: tenantParam,
        deletedCount: 0
      });
    }

    // 2. Buscar itens na lixeira do tenant
    const rbSnap = await adminDb
      .collection("recycle_bin")
      .where("tenantId", "in", [tenantParam, "shared"])
      .get();

    const now = new Date();
    const deletedIds: string[] = [];
    const skippedDetails: Array<{ id: string; reason: string }> = [];

    for (const docSnap of rbSnap.docs) {
      const data = docSnap.data() as RecycleBinItem;
      const itemId = docSnap.id;
      const itemName = data.itemName || "Item sem nome";

      // Verifica se o item já foi restaurado
      if ((data as any).deleted === false || data.originalData?.deleted === false) {
        skippedDetails.push({ id: itemId, reason: "already_restored" });
        continue;
      }

      const check = checkItemExpiration(data, autoPurgeDays, now);

      if (!check.eligible) {
        console.log(`[TRASH_AUTO_DELETE] item: ${itemId} (${itemName}) | action: skipped | reason: ${check.reason}`);
        skippedDetails.push({ id: itemId, reason: check.reason });
        continue;
      }

      // Elegível para exclusão definitiva no Firestore
      console.log(
        `[TRASH_AUTO_DELETE]\n` +
        `item: ${itemId} (${itemName})\n` +
        `retentionDays: ${autoPurgeDays}\n` +
        `trashDate: ${toSafeISOString(check.trashDate)}\n` +
        `expirationDate: ${toSafeISOString(check.expirationDate)}\n` +
        `now: ${now.toISOString()}\n` +
        `eligible: true\n` +
        `action: delete`
      );

      try {
        // Excluir permanentemente do documento original
        if (data.originalCollection && data.originalId) {
          try {
            await adminDb.collection(data.originalCollection).doc(data.originalId).delete();
          } catch (origErr) {
            console.warn(`[TRASH_AUTO_DELETE] Documento original ${data.originalCollection}/${data.originalId} já não existia:`, origErr);
          }
        }

        // Excluir permanentemente da coleção recycle_bin
        await adminDb.collection("recycle_bin").doc(itemId).delete();
        deletedIds.push(itemId);
      } catch (delErr) {
        console.error(`[TRASH_AUTO_DELETE] Erro ao excluir item ${itemId}:`, delErr);
      }
    }

    return NextResponse.json({
      success: true,
      tenantId: tenantParam,
      retentionDays: autoPurgeDays,
      totalEvaluated: rbSnap.docs.length,
      deletedCount: deletedIds.length,
      deletedIds,
      skippedCount: skippedDetails.length,
      executedAt: now.toISOString()
    });
  } catch (error: any) {
    console.error("[TRASH_AUTO_DELETE] Erro crítico na rota de limpeza automática:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao executar limpeza da lixeira" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleAutoPurge(req);
}

export async function POST(req: NextRequest) {
  return handleAutoPurge(req);
}
