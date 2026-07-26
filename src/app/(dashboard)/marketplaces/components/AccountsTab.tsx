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

  const isSyncing = (channel: MarketplaceChannel, type: SyncType) =>
    syncState.loading && syncState.channel === channel && syncState.type === type;

  const handleSync = async (channel: MarketplaceChannel, type: SyncType) => {
    // Previne duplo clique
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
        // Recarrega contas para atualizar status
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

  const shopeeAccount = accounts.find((a) => a.channel === "shopee");
  const meliAccount = accounts.find((a) => a.channel === "mercado_libre");

  const ChannelCard = ({
    account,
    channel,
    name,
    color,
    badge,
    connectUrl,
  }: {
    account?: MarketplaceAccount;
    channel: MarketplaceChannel;
    name: string;
    color: string;
    badge: string;
    connectUrl: string;
  }) => {
    const isConnected = !!account;
    const isBusy = syncState.loading && syncState.channel === channel;

    return (
      <div
        className={cn(
          "bg-card/60 backdrop-blur-md p-6 rounded-2xl border shadow-sm transition-all duration-300",
          isBusy ? "border-primary/40 ring-2 ring-primary/20" : "border-border"
        )}
      >
        {/* Header do Canal */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm",
                color
              )}
            >
              {badge}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs text-emerald-500 font-medium">Conectado</span>
                    <span className="text-xs text-muted-foreground">• ID: {account!.sellerId}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Não conectado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-full",
              isConnected
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isConnected ? "● ATIVO" : "○ INATIVO"}
          </span>
        </div>

        {/* Barra de progresso quando sincronizando */}
        {isBusy && (
          <div className="mb-4 space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-primary">
              <span>Enfileirando tarefas…</span>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Ações */}
        {isConnected ? (
          <div className="flex flex-wrap gap-2">
            {/* Sincronização Total */}
            <button
              onClick={() => handleSync(channel, "all")}
              disabled={syncState.loading}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
                isBusy && syncState.type === "all"
                  ? "bg-primary text-primary-foreground cursor-wait"
                  : "bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSyncing(channel, "all") ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Sincronização Total
            </button>

            {/* Sincronizar Estoque */}
            <button
              onClick={() => handleSync(channel, "stock")}
              disabled={syncState.loading}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
                isSyncing(channel, "stock")
                  ? "bg-blue-500 text-white cursor-wait"
                  : "bg-accent text-foreground hover:bg-accent/70 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSyncing(channel, "stock") ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Box className="w-3.5 h-3.5" />
              )}
              Estoque
            </button>

            {/* Sincronizar Preços */}
            <button
              onClick={() => handleSync(channel, "price")}
              disabled={syncState.loading}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
                isSyncing(channel, "price")
                  ? "bg-emerald-500 text-white cursor-wait"
                  : "bg-accent text-foreground hover:bg-accent/70 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSyncing(channel, "price") ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              Preços
            </button>

            {/* Importar Pedidos */}
            <button
              onClick={() => handleSync(channel, "orders")}
              disabled={syncState.loading}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
                isSyncing(channel, "orders")
                  ? "bg-amber-500 text-white cursor-wait"
                  : "bg-accent text-foreground hover:bg-accent/70 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSyncing(channel, "orders") ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="w-3.5 h-3.5" />
              )}
              Pedidos
            </button>
          </div>
        ) : (
          <a
            href={connectUrl}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              channel === "shopee"
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-yellow-400 hover:bg-yellow-500 text-slate-900"
            )}
          >
            <Wifi className="w-4 h-4" />
            Conectar {name.split(" ")[0]}
          </a>
        )}

        {/* Info do token (se conectado) */}
        {isConnected && account!.accessTokenExpiresAt && (
          <p className="text-[11px] text-muted-foreground mt-3">
            🔐 Token expira em:{" "}
            <span className="font-medium">
              {new Date(account!.accessTokenExpiresAt).toLocaleString("pt-BR")}
            </span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">Contas & Integrações</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie conexões OAuth e dispare sincronizações manuais com os marketplaces.
          </p>
        </div>
        <button
          onClick={loadAccounts}
          disabled={loading || syncState.loading}
          className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          title="Recarregar contas"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Canal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChannelCard
          account={meliAccount}
          channel="mercado_libre"
          name="Mercado Livre (API v1)"
          color="bg-yellow-400 text-slate-900"
          badge="ML"
          connectUrl={`/api/marketplaces/mercadolibre/auth?action=connect&tenantId=${tenantId}`}
        />
        <ChannelCard
          account={shopeeAccount}
          channel="shopee"
          name="Shopee (Open Platform v2)"
          color="bg-orange-500 text-white"
          badge="SH"
          connectUrl={`/api/marketplaces/shopee/auth?action=connect&tenantId=${tenantId}`}
        />
      </div>

      {/* Aviso sobre canais futuros */}
      <div className="bg-card/40 border border-dashed border-border p-5 rounded-2xl text-center text-muted-foreground space-y-1">
        <p className="text-sm font-medium">🚀 Expansão de Canais</p>
        <p className="text-xs">
          Amazon, Magalu, Americanas, Via Marketplace, MadeiraMadeira, TikTok Shop e Shein estão
          preparados na arquitetura. Ative conforme as integrações de API forem configuradas.
        </p>
      </div>
    </div>
  );
}
