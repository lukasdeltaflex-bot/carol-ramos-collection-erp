import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");
    const tenantId = searchParams.get("tenantId") || "default_tenant";
    const code = searchParams.get("code");

    return NextResponse.json({
      status: "oauth route alive - no dependencies",
      channel: "shopee",
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
