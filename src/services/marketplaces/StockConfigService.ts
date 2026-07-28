import { adminDb } from "@/lib/firebase/admin";
import { TenantStockConfig } from "@/features/integrations/types/unified-stock";
import Cache from "./CacheService";

const DEFAULT_CONFIG: Omit<TenantStockConfig, "tenantId"> = {
  autoSyncStock: true,
  allowNegativeStock: false,
  syncMode: "immediate",
  syncIntervalMinutes: 5,
  deductTrigger: "paid",
  minSafetyStock: 0,
  syncActiveOnly: true,
};

class StockConfigService {
  private readonly collectionName = "tenant_stock_configs";

  public async getConfig(tenantId: string): Promise<TenantStockConfig> {
    return await Cache.getOrFetch(tenantId, "config", "tenant_rules", async () => {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where("tenantId", "==", tenantId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          tenantId,
          ...DEFAULT_CONFIG,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...(doc.data() as Omit<TenantStockConfig, "id">),
      };
    });
  }

  public async updateConfig(tenantId: string, updates: Partial<TenantStockConfig>): Promise<TenantStockConfig> {
    const current = await this.getConfig(tenantId);
    const now = new Date().toISOString();

    const newConfig: TenantStockConfig = {
      ...current,
      ...updates,
      tenantId,
      updatedAt: now,
    };

    if (current.id) {
      await adminDb.collection(this.collectionName).doc(current.id).update({
        ...updates,
        updatedAt: now,
      });
    } else {
      const ref = await adminDb.collection(this.collectionName).add({
        ...newConfig,
        createdAt: now,
      });
      newConfig.id = ref.id;
    }

    Cache.invalidateByEntity(tenantId, "config");
    return newConfig;
  }
}

export const StockConfig = new StockConfigService();
export default StockConfig;
