import { NextRequest, NextResponse } from "next/server";
import { MercadoLivreProvider } from "@/features/integrations/providers/MercadoLivreProvider";
import { saveMarketplaceAccount } from "@/services/marketplaceDbService";

export async function GET(req: NextRequest) {
  try {
    console.log("[OAUTH] [MERCADO LIVRE] Iniciando rota de autenticação.");
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const tenantId = searchParams.get("tenantId") || state || "default_tenant";
    const action = searchParams.get("action");

    console.log(`[OAUTH] [MERCADO LIVRE] Params recebidos: action=${action}, tenantId=${tenantId}, code=${code ? "presente" : "ausente"}, state=${state}`);

    const provider = new MercadoLivreProvider();

    // Se for requisição de conexão (iniciar o fluxo OAuth)
    if (action === "connect") {
      console.log("[OAUTH] [MERCADO LIVRE] Solicitada conexão. Gerando URL...");
      const authUrl = await provider.getAuthUrl(tenantId);
      
      if (!authUrl || !authUrl.startsWith("http")) {
        throw new Error("URL gerada é inválida ou não possui protocolo HTTP/HTTPS.");
      }
      
      console.log(`[OAUTH] [REDIRECT] Redirecionando para: ${authUrl.substring(0, 50)}...`);
      return NextResponse.redirect(authUrl);
    }

    // Se for o callback de retorno com o 'code' de autorização do seller
    if (code) {
      console.log("[OAUTH] [MERCADO LIVRE] Recebido código de autorização (callback). Processando auth...");
      const accountData = await provider.handleAuthCallback(code, tenantId);
      
      console.log("[OAUTH] [MERCADO LIVRE] Autorização concluída. Salvando credenciais no Firebase...");
      await saveMarketplaceAccount(accountData);

      console.log("[OAUTH] [MERCADO LIVRE] Credenciais salvas. Redirecionando usuário para o ERP.");
      const targetUrl = new URL("/marketplaces?tab=mercadolibre&status=connected", req.url);
      return NextResponse.redirect(targetUrl);
    }

    console.warn("[OAUTH] [MERCADO LIVRE] Parâmetros insuficientes na requisição.");
    return NextResponse.json({ error: "Parâmetro 'code' ou 'action=connect' ausente." }, { status: 400 });
  } catch (error: any) {
    console.error("[OAUTH] [MERCADO LIVRE] [ERROR] Falha crítica na rota OAuth:", error);
    return NextResponse.json({ 
      step: "API_ROUTE_EXECUTION",
      marketplace: "mercado_libre",
      error: "Erro interno no fluxo OAuth do Mercado Livre", 
      message: error?.message || String(error), 
      stack: error?.stack 
    }, { status: 500 });
  }
}
