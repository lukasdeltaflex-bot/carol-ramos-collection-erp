import crypto from "crypto";

const SHOPEE_HOST = process.env.SHOPEE_API_HOST || "https://partner.shopeemobile.com";

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
export function getShopeeAuthUrl(partnerId: string, partnerKey: string, redirectUri: string, state: string): string {
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp);
  
  return `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
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

/**
 * Busca lista de item_id de produtos na Shopee v2.
 */
export async function fetchShopeeItemList(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  options?: { offset?: number; pageSize?: number }
): Promise<number[]> {
  const path = "/api/v2/product/get_item_list";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));
  const offset = options?.offset || 0;
  const pageSize = options?.pageSize || 50;

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&offset=${offset}&page_size=${pageSize}&item_status=NORMAL`;

  const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!response.ok) return [];

  const data = await response.json();
  const items = data.response?.item || [];
  return items.map((i: any) => i.item_id);
}

/**
 * Busca detalhes básicos de produtos na Shopee v2 (nome, SKU, preço, estoque).
 */
export async function fetchShopeeItemBaseInfo(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  itemIds: number[]
): Promise<any[]> {
  if (itemIds.length === 0) return [];
  const path = "/api/v2/product/get_item_base_info";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&item_id_list=${itemIds.slice(0, 50).join(",")}`;

  const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!response.ok) return [];

  const data = await response.json();
  return data.response?.item_list || [];
}

/**
 * Atualiza estoque de um produto na Shopee v2.
 */
export async function updateShopeeStock(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  itemId: number,
  stock: number
): Promise<boolean> {
  const path = "/api/v2/product/update_stock";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_id: Number(itemId),
      stock_list: [{ normal_stock: Math.max(0, stock) }]
    })
  });

  return response.ok;
}

/**
 * Atualiza preço de um produto na Shopee v2.
 */
export async function updateShopeePrice(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  itemId: number,
  price: number
): Promise<boolean> {
  const path = "/api/v2/product/update_price";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_id: Number(itemId),
      price_list: [{ original_price: price }]
    })
  });

  return response.ok;
}

/**
 * Busca lista de pedidos da Shopee v2.
 */
export async function fetchShopeeOrderList(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  options?: { timeFrom?: number; timeTo?: number }
): Promise<string[]> {
  const path = "/api/v2/order/get_order_list";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));
  const timeFrom = options?.timeFrom || Math.floor((Date.now() - 15 * 86400000) / 1000); // 15 dias
  const timeTo = options?.timeTo || timestamp;

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=50`;

  const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!response.ok) return [];

  const data = await response.json();
  const orderList = data.response?.order_list || [];
  return orderList.map((o: any) => o.order_sn);
}

/**
 * Busca detalhes completos de pedidos na Shopee v2.
 */
export async function fetchShopeeOrderDetail(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  orderSnList: string[]
): Promise<any[]> {
  if (orderSnList.length === 0) return [];
  const path = "/api/v2/order/get_order_detail";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&order_sn_list=${orderSnList.slice(0, 50).join(",")}&response_optional_fields=item_list,buyer_user_id,buyer_username,recipient_address,estimated_shipping_fee`;

  const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!response.ok) return [];

  const data = await response.json();
  return data.response?.order_list || [];
}

/**
 * Busca informações de rastreamento logístico de um pedido na Shopee v2.
 */
export async function fetchShopeeTrackingInfo(
  partnerId: string,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  orderSn: string
): Promise<any | null> {
  const path = "/api/v2/logistics/get_tracking_info";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(partnerId, partnerKey, path, timestamp, accessToken, String(shopId));

  const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&order_sn=${orderSn}`;

  const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!response.ok) return null;

  const data = await response.json();
  return data.response || null;
}
