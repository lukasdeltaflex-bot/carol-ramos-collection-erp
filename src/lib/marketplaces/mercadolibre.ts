const MELI_AUTH_HOST = process.env.MELI_AUTH_HOST || "https://auth.mercadolibre.com.br";
const MELI_API_HOST = process.env.MELI_API_HOST || "https://api.mercadolibre.com";

/**
 * Gera a URL oficial de autorização OAuth 2.0 do Mercado Livre.
 */
export function getMeliAuthUrl(appId: string, redirectUri: string): string {
  return `${MELI_AUTH_HOST}/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

/**
 * Troca o authorization code por Access Token e Refresh Token do Mercado Livre.
 */
export async function exchangeMeliCode(
  appId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number; // segundos (ex: 21600 = 6 horas)
  error?: string;
  message?: string;
}> {
  const url = `${MELI_API_HOST}/oauth/token`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: appId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`[Meli OAuth Error] ${data.error}: ${data.message || data.error_description}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    expires_in: data.expires_in || 21600
  };
}

/**
 * Renova o Access Token do Mercado Livre utilizando o Refresh Token.
 */
export async function refreshMeliAccessToken(
  appId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number;
}> {
  const url = `${MELI_API_HOST}/oauth/token`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`[Meli Refresh Error] ${data.error}: ${data.message || data.error_description}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    expires_in: data.expires_in || 21600
  };
}

/**
 * Busca a lista de IDs de anúncios de um vendedor no Mercado Livre.
 */
export async function fetchMeliSellerItems(userId: number, accessToken: string): Promise<string[]> {
  const url = `${MELI_API_HOST}/users/${userId}/items/search`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await response.json();
  return data.results || [];
}

/**
 * Obtém os detalhes de um anúncio do Mercado Livre (incluindo variações e Mercado Envios).
 */
export async function fetchMeliItemDetail(itemId: string, accessToken: string): Promise<any> {
  const url = `${MELI_API_HOST}/items/${itemId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return await response.json();
}

/**
 * Atualiza o estoque de um item ou variação no Mercado Livre.
 */
export async function updateMeliItemStock(
  itemId: string,
  quantity: number,
  accessToken: string
): Promise<boolean> {
  const url = `${MELI_API_HOST}/items/${itemId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ available_quantity: quantity })
  });

  return response.ok;
}

/**
 * Atualiza o preço de tabela de um anúncio no Mercado Livre.
 */
export async function updateMeliItemPrice(
  itemId: string,
  price: number,
  accessToken: string
): Promise<boolean> {
  const url = `${MELI_API_HOST}/items/${itemId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ price })
  });

  return response.ok;
}
