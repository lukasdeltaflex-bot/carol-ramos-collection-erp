"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Globe,
  RefreshCw,
  LayoutDashboard,
  ShoppingCart,
  Box,
  DollarSign,
  Calculator,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Store,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tabs imports
import DashboardTab from "./components/DashboardTab";
import AccountsTab from "./components/AccountsTab";
import OrdersTab from "./components/OrdersTab";
import ProductsTab from "./components/ProductsTab";
import StockTab from "./components/StockTab";
import FinanceTab from "./components/FinanceTab";
import SimulatorTab from "./components/SimulatorTab";
import IncidentTab from "./components/IncidentTab";
import AuditTab from "./components/AuditTab";
import ObservabilityTab from "./components/ObservabilityTab";

type TabId =
  | "dashboard"
  | "accounts"
  | "orders"
  | "products"
  | "stock"
  | "finance"
  | "simulator"
  | "incidents"
  | "audit"
  | "observability";

export default function MarketplacesPage() {
  const { tenantId: authTenantId } = useAuth();
  const tenantId = authTenantId || "default_tenant";

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabId | null;
      if (tab) setActiveTab(tab);
    }
  }, []);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Contas e Sync", icon: Store },
    { id: "orders", label: "Pedidos", icon: ShoppingCart },
    { id: "products", label: "Produtos", icon: Box },
    { id: "stock", label: "Estoque Unificado", icon: Layers },
    { id: "finance", label: "Financeiro", icon: DollarSign },
    { id: "simulator", label: "Simulador", icon: Calculator },
    { id: "incidents", label: "Incidentes", icon: AlertTriangle },
    { id: "audit", label: "Auditoria", icon: ShieldCheck },
    { id: "observability", label: "Observabilidade", icon: Activity },
  ] as const;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-16">
      {/* Header with Rose Gold Glassmorphism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl text-primary border border-orange-500/30">
              <Globe className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Central de Marketplaces
                <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-500 font-semibold rounded-md border border-emerald-500/20">
                  v2.0 Enterprise Hub
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão Omnichannel Completa - Estoque Unificado (Single Source of Truth) & Integrações.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação de Abas Scrollable */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabId);
                window.history.replaceState({}, "", `/marketplaces?tab=${tab.id}`);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-lg"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo Dinâmico das Abas */}
      <div className="mt-6">
        {activeTab === "dashboard" && <DashboardTab tenantId={tenantId} />}
        {activeTab === "accounts" && <AccountsTab tenantId={tenantId} />}
        {activeTab === "orders" && <OrdersTab tenantId={tenantId} />}
        {activeTab === "products" && <ProductsTab tenantId={tenantId} />}
        {activeTab === "stock" && <StockTab tenantId={tenantId} />}
        {activeTab === "finance" && <FinanceTab tenantId={tenantId} />}
        {activeTab === "simulator" && <SimulatorTab tenantId={tenantId} />}
        {activeTab === "incidents" && <IncidentTab tenantId={tenantId} />}
        {activeTab === "audit" && <AuditTab tenantId={tenantId} />}
        {activeTab === "observability" && <ObservabilityTab tenantId={tenantId} />}
      </div>
    </div>
  );
}
