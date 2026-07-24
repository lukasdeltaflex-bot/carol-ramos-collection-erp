import { adminDb } from "@/lib/firebase/admin";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  MarketplaceAccount,
  MarketplaceChannel,
  MarketplaceItem,
  MarketplaceOrder,
  MarketplaceWebhookLog
} from "@/features/integrations/types/marketplaces";

/**
 * Salva ou atualiza uma conta de marketplace criptografando tokens sensíveis (AES-256-GCM).
 */
export async function saveMarketplaceAccount(accountData: Partial<MarketplaceAccount> & { tenantId: string; channel: MarketplaceChannel; sellerId: string }): Promise<string> {
  const now = new Date().toISOString();
  
  // Encripta os tokens se fornecidos em texto puro
  const encryptedAccessToken = accountData.encryptedAccessToken ? encrypt(accountData.encryptedAccessToken) : "";
  const encryptedRefreshToken = accountData.encryptedRefreshToken ? encrypt(accountData.encryptedRefreshToken) : "";

  const collectionRef = adminDb.collection("marketplace_accounts");
  
  // Procura se já existe conta registrada para esse tenant e channel/sellerId
  const existing = await collectionRef
    .where("tenantId", "==", accountData.tenantId)
    .where("channel", "==", accountData.channel)
    .where("sellerId", "==", accountData.sellerId)
    .get();

  const payload: Omit<MarketplaceAccount, "id"> = {
    tenantId: accountData.tenantId,
    channel: accountData.channel,
    sellerId: accountData.sellerId,
    shopName: accountData.shopName || accountData.sellerId,
    status: accountData.status || "connected",
    
    encryptedAccessToken,
    encryptedRefreshToken,
    accessTokenExpiresAt: accountData.accessTokenExpiresAt || "",
    refreshTokenExpiresAt: accountData.refreshTokenExpiresAt || "",
    
    sourceOfTruth: accountData.sourceOfTruth || "erp",
    autoSyncStock: accountData.autoSyncStock !== false,
    autoSyncPrice: accountData.autoSyncPrice !== false,
    autoSyncOrders: accountData.autoSyncOrders !== false,
    
    syncedProductsCount: accountData.syncedProductsCount || 0,
    importedOrdersCount: accountData.importedOrdersCount || 0,
    errorsCount: accountData.errorsCount || 0,
    lastSyncAt: accountData.lastSyncAt || now,
    nextRenewalAt: accountData.nextRenewalAt || "",
    
    createdAt: accountData.createdAt || now,
    updatedAt: now,
    createdBy: accountData.createdBy || "system",
    updatedBy: accountData.updatedBy || "system"
  };

  if (!existing.empty) {
    const docId = existing.docs[0].id;
    await collectionRef.doc(docId).update(payload);
    return docId;
  } else {
    const docRef = await collectionRef.add(payload);
    return docRef.id;
  }
}

/**
 * Busca e descriptografa as credenciais de uma conta de marketplace cadastrada.
 */
export async function getMarketplaceAccount(tenantId: string, channel: MarketplaceChannel, sellerId?: string): Promise<MarketplaceAccount | null> {
  let query = adminDb.collection("marketplace_accounts").where("tenantId", "==", tenantId).where("channel", "==", channel);
  if (sellerId) {
    query = query.where("sellerId", "==", sellerId);
  }

  const snapshot = await query.get();
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as MarketplaceAccount;

  return {
    ...data,
    id: doc.id,
    // Descriptografa tokens em tempo de execução no servidor
    encryptedAccessToken: data.encryptedAccessToken ? decrypt(data.encryptedAccessToken) : "",
    encryptedRefreshToken: data.encryptedRefreshToken ? decrypt(data.encryptedRefreshToken) : ""
  };
}

/**
 * Registra um webhook bruto recebido com validação de Idempotência.
 */
export async function logMarketplaceWebhook(log: Omit<MarketplaceWebhookLog, "id">): Promise<string> {
  const collectionRef = adminDb.collection("marketplace_webhooks_log");
  
  // Check de Idempotência
  const existing = await collectionRef
    .where("tenantId", "==", log.tenantId)
    .where("idempotencyKey", "==", log.idempotencyKey)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const docRef = await collectionRef.add(log);
  return docRef.id;
}
