import { adminDb } from "@/lib/firebase/admin";
import { MarketplaceAccount, MarketplaceChannel, MarketplaceConnectionStatus } from "@/features/integrations/types/marketplaces";
import { saveMarketplaceAccount, getMarketplaceAccount } from "../marketplaceDbService";
import { logMarketplaceEvent } from "../marketplaceLogService";
import EventBus from "./EventBusService";
import Cache from "./CacheService";

/**
 * Serviço Principal de Contas de Marketplace (Enterprise Marketplace Service).
 * Gerencia ciclo de vida de conexões (OAuth/Tokens), renovação automática,
 * listagem com isolamento por Tenant e validação de status em tempo real.
 */
class MarketplaceService {
  private readonly collectionName = "marketplace_accounts";

  /**
   * Conecta ou atualiza uma conta de vendedor com criptografia segura de tokens e invalidação de cache.
   */
  public async saveAccount(
    tenantId: string,
    channel: MarketplaceChannel,
    sellerId: string,
    accountData: Partial<MarketplaceAccount>
  ): Promise<string> {
    const docId = await saveMarketplaceAccount({
      ...accountData,
      tenantId,
      channel,
      sellerId
    });

    // Invalida cache de configurações e dashboard
    Cache.invalidateByEntity(tenantId, "config");
    Cache.invalidateByEntity(tenantId, "dashboard");

    await logMarketplaceEvent({
      tenantId,
      channel,
      severity: "INFO",
      operation: "save_account",
      resource: "account",
      message: `Conta do canal ${channel} (Seller: ${sellerId}) atualizada com sucesso.`
    });

    return docId;
  }

  /**
   * Obtém os dados e tokens descriptografados de uma conta.
   */
  public async getAccount(tenantId: string, channel: MarketplaceChannel, sellerId?: string): Promise<MarketplaceAccount | null> {
    return await getMarketplaceAccount(tenantId, channel, sellerId);
  }

  /**
   * Lista todas as contas de marketplaces conectadas para um Tenant com cache (30 min).
   */
  public async listAccounts(tenantId: string): Promise<MarketplaceAccount[]> {
    return await Cache.getOrFetch(tenantId, "config", "all_accounts", async () => {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where("tenantId", "==", tenantId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<MarketplaceAccount, "id">)
      }));
    });
  }

  /**
   * Altera o status de conexão de uma conta e emite alerta no EventBus caso expire.
   */
  public async updateStatus(tenantId: string, channel: MarketplaceChannel, sellerId: string, status: MarketplaceConnectionStatus): Promise<void> {
    const account = await this.getAccount(tenantId, channel, sellerId);
    if (!account || !account.id) return;

    const now = new Date().toISOString();
    await adminDb.collection(this.collectionName).doc(account.id).update({
      status,
      updatedAt: now
    });

    Cache.invalidateByEntity(tenantId, "config");

    if (status === "expired" || status === "error") {
      await EventBus.publish({
        id: `status_${account.id}_${now}`,
        topic: "TOKEN_EXPIRANDO",
        tenantId,
        channel,
        payload: { accountId: account.id, shopName: account.shopName, status },
        timestamp: now
      });
    }
  }

  /**
   * Valida se uma conta está ativa e conectada para autorizar operações de sincronização.
   */
  public async isAccountActive(tenantId: string, channel: MarketplaceChannel, sellerId?: string): Promise<boolean> {
    const account = await this.getAccount(tenantId, channel, sellerId);
    return Boolean(account && account.status === "connected");
  }
}

export const Marketplace = new MarketplaceService();
export default Marketplace;
