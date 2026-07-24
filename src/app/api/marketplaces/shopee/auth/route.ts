import { NextRequest, NextResponse } from "next/server";
import { ShopeeProvider } from "@/features/integrations/providers/ShopeeProvider";
import { saveMarketplaceAccount } from "@/services/marketplaceDbService";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const action = searchParams.get("action");

    const provider = new ShopeeProvider();

    // Se a requisição for para iniciar o fluxo OAuth (redirecionar para a Shopee)
    if (action === "connect") {
      const authUrl = await provider.getAuthUrl(tenantId);
      return NextResponse.redirect(authUrl);
    }

    // Se for o callback de retorno do vendedor contendo o authorization 'code'
    if (code) {
      const accountData = await provider.handleAuthCallback(code, tenantId);
      await saveMarketplaceAccount(accountData);

      // Redireciona o usuário de volta para o ERP na aba da Shopee
      const targetUrl = new URL("/marketplaces?tab=shopee&status=connected", req.url);
      return NextResponse.redirect(targetUrl);
    }

    return NextResponse.json({ error: "Parâmetro 'code' ou 'action=connect' ausente." }, { status: 400 });
  } catch (error: any) {
    console.error("[Shopee OAuth Route Error]:", error);
    
    // Fallback safe URL resolution to prevent crash in catch block
    const baseUrl = req.nextUrl ? req.nextUrl.origin : "https://carol-ramos-collection-erp.vercel.app";
    const errorUrl = new URL("/marketplaces?tab=shopee&error=" + encodeURIComponent(error.message || "Falha na autenticação OAuth"), baseUrl);
    
    return NextResponse.redirect(errorUrl);
  }
}
