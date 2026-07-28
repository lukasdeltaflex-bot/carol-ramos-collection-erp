import { db } from "@/lib/firebase/client";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { ShareHistoryRecord, ServiceResult } from "@/features/products/types";


export class ShareHistoryService {
  /**
   * Grava um novo registro de compartilhamento na subcoleção do Firestore.
   */
  public static async recordShare(
    productId: string,
    record: Omit<ShareHistoryRecord, "id">
  ): Promise<ServiceResult<ShareHistoryRecord>> {
    try {
      const historyRef = collection(db, "products", productId, "share_history");
      const newDoc = {
        ...record,
        sharedAt: new Date().toISOString(),
      };
      const res = await addDoc(historyRef, newDoc);

      const savedRecord: ShareHistoryRecord = {
        id: res.id,
        ...newDoc,
      };

      return {
        success: true,
        data: savedRecord,
      };
    } catch (e: any) {
      console.error("Erro ao gravar histórico na subcoleção:", e);
      return {
        success: false,
        error: e.message || "Erro ao gravar histórico de compartilhamento",
        errorCode: "LK-1002",
      };
    }
  }

  /**
   * Busca o histórico de compartilhamentos da subcoleção de um produto.
   */
  public static async getHistory(
    productId: string,
    maxItems = 20
  ): Promise<ServiceResult<ShareHistoryRecord[]>> {
    try {
      const historyRef = collection(db, "products", productId, "share_history");
      const q = query(historyRef, orderBy("sharedAt", "desc"), limit(maxItems));
      const snap = await getDocs(q);

      const list: ShareHistoryRecord[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ShareHistoryRecord, "id">),
      }));

      return {
        success: true,
        data: list,
      };
    } catch (e: any) {
      console.error("Erro ao ler histórico de compartilhamentos:", e);
      return {
        success: false,
        error: e.message || "Erro ao ler histórico",
        data: [],
      };
    }
  }
}
