import { NextResponse } from "next/server";
import { MercadoLivreProvider } from "@/features/integrations/providers/MercadoLivreProvider";
import { saveMarketplaceAccount } from "@/services/marketplaceDbService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const action = searchParams.get("action");

    const provider = new MercadoLivreProvider();

    // Se for requisição de conexão (iniciar o fluxo OAuth)
    if (action === "connect") {
      const authUrl = await provider.getAuthUrl(tenantId);
      return NextResponse.redirect(authUrl);
    }

    // Se for o callback de retorno com o 'code' de autorização do seller
    if (code) {
      const accountData = await provider.handleAuthCallback(code, tenantId);
      await saveMarketplaceAccount(accountData);

      const targetUrl = new URL("/marketplaces?tab=mercadolibre&status=connected", req.url);
      return NextResponse.redirect(targetUrl);
    }

    return NextResponse.json({ error: "Parâmetro 'code' ou 'action=connect' ausente." }, { status: 400 });
  } catch (error: any) {
    console.error("[Mercado Livre OAuth Route Error]:", error);
    const errorUrl = new URL("/marketplaces?tab=mercadolibre&error=" + encodeURIComponent(error.message || "Falha na autenticação OAuth"), req.url);
    return NextResponse.redirect(errorUrl);
  }
}
