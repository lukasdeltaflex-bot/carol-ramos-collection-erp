import { NextRequest, NextResponse } from "next/server";
import { MercadoLivreProvider } from "@/features/integrations/providers/MercadoLivreProvider";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const code = searchParams.get("code");
    
    // Just instantiate to see if it breaks
    const provider = new MercadoLivreProvider();

    return NextResponse.json({
      status: "oauth route alive - with MercadoLivreProvider imported",
      channel: "mercadolibre",
      providerChannel: provider.channel,
      receivedParams: { action, tenantId, code }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      step: "API_ROUTE_EXECUTION_DEBUG",
      error: "Erro interno", 
      message: String(error)
    }, { status: 500 });
  }
}
