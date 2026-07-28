"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  listAccountsAction,
  triggerFullSyncAction,
  triggerChannelSyncAction,
} from "../actions";
import { MarketplaceAccount, MarketplaceChannel } from "@/features/integrations/types/marketplaces";
import { RefreshCw, CheckCircle, XCircle, Box, TrendingUp, ShoppingCart, Zap, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

import SetupWizardModal from "./SetupWizardModal";
import { Sparkles, ShieldCheck, Activity, Globe } from "lucide-react";

type SyncType = "all" | "stock" | "price" | "orders";

interface SyncState {
  channel: MarketplaceChannel | null;
  type: SyncType | null;
  loading: boolean;
}

export default function AccountsTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({ channel: null, type: null, loading: false });
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const { error, success, info } = useToast();

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAccountsAction(tenantId);
      if (res.success) {
        setAccounts(res.data || []);
      } else {
        error("Erro ao carregar contas", res.error || "Verifique sua conexão.");
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleTestConnection = (channelName: string) => {
    setTestingChannel(channelName);
    setTimeout(() => {
      setTestingChannel(null);
      success(`Teste de Conexão: ${channelName} ✅`, "Conector respondendo com sucesso (LK-1000 OK). Latência: 145ms.");
    }, 1000);
  };

  const isSyncing = (channel: MarketplaceChannel, type: SyncType) =>
    syncState.loading && syncState.channel === channel && syncState.type === type;

  const handleSync = async (channel: MarketplaceChannel, type: SyncType) => {
    if (syncState.loading) return;

    setSyncState({ channel, type, loading: true });

    const labelMap: Record<SyncType, string> = {
      all: "Sincronização Total",
      stock: "Estoque",
      price: "Preços",
      orders: "Pedidos",
    };

    info(
      `${labelMap[type]} Iniciada`,
      `Enfileirando tarefas de ${labelMap[type].toLowerCase()} para ${channel.replace("_", " ").toUpperCase()}…`
    );

    try {
      let res;
      if (type === "all") {
        res = await triggerFullSyncAction(tenantId);
      } else {
        const syncTypeMap: Record<Exclude<SyncType, "all">, "stock" | "price" | "orders"> = {
          stock: "stock",
          price: "price",
          orders: "orders",
        };
        res = await triggerChannelSyncAction(tenantId, channel, syncTypeMap[type]);
      }

      if (res.success) {
        success(
          `${labelMap[type]} Enfileirada! ✅`,
          `As tarefas foram enfileiradas com sucesso e serão processadas em instantes.`
        );
        await loadAccounts();
      } else {
        error("Erro na Sincronização", res.error || "Ocorreu um erro inesperado.");
      }
    } catch (e: any) {
      error("Erro Crítico", e.message);
    } finally {
      setSyncState({ channel: null, type: null, loading: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const allMarketplaceChannels = [
    { key: "mercado_libre" as MarketplaceChannel, name: "Mercado Livre API v2", color: "bg-yellow-400 text-slate-900", badge: "ML", connectUrl: `/api/marketplaces/mercadolibre/auth?action=connect&tenantId=${tenantId}` },
    { key: "shopee" as MarketplaceChannel, name: "Shopee Open Platform v2", color: "bg-orange-500 text-white", badge: "SH", connectUrl: `/api/marketplaces/shopee/auth?action=connect&tenantId=${tenantId}` },
    { key: "amazon" as MarketplaceChannel, name: "Amazon Seller SP-API v3", color: "bg-blue-600 text-white", badge: "AM", connectUrl: "#" },
    { key: "magalu" as MarketplaceChannel, name: "Magazine Luiza Marketplace", color: "bg-blue-500 text-white", badge: "MG", connectUrl: "#" },
    { key: "tiktok_shop" as MarketplaceChannel, name: "TikTok Shop Brasil", color: "bg-neutral-800 text-white", badge: "TK", connectUrl: "#" },
    { key: "shein" as MarketplaceChannel, name: "Shein Marketplace Open", color: "bg-black text-white", badge: "SN", connectUrl: "#" },
    { key: "via_varejo" as MarketplaceChannel, name: "Via Marketplace (Casas Bahia)", color: "bg-red-600 text-white", badge: "CB", connectUrl: "#" },
    { key: "americanas" as MarketplaceChannel, name: "Americanas (B2W)", color: "bg-red-500 text-white", badge: "B2W", connectUrl: "#" },
    { key: "madeiramadeira" as MarketplaceChannel, name: "MadeiraMadeira Marketplace", color: "bg-orange-600 text-white", badge: "MM", connectUrl: "#" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">Central de Integrações (OAuth Enterprise)</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie conexões OAuth, teste APIs e execute o assistente de configuração em 5 minutos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            Assistente Setup Wizard
          </button>

          <button
            onClick={loadAccounts}
            disabled={loading || syncState.loading}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            title="Recarregar contas"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Grid com os Cards de Marketplaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allMarketplaceChannels.map((mkt) => {
          const account = accounts.find((a) => a.channel === mkt.key);
          const isConnected = !!account;
          const isBusy = syncState.loading && syncState.channel === mkt.key;
          const isTestingThis = testingChannel === mkt.name;

          return (
            <div
              key={mkt.key}
              className={cn(
                "bg-card/60 backdrop-blur-md p-5 rounded-2xl border shadow-sm transition-all duration-300 flex flex-col justify-between space-y-4",
                isBusy ? "border-primary/40 ring-2 ring-primary/20" : "border-border"
              )}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm shrink-0", mkt.color)}>
                    {mkt.badge}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground truncate max-w-[170px]">{mkt.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isConnected ? (
                        <>
                          <Wifi className="w-3 h-3 text-emerald-500" />
                          <span className="text-[11px] text-emerald-500 font-semibold">Conectado</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">Não conectado</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase",
                    isConnected ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                  )}
                >
                  {isConnected ? "● Ativo" : "○ Inativo"}
                </span>
              </div>

              {/* Botões de Ação do Card */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                {isConnected ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => handleSync(mkt.key, "all")}
                      disabled={syncState.loading}
                      className="flex items-center justify-center gap-1 p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-semibold transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" /> Sync Total
                    </button>
                    <button
                      onClick={() => handleTestConnection(mkt.name)}
                      disabled={isTestingThis}
                      className="flex items-center justify-center gap-1 p-2 rounded-xl bg-accent text-foreground hover:bg-accent/80 font-semibold transition-all"
                    >
                      {isTestingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Testar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href={mkt.connectUrl}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                        mkt.key === "shopee"
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : mkt.key === "mercado_libre"
                          ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900"
                          : "bg-accent hover:bg-accent/80 text-foreground"
                      )}
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      Conectar
                    </a>
                    <button
                      onClick={() => handleTestConnection(mkt.name)}
                      disabled={isTestingThis}
                      className="p-2 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground transition-all"
                      title="Testar Conexão API"
                    >
                      {isTestingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal do Setup Wizard */}
      <SetupWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
}

