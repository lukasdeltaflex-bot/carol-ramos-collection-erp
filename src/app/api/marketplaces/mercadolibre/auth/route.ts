import { NextRequest, NextResponse } from "next/server";
import { getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const code = searchParams.get("code");
    
    // Just instantiate to see if it breaks
    const appsCount = getApps().length;
    const hasFirestore = typeof getFirestore === "function";

    return NextResponse.json({
      status: "oauth route alive - with getFirestore imported",
      appsCount,
      hasFirestore,
      channel: "mercadolibre",
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
