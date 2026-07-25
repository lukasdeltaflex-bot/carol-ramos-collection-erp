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
