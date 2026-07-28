"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getUnifiedStockDataAction,
  adjustStockAction,
  syncProductStockAction,
  getProductStockHistoryAction,
  getTenantStockConfigAction,
  updateTenantStockConfigAction,
} from "../actions";
import {
  UnifiedStockDashboardMetrics,
  StockItemSummary,
  UnifiedStockMovement,
  TenantStockConfig,
  StockSyncStatusType,
  StockMovementOrigin,
} from "@/features/integrations/types/unified-stock";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Settings,
  Clock,
  Edit3,
  Sliders,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Info,
  Box,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function StockTab({ tenantId }: { tenantId: string }) {
  const { user } = useAuth();
  const { error, success, info } = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<UnifiedStockDashboardMetrics | null>(null);
  const [summaries, setSummaries] = useState<StockItemSummary[]>([]);
  const [config, setConfig] = useState<TenantStockConfig | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockSyncStatusType | "all">("all");

  // Estado de Ações
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);

  // Modal de Ajuste
  const [adjustingProduct, setAdjustingProduct] = useState<StockItemSummary | null>(null);
  const [adjustmentNewStock, setAdjustmentNewStock] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Drawer de Histórico
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<StockItemSummary | null>(null);
  const [movements, setMovements] = useState<UnifiedStockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal de Configurações
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<Partial<TenantStockConfig>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stockRes, configRes] = await Promise.all([
        getUnifiedStockDataAction(tenantId),
        getTenantStockConfigAction(tenantId),
      ]);

      if (stockRes.success && stockRes.data) {
        setMetrics(stockRes.data.metrics);
        setSummaries(stockRes.data.summaries);
      } else if (stockRes.error) {
        error("Erro ao carregar Estoque Unificado", stockRes.error);
      }

      if (configRes.success && configRes.data) {
        setConfig(configRes.data);
        setConfigForm(configRes.data);
      }
    } catch (e: any) {
      error("Erro Crítico", e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dispara Sincronização Inteligente para um produto
  const handleSyncProduct = async (prod: StockItemSummary) => {
    setSyncingProductId(prod.productId);
    info("Sincronizando...", `Enfileirando atualização de estoque para "${prod.name}"...`);

    try {
      const res = await syncProductStockAction(tenantId, prod.productId);
      if (res.success) {
        success(
          "Estoque Sincronizado!",
          `Atualização de estoque enviada para ${res.data?.syncedChannelsCount || 0} canal(is) publicado(s).`
        );
        await loadData();
      } else {
        error("Erro na Sincronização", res.error);
      }
    } catch (e: any) {
      error("Erro na Sincronização", e.message);
    } finally {
      setSyncingProductId(null);
    }
  };

  // Abre Modal de Ajuste de Estoque
  const handleOpenAdjustModal = (prod: StockItemSummary) => {
    setAdjustingProduct(prod);
    setAdjustmentNewStock(prod.erpStock);
    setAdjustmentReason("Ajuste de inventário");
  };

  // Submete Ajuste de Estoque
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setSubmittingAdjustment(true);
    try {
      const res = await adjustStockAction(
        tenantId,
        adjustingProduct.productId,
        adjustmentNewStock,
        adjustmentReason,
        user?.uid,
        user?.email || undefined
      );

      if (res.success) {
        success("Estoque Ajustado!", `O saldo oficial do ERP foi atualizado e sincronizado.`);
        setAdjustingProduct(null);
        await loadData();
      } else {
        error("Erro ao ajustar estoque", res.error);
      }
    } catch (e: any) {
      error("Erro ao ajustar", e.message);
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Carrega e abre Histórico/Timeline
  const handleOpenHistory = async (prod: StockItemSummary) => {
    setSelectedHistoryProduct(prod);
    setLoadingHistory(true);
    try {
      const res = await getProductStockHistoryAction(tenantId, prod.productId);
      if (res.success) {
        setMovements(res.data || []);
      } else {
        error("Erro ao carregar histórico", res.error);
      }
    } catch (e: any) {
      error("Erro ao carregar histórico", e.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Salva Configurações do Tenant
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await updateTenantStockConfigAction(tenantId, configForm);
      if (res.success && res.data) {
        setConfig(res.data);
        setShowConfigModal(false);
        success("Configurações Salvas!", "Regras de estoque atualizadas com sucesso.");
      } else {
        error("Erro ao salvar regras", res.error);
      }
    } catch (e: any) {
      error("Erro ao salvar", e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Filtragem de Produtos
  const filteredSummaries = useMemo(() => {
    return summaries.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.overallStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [summaries, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-primary">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Banner Principal & Regra do ERP */}
      <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                Estoque Unificado (Single Source of Truth)
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-500/15 text-emerald-500 rounded-full">
                ERP = FONTE ÚNICA
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              O estoque do ERP é o único estoque válido. Todos os marketplaces (Shopee, Mercado Livre, Mercado Livre, etc.) refletem este saldo automaticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold transition-colors"
          >
            <Sliders className="w-4 h-4 text-primary" />
            Regras & Regras do Tenant
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Produtos ERP</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-foreground">
            {metrics?.totalErpProducts || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">{metrics?.totalKitsCount || 0} Kits cadastrados</p>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Sincronizados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-500">
            {metrics?.totalSyncedProducts || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">100% alinhados</p>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Pendentes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-amber-500">
            {metrics?.totalPendingSync || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Fila de atualização</p>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Erros de Sync</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-red-500">
            {metrics?.totalSyncErrors || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Requerem atenção</p>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Sem Pareamento</span>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-400">
            {metrics?.totalUnpairedProducts || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Somente ERP local</p>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Movimentos Hoje</span>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-blue-500">
            {metrics?.totalStockMovementsToday || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Auditoria em tempo real</p>
        </div>
      </div>

      {/* Barra de Busca e Filtros de Status */}
      <div className="bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Input de Busca */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU ou Nome do produto..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { key: "all", label: "Todos" },
            { key: "synced", label: "🟢 Sincronizados" },
            { key: "pending", label: "🟡 Pendentes" },
            { key: "error", label: "🔴 Erros" },
            { key: "unpaired", label: "⚪ Sem Pareamento" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-accent/50 hover:bg-accent text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Principal de Estoque Unificado */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-accent/40 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="p-3.5">Produto / SKU ERP</th>
                <th className="p-3.5 text-center">Estoque Oficial ERP</th>
                <th className="p-3.5">Canais & Estoque Sincronizado</th>
                <th className="p-3.5 text-center">Status Geral</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((prod) => (
                  <tr key={prod.productId} className="hover:bg-accent/20 transition-colors">
                    {/* Produto & SKU */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-accent border border-border flex items-center justify-center font-bold text-xs text-primary shrink-0">
                          {prod.isKit ? <Layers className="w-4 h-4 text-purple-500" /> : <Box className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            {prod.name}
                            {prod.isKit && (
                              <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold rounded">
                                KIT
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            SKU: {prod.sku || "N/A"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Estoque Oficial ERP (Single Source of Truth) */}
                    <td className="p-3.5 text-center font-mono">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-xl font-extrabold text-sm inline-block shadow-xs",
                          prod.erpStock <= prod.minStock
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        )}
                      >
                        {prod.erpStock} un
                      </span>
                      {prod.minStock > 0 && (
                        <span className="block text-[9px] text-muted-foreground mt-0.5">
                          Mín: {prod.minStock}
                        </span>
                      )}
                    </td>

                    {/* Canais & Estoque Sincronizado */}
                    <td className="p-3.5">
                      {prod.channels.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">
                          Apenas catálogo interno ERP
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {prod.channels.map((ch) => (
                            <span
                              key={ch.marketplaceItemId}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 border",
                                ch.channel === "shopee"
                                  ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                              )}
                              title={ch.errorMessage || `Última sync: ${ch.lastSyncAt ? new Date(ch.lastSyncAt).toLocaleString("pt-BR") : "nunca"}`}
                            >
                              <span className="uppercase text-[9px]">{ch.channel.replace("_", " ")}:</span>
                              <span className="font-extrabold">{ch.syncedStock}</span>
                              {ch.syncStatus === "synced" ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : ch.syncStatus === "error" ? (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status Geral */}
                    <td className="p-3.5 text-center">
                      {prod.overallStatus === "synced" && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 font-extrabold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Sincronizado
                        </span>
                      )}
                      {prod.overallStatus === "pending" && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 font-extrabold text-[11px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Aguardando
                        </span>
                      )}
                      {prod.overallStatus === "error" && (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-500 font-extrabold text-[11px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Erro Sync
                        </span>
                      )}
                      {prod.overallStatus === "unpaired" && (
                        <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold text-[11px] inline-flex items-center gap-1">
                          ⚪ Sem Pareamento
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleSyncProduct(prod)}
                        disabled={syncingProductId === prod.productId || prod.channels.length === 0}
                        className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs transition-colors disabled:opacity-40"
                        title="Sincronizar estoque deste produto com marketplaces"
                      >
                        <RefreshCw
                          className={cn(
                            "w-3.5 h-3.5 inline mr-1",
                            syncingProductId === prod.productId && "animate-spin"
                          )}
                        />
                        Sync
                      </button>

                      <button
                        onClick={() => handleOpenAdjustModal(prod)}
                        className="px-2.5 py-1.5 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-semibold text-xs transition-colors"
                        title="Ajustar estoque oficial no ERP"
                      >
                        <Edit3 className="w-3.5 h-3.5 inline mr-1 text-primary" />
                        Ajustar
                      </button>

                      <button
                        onClick={() => handleOpenHistory(prod)}
                        className="px-2.5 py-1.5 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-semibold text-xs transition-colors"
                        title="Ver linha do tempo imutável de movimentações"
                      >
                        <Clock className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                        Histórico
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AJUSTE DE ESTOQUE */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                Ajustar Estoque Oficial ERP
              </h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Produto</span>
                <p className="text-sm font-bold text-foreground">{adjustingProduct.name}</p>
                <span className="text-xs font-mono text-muted-foreground">SKU: {adjustingProduct.sku}</span>
              </div>

              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center text-xs">
                <span>Estoque Atual no ERP:</span>
                <span className="font-extrabold font-mono text-primary text-base">
                  {adjustingProduct.erpStock} un
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Novo Saldo Oficial (unidades)
                </label>
                <input
                  type="number"
                  min={0}
                  value={adjustmentNewStock}
                  onChange={(e) => setAdjustmentNewStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Motivo da Alteração
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs mb-2 focus:outline-none"
                >
                  <option value="Contagem de Inventário">Contagem de Inventário</option>
                  <option value="Avaria / Perda de Mercadoria">Avaria / Perda de Mercadoria</option>
                  <option value="Entrada de Fornecedor / Nota Fiscal">Entrada de Fornecedor / Nota Fiscal</option>
                  <option value="Ajuste de Saldo Inicial">Ajuste de Saldo Inicial</option>
                  <option value="Outro Motivo">Outro Motivo</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjustment}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submittingAdjustment && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar & Sincronizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL DE HISTÓRICO DE MOVIMENTAÇÕES */}
      {selectedHistoryProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-200">
          <div className="bg-card border-l border-border h-full max-w-xl w-full p-6 shadow-2xl overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Histórico Imutável de Movimentações
                </h3>
                <p className="text-xs text-muted-foreground">{selectedHistoryProduct.name}</p>
              </div>
              <button
                onClick={() => setSelectedHistoryProduct(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-primary">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs">
                Nenhuma movimentação registrada para este produto ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {movements.map((mov) => (
                  <div
                    key={mov.id}
                    className="p-3.5 rounded-xl border border-border bg-background/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                          mov.type === "in" || mov.type === "return"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-red-500/15 text-red-500"
                        )}
                      >
                        {mov.type === "out" ? "Saída (-)" : mov.type === "return" ? "Devolução (+)" : "Entrada (+)"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(mov.timestamp || mov.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">{mov.reason}</span>
                      <span
                        className={cn(
                          "font-mono font-bold text-sm",
                          mov.quantityChanged > 0 ? "text-emerald-500" : "text-red-500"
                        )}
                      >
                        {mov.quantityChanged > 0 ? `+${mov.quantityChanged}` : mov.quantityChanged} un
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
                      <span>Anterior: {mov.previousStock} un</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-bold text-foreground">Novo: {mov.newStock} un</span>
                      {mov.origin && (
                        <span className="px-1.5 py-0.2 bg-accent rounded text-[9px] uppercase font-semibold">
                          {mov.origin}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÕES DE REGRAS DO TENANT */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Regras de Estoque do Tenant
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {/* Sincronização Automática */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div>
                  <span className="font-bold text-foreground block">Sincronização Automática</span>
                  <span className="text-[11px] text-muted-foreground">
                    Sincronizar estoque automaticamente após movimentações
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.autoSyncStock ?? true}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, autoSyncStock: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
              </div>

              {/* Permitir Estoque Negativo */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div>
                  <span className="font-bold text-foreground block">Permitir Estoque Negativo</span>
                  <span className="text-[11px] text-muted-foreground">
                    Permitir baixas mesmo se o saldo for menor que zero
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.allowNegativeStock ?? false}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, allowNegativeStock: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
              </div>

              {/* Momento da Baixa */}
              <div>
                <label className="font-bold text-foreground block mb-1">Gatilho de Baixa no Marketplace</label>
                <select
                  value={configForm.deductTrigger || "paid"}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, deductTrigger: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none"
                >
                  <option value="paid">Quando Pedido for Pago (Recomendado)</option>
                  <option value="confirmed">Quando Pedido for Confirmado</option>
                  <option value="shipped">Quando Pedido for Enviado</option>
                </select>
              </div>

              {/* Estoque Mínimo de Segurança */}
              <div>
                <label className="font-bold text-foreground block mb-1">Estoque Mínimo de Segurança</label>
                <input
                  type="number"
                  min={0}
                  value={configForm.minSafetyStock ?? 0}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, minSafetyStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl font-mono text-xs focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Zera o estoque nos marketplaces quando atingir esta quantidade no ERP.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-semibold hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingConfig ? "Salvando..." : "Salvar Regras"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
