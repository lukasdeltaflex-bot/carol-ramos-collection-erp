"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { Marketplace, DEFAULT_MARKETPLACES } from "../types";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  Percent,
  DollarSign,
  Check,
  CheckCircle2,
  RefreshCw,
  Search,
  Tag
} from "lucide-react";

export default function MarketplacesManager() {
  const { getDocs, createDoc, updateDoc, deleteDoc } = useDb();
  const { success, error: toastError } = useToast();

  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>("");
  const [percentFee, setPercentFee] = useState<number>(15);
  const [fixedFee, setFixedFee] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [color, setColor] = useState<string>("bg-orange-500 text-white");
  const [status, setStatus] = useState<'active' | 'inactive'>("active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const COLOR_OPTIONS = [
    { label: "Laranja (Shopee)", value: "bg-orange-500 text-white" },
    { label: "Amarelo (Mercado Livre)", value: "bg-yellow-400 text-black" },
    { label: "Âmbar (Amazon)", value: "bg-amber-600 text-white" },
    { label: "Azul (Magalu)", value: "bg-blue-600 text-white" },
    { label: "Preto (Shein)", value: "bg-neutral-900 text-white" },
    { label: "Rosa (TikTok)", value: "bg-pink-600 text-white" },
    { label: "Verde (Loja Física)", value: "bg-emerald-600 text-white" },
    { label: "Roxo (Site)", value: "bg-purple-600 text-white" }
  ];

  const loadMarketplaces = async () => {
    setLoading(true);
    try {
      let docs = await getDocs("marketplaces");
      if (docs.length === 0) {
        // Pre-seed default marketplaces
        await Promise.all(DEFAULT_MARKETPLACES.map(m => createDoc("marketplaces", m)));
        docs = await getDocs("marketplaces");
      }
      setMarketplaces(docs as Marketplace[]);
    } catch (err: any) {
      console.error("Erro ao carregar marketplaces:", err);
      toastError("Erro ao carregar", "Não foi possível buscar a lista de marketplaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaces();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setPercentFee(15);
    setFixedFee(0);
    setDescription("");
    setColor("bg-orange-500 text-white");
    setStatus("active");
    setErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (mkt: Marketplace) => {
    setEditingId(mkt.id);
    setName(mkt.name);
    setPercentFee(mkt.percentFee);
    setFixedFee(mkt.fixedFee);
    setDescription(mkt.description || "");
    setColor(mkt.color || "bg-primary text-white");
    setStatus(mkt.status);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Nome do marketplace é obrigatório." });
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        percentFee: Math.max(0, percentFee || 0),
        fixedFee: Math.max(0, fixedFee || 0),
        description: description.trim(),
        color,
        status,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc("marketplaces", editingId, payload);
        success("Marketplace atualizado", `As taxas de "${name}" foram salvas.`);
      } else {
        await createDoc("marketplaces", {
          ...payload,
          createdAt: new Date().toISOString()
        });
        success("Marketplace criado", `Marketplace "${name}" cadastrado com sucesso.`);
      }

      setModalOpen(false);
      loadMarketplaces();
    } catch (err: any) {
      console.error("Erro ao salvar marketplace:", err);
      toastError("Erro ao salvar", "Ocorreu um erro ao salvar as taxas do marketplace.");
    }
  };

  const handleDelete = async (id: string, mktName: string) => {
    if (!confirm(`Deseja realmente excluir o marketplace "${mktName}"?`)) return;
    try {
      await deleteDoc("marketplaces", id);
      success("Marketplace excluído", `O marketplace "${mktName}" foi removido.`);
      loadMarketplaces();
    } catch (err: any) {
      console.error("Erro ao excluir marketplace:", err);
      toastError("Erro ao excluir", "Não foi possível excluir o marketplace.");
    }
  };

  const filteredMarketplaces = marketplaces.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Cadastro de Marketplaces & Taxas Padrão
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure a taxa percentual e taxa fixa praticadas por cada canal de venda.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Marketplace</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar marketplace..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Grid of Marketplaces */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 rounded-2xl border border-border bg-card/40 animate-pulse p-4" />
          ))}
        </div>
      ) : filteredMarketplaces.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-border bg-card/40 text-muted-foreground space-y-2">
          <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-xs font-semibold">Nenhum marketplace encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredMarketplaces.map(mkt => (
            <div
              key={mkt.id}
              className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl flex flex-col justify-between hover:border-primary/30 transition-all shadow-sm group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={cn("px-2.5 py-1 rounded-xl text-xs font-extrabold shadow-sm truncate", mkt.color || "bg-primary text-primary-foreground")}>
                    {mkt.name}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(mkt)}
                      title="Editar taxas"
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mkt.id, mkt.name)}
                      title="Excluir"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Taxa Percentual:</span>
                    <span className="font-bold text-foreground">{mkt.percentFee}%</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Taxa Fixa:</span>
                    <span className="font-bold text-foreground">{formatCurrency(mkt.fixedFee)}</span>
                  </div>
                </div>

                {mkt.description && (
                  <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2 italic">
                    "{mkt.description}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", mkt.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                  {mkt.status === "active" ? "Ativo" : "Inativo"}
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(mkt)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Criar / Editar Marketplace */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar Marketplace" : "Novo Marketplace"}
        subtitle="Configure as taxas cobradas por este canal de vendas."
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nome do Marketplace *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Shopee, Mercado Livre, Magalu"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.name && <span className="text-[10px] text-red-500 mt-1 block">{errors.name}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Taxa Percentual (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={percentFee}
                  onChange={e => setPercentFee(parseFloat(e.target.value) || 0)}
                  placeholder="15"
                  className="w-full pr-7 pl-3 py-2 rounded-xl border border-border bg-background font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Taxa Fixa (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">R$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={fixedFee}
                  onChange={e => setFixedFee(parseFloat(e.target.value) || 0)}
                  placeholder="4.00"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Cor do Badge / Identificador Visual
            </label>
            <select
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {COLOR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observações / Categoria (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Válido para anúncios na categoria de moda e beleza"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Status do Canal
            </label>
            <button
              type="button"
              onClick={() => setStatus(status === "active" ? "inactive" : "active")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
                status === "active"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              <span className={cn("h-3 w-3 rounded-full", status === "active" ? "bg-emerald-500" : "bg-muted-foreground")} />
              {status === "active" ? "Canal Ativo" : "Canal Inativo"}
            </button>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 shadow-md shadow-primary/20"
            >
              Salvar Marketplace
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
