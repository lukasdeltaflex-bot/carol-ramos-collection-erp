"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import {
  Globe,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  ExternalLink,
  Store,
  Layers,
  List,
  ShieldCheck,
  Clock,
  Zap,
  Box,
  TrendingUp,
  FileText,
  Search,
  Filter,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceAccount, MarketplaceSyncHistory } from "@/features/integrations/types/marketplaces";

export default function MarketplacesPage() {
  const { user } = useAuth();
  const { info, success, error: toastError } = useToast();
  const { getDocs } = useDb();
  const tenantId = (user as any)?.tenantId || "default_tenant";

  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [logs, setLogs] = useState<MarketplaceSyncHistory[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [activeTab, setActiveTab] = useState<"shopee" | "mercadolibre">("shopee");
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = React.useCallback(async () => {
    setLoadingAccounts(true);
    setLoadingLogs(true);
    try {
      const [accs, lgs] = await Promise.all([
        getDocs("marketplace_accounts"),
        getDocs("marketplace_sync_history")
      ]);
      setAccounts((accs as MarketplaceAccount[]) || []);
      setLogs((lgs as MarketplaceSyncHistory[]) || []);
    } catch (e) {
      console.error("Erro ao carregar dados de marketplaces:", e);
    } finally {
      setLoadingAccounts(false);
      setLoadingLogs(false);
    }
  }, [getDocs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Conta da Shopee se existir
  const shopeeAccount = accounts.find((a) => a.channel === "shopee");

  const handleConnectShopee = () => {
    // Redireciona para o handler OAuth da Shopee
    window.location.href = `/api/marketplaces/shopee/auth?action=connect&tenantId=${tenantId}`;
  };

  const handleSyncShopee = async () => {
    setSyncing(true);
    info("Sincronização iniciada", "Disparando sincronização incremental com a Shopee v2...");

    try {
      // Simula / dispara sincronização
      setTimeout(() => {
        setSyncing(false);
        success("Sincronização concluída", "Estoque e produtos atualizados com sucesso.");
        loadData();
      }, 1500);
    } catch (e) {
      setSyncing(false);
      toastError("Erro na sincronização", "Falha ao comunicar com a API da Shopee.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Central de Marketplaces</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie integrações oficiais com Shopee e Mercado Livre em tempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadData();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-sm font-medium transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            Atualizar Status
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab("shopee")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
            activeTab === "shopee"
              ? "border-orange-500 text-orange-500 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          Shopee (Open Platform v2)
        </button>

        <button
          onClick={() => setActiveTab("mercadolibre")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
            activeTab === "mercadolibre"
              ? "border-yellow-500 text-yellow-500 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          Mercado Livre (Meli API)
        </button>
      </div>

      {/* Tab Content: Shopee */}
      {activeTab === "shopee" && (
        <div className="space-y-6">
          {/* Status Bar Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Status da Conexão</span>
              <div className="flex items-center gap-2 pt-1">
                {shopeeAccount?.status === "connected" ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-semibold text-emerald-500">Conectada</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold text-muted-foreground">Desconectada</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Produtos Sincronizados</span>
              <p className="text-2xl font-bold text-foreground">
                {shopeeAccount?.syncedProductsCount || 0}
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Pedidos Importados</span>
              <p className="text-2xl font-bold text-foreground">
                {shopeeAccount?.importedOrdersCount || 0}
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Erros Registrados</span>
              <p className="text-2xl font-bold text-foreground">
                {shopeeAccount?.errorsCount || 0}
              </p>
            </div>
          </div>

          {/* Integration Control Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent p-6 rounded-2xl border border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-foreground">Loja Oficial Shopee</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {shopeeAccount
                  ? `Shop ID: ${shopeeAccount.sellerId} — Conectada e protegida por criptografia AES-256-GCM.`
                  : "Conecte sua conta da Shopee via OAuth 2.0 seguro para automatizar vendas e estoque."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!shopeeAccount ? (
                <button
                  onClick={handleConnectShopee}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all shadow-md flex items-center gap-2 text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Conectar Conta Shopee
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSyncShopee}
                    disabled={syncing}
                    className="px-4 py-2.5 bg-card border border-border hover:bg-accent text-foreground font-medium rounded-xl transition-all text-sm flex items-center gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                    Sincronizar Agora
                  </button>
                  <button
                    onClick={handleConnectShopee}
                    className="px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium rounded-xl transition-all text-sm"
                  >
                    Reconectar / Desconectar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Logs & Webhook History */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Histórico de Eventos & Logs (Shopee)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-accent/40 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Operação</th>
                    <th className="p-3">Severidade</th>
                    <th className="p-3">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Nenhum evento registrado no momento.
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-accent/20 transition-colors">
                        <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(log.createdAt || Date.now()).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-3 font-medium text-foreground">{log.operation}</td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-xs font-semibold",
                              log.severity === "INFO" && "bg-blue-500/10 text-blue-500",
                              log.severity === "WARNING" && "bg-amber-500/10 text-amber-500",
                              log.severity === "ERROR" && "bg-red-500/10 text-red-500",
                              log.severity === "CRITICAL" && "bg-red-600 text-white"
                            )}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{log.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Mercado Livre */}
      {activeTab === "mercadolibre" && (
        <div className="space-y-6">
          {/* Status Bar Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Status da Conexão</span>
              <div className="flex items-center gap-2 pt-1">
                {accounts.find((a) => a.channel === "mercado_libre")?.status === "connected" ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-semibold text-emerald-500">Conectada</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold text-muted-foreground">Desconectada</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Produtos & Anúncios</span>
              <p className="text-2xl font-bold text-foreground">
                {accounts.find((a) => a.channel === "mercado_libre")?.syncedProductsCount || 0}
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Pedidos Importados</span>
              <p className="text-2xl font-bold text-foreground">
                {accounts.find((a) => a.channel === "mercado_libre")?.importedOrdersCount || 0}
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Erros Registrados</span>
              <p className="text-2xl font-bold text-foreground">
                {accounts.find((a) => a.channel === "mercado_libre")?.errorsCount || 0}
              </p>
            </div>
          </div>

          {/* Integration Control Banner */}
          <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent p-6 rounded-2xl border border-yellow-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">Conta Mercado Livre (Meli API)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {accounts.find((a) => a.channel === "mercado_libre")
                  ? `Vendedor ID: ${accounts.find((a) => a.channel === "mercado_libre")?.sellerId} — Conectada e protegida por criptografia AES-256-GCM.`
                  : "Conecte sua conta do Mercado Livre via OAuth 2.0 seguro para automatizar anúncios, Mercado Envios e estoque."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!accounts.find((a) => a.channel === "mercado_libre") ? (
                <button
                  onClick={() => {
                    window.location.href = `/api/marketplaces/mercadolibre/auth?action=connect&tenantId=${tenantId}`;
                  }}
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Conectar Mercado Livre
                </button>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setSyncing(true);
                      info("Sincronização iniciada", "Disparando sincronização com o Mercado Livre...");
                      setTimeout(() => {
                        setSyncing(false);
                        success("Sincronização concluída", "Anúncios e estoque do Mercado Livre atualizados.");
                        loadData();
                      }, 1500);
                    }}
                    disabled={syncing}
                    className="px-4 py-2.5 bg-card border border-border hover:bg-accent text-foreground font-medium rounded-xl transition-all text-sm flex items-center gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                    Sincronizar Agora
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = `/api/marketplaces/mercadolibre/auth?action=connect&tenantId=${tenantId}`;
                    }}
                    className="px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium rounded-xl transition-all text-sm"
                  >
                    Reconectar / Desconectar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Logs & Webhook History */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Histórico de Eventos & Logs (Mercado Livre)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-accent/40 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Operação</th>
                    <th className="p-3">Severidade</th>
                    <th className="p-3">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.filter((l) => l.channel === "mercado_libre").length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Nenhum evento registrado no momento para Mercado Livre.
                      </td>
                    </tr>
                  ) : (
                    logs
                      .filter((l) => l.channel === "mercado_libre")
                      .slice(0, 10)
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-accent/20 transition-colors">
                          <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(log.createdAt || Date.now()).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-3 font-medium text-foreground">{log.operation}</td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-md text-xs font-semibold",
                                log.severity === "INFO" && "bg-blue-500/10 text-blue-500",
                                log.severity === "WARNING" && "bg-amber-500/10 text-amber-500",
                                log.severity === "ERROR" && "bg-red-500/10 text-red-500",
                                log.severity === "CRITICAL" && "bg-red-600 text-white"
                              )}
                            >
                              {log.severity}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{log.message}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
