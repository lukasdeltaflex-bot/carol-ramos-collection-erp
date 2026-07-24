import crypto from "crypto";

const SHOPEE_HOST = process.env.SHOPEE_API_HOST || "https://partner.shopeesz.com";

/**
 * Assina uma requisição da API v2 da Shopee com HMAC-SHA256.
 * Fórmula oficial Shopee v2: HMAC-SHA256(partner_id + path + timestamp + access_token + shop_id, partner_key)
 */
export function signShopeeRequest(
  partnerId: string,
  partnerKey: string,
  path: string,
  timestamp: number,
  accessToken: string = "",
  shopId: string = ""
): string {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
}

/**
 * Gera a URL oficial de autorização OAuth 2.0 para o vendedor autorizar a loja na Shopee.
 */
export function getShopeeAuthUrl(partnerId: string, partnerKey: string, redirectUri: string): string {
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp);
  
  return `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}`;
}

/**
 * Troca o authorization code pelo Access Token e Refresh Token iniciais da Shopee v2.
 */
export async function exchangeShopeeCode(
  partnerId: string,
  partnerKey: string,
  code: string,
  shopId: number
): Promise<{
  access_token: string;
  refresh_token: string;
  expire_in: number; // segundos (ex: 14400 = 4 horas)
  error?: string;
  message?: string;
}> {
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp);

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      partner_id: Number(partnerId),
      shop_id: Number(shopId)
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`[Shopee OAuth Error] ${data.error}: ${data.message}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expire_in: data.expire_in || 14400
  };
}

/**
 * Renova o Access Token da Shopee v2 utilizando o Refresh Token.
 */
export async function refreshShopeeAccessToken(
  partnerId: string,
  partnerKey: string,
  refreshToken: string,
  shopId: number
): Promise<{
  access_token: string;
  refresh_token: string;
  expire_in: number;
}> {
  const path = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp);

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      partner_id: Number(partnerId),
      shop_id: Number(shopId)
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`[Shopee Refresh Error] ${data.error}: ${data.message}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expire_in: data.expire_in || 14400
  };
}

/**
 * Valida a assinatura HMAC de um webhook recebido da Shopee.
 */
export function verifyShopeeWebhookSign(
  webhookUrl: string,
  requestBody: string,
  partnerKey: string,
  signatureHeader: string
): boolean {
  if (!signatureHeader || !partnerKey) return false;
  const baseString = webhookUrl + "|" + requestBody;
  const calculatedSign = crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
  return calculatedSign === signatureHeader;
}
