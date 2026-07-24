import { NextRequest, NextResponse } from "next/server";
import { ShopeeProvider } from "@/features/integrations/providers/ShopeeProvider";
import { saveMarketplaceAccount } from "@/services/marketplaceDbService";

export async function GET(req: NextRequest) {
  try {
    console.log("[OAUTH] [SHOPEE] Iniciando rota de autenticação.");
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const action = searchParams.get("action");

    console.log(`[OAUTH] [SHOPEE] Params recebidos: action=${action}, tenantId=${tenantId}, code=${code ? "presente" : "ausente"}`);

    const provider = new ShopeeProvider();

    // Se a requisição for para iniciar o fluxo OAuth (redirecionar para a Shopee)
    if (action === "connect") {
      console.log("[OAUTH] [SHOPEE] Solicitada conexão. Gerando URL...");
      const authUrl = await provider.getAuthUrl(tenantId);
      
      if (!authUrl || !authUrl.startsWith("http")) {
        throw new Error("URL gerada é inválida ou não possui protocolo HTTP/HTTPS.");
      }
      
      console.log(`[OAUTH] [REDIRECT] Redirecionando para: ${authUrl.substring(0, 50)}...`);
      return NextResponse.redirect(authUrl);
    }

    // Se for o callback de retorno do vendedor contendo o authorization 'code'
    if (code) {
      console.log("[OAUTH] [SHOPEE] Recebido código de autorização (callback). Processando auth...");
      const accountData = await provider.handleAuthCallback(code, tenantId);
      
      console.log("[OAUTH] [SHOPEE] Autorização concluída. Salvando credenciais no Firebase...");
      await saveMarketplaceAccount(accountData);

      console.log("[OAUTH] [SHOPEE] Credenciais salvas. Redirecionando usuário para o ERP.");
      // Redireciona o usuário de volta para o ERP na aba da Shopee
      const targetUrl = new URL("/marketplaces?tab=shopee&status=connected", req.url);
      return NextResponse.redirect(targetUrl);
    }

    console.warn("[OAUTH] [SHOPEE] Parâmetros insuficientes na requisição.");
    return NextResponse.json({ error: "Parâmetro 'code' ou 'action=connect' ausente." }, { status: 400 });
  } catch (error: any) {
    console.error("[OAUTH] [SHOPEE] [ERROR] Falha crítica na rota OAuth:", error);
    return NextResponse.json({ 
      step: "API_ROUTE_EXECUTION",
      marketplace: "shopee",
      error: "Erro interno no fluxo OAuth da Shopee", 
      message: error?.message || String(error), 
      stack: error?.stack 
    }, { status: 500 });
  }
}
