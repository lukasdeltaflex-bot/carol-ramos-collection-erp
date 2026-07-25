import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const code = searchParams.get("code");
    
    // Just instantiate to see if it breaks
    const hasAuth = typeof getAuth === "function";

    return NextResponse.json({
      status: "oauth route alive - testing ONLY auth",
      channel: "shopee",
      hasAuth,
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
