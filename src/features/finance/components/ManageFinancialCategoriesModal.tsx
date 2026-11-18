"use client";

import React, { useState } from "react";
import {
  FinancialCategory,
  createFinancialCategory,
  updateFinancialCategory,
  deleteFinancialCategory,
  FinancialDbInterface
} from "../services/financialCategoriesService";
import { FinancialTransaction } from "../types";
import { X, Plus, Edit2, Trash2, ShieldAlert, Check, Archive, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ManageFinancialCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  transactions: FinancialTransaction[];
  tenantId: string;
  initialType?: "expense" | "revenue";
  onCategoriesUpdated: (categories: FinancialCategory[]) => void;
  onSelectCategory?: (categoryId: string) => void;
  db: FinancialDbInterface;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"
];

export const ManageFinancialCategoriesModal: React.FC<ManageFinancialCategoriesModalProps> = ({
  open,
  onClose,
  categories,
  transactions,
  tenantId,
  initialType = "expense",
  onCategoriesUpdated,
  onSelectCategory,
  db
}) => {
  const [activeTab, setActiveTab] = useState<"expense" | "revenue">(initialType);

  // Formulário de Criação
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(activeTab === "revenue" ? "#10b981" : "#ef4444");
  const [isCreating, setIsCreating] = useState(false);

  // Formulário de Edição
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Estado de Exclusão Segura
  const [deletingCategory, setDeletingCategory] = useState<FinancialCategory | null>(null);
  const [linkedCount, setLinkedCount] = useState<number>(0);
  const [reclassifyToId, setReclassifyToId] = useState<string>("");
  const [deleteMode, setDeleteMode] = useState<"reclassify" | "archive">("reclassify");

  // Feedback e Loading
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!open) return null;

  const currentCategories = categories.filter(c => c.type === activeTab && c.status !== "archived");
  const otherCategoriesOfSameType = categories.filter(
    c => c.type === (deletingCategory?.type || activeTab) && c.id !== deletingCategory?.id && c.status !== "archived"
  );

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 1. Criar Categoria
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const result = await createFinancialCategory(
        tenantId,
        {
          name: newName,
          type: activeTab,
          color: newColor
        },
        categories,
        db
      );

      onCategoriesUpdated(result.categories);
      if (onSelectCategory) {
        onSelectCategory(result.created.id);
      }

      setNewName("");
      setSuccessMessage(`Categoria "${result.created.name}" cadastrada com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao cadastrar categoria.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Iniciar Edição
  const handleStartEdit = (cat: FinancialCategory) => {
    clearMessages();
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditColor(cat.color || "#64748b");
  };

  // 3. Salvar Edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    clearMessages();
    setLoading(true);

    try {
      const updatedList = await updateFinancialCategory(
        tenantId,
        editingCategory.id,
        {
          name: editName,
          color: editColor
        },
        categories,
        db
      );

      onCategoriesUpdated(updatedList);
      setEditingCategory(null);
      setSuccessMessage(`Categoria "${editName}" atualizada com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao atualizar categoria.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Iniciar Exclusão Segura
  const handlePromptDelete = (cat: FinancialCategory) => {
    clearMessages();
    const count = transactions.filter(t => t.category === cat.id).length;
    setDeletingCategory(cat);
    setLinkedCount(count);

    if (count > 0) {
      const firstAvailable = categories.find(c => c.type === cat.type && c.id !== cat.id && c.status !== "archived");
      setReclassifyToId(firstAvailable?.id || "");
      setDeleteMode("reclassify");
    }
  };

  // 5. Confirmar Exclusão / Reclassificação / Arquivamento
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    clearMessages();
    setLoading(true);

    try {
      if (linkedCount === 0) {
        // Exclusão direta sem vínculos
        const result = await deleteFinancialCategory(
          tenantId,
          deletingCategory.id,
          categories,
          transactions,
          undefined,
          db
        );
        onCategoriesUpdated(result.categories);
        setSuccessMessage(`Categoria "${deletingCategory.name}" excluída com sucesso!`);
      } else {
        // Exclusão com proteção de dados
        if (deleteMode === "archive") {
          const result = await deleteFinancialCategory(
            tenantId,
            deletingCategory.id,
            categories,
            transactions,
            { archiveInstead: true },
            db
          );
          onCategoriesUpdated(result.categories);
          setSuccessMessage(`Categoria "${deletingCategory.name}" arquivada com sucesso sem perda de histórico.`);
        } else {
          // Reclassificar
          if (!reclassifyToId) {
            throw new Error("Selecione uma categoria de destino para reclassificar os lançamentos.");
          }
          const result = await deleteFinancialCategory(
            tenantId,
            deletingCategory.id,
            categories,
            transactions,
            { reclassifyToId },
            db
          );
          onCategoriesUpdated(result.categories);
          setSuccessMessage(
            `Categoria excluída e ${result.reclassifiedCount} ${result.reclassifiedCount === 1 ? "lançamento foi reclassificado" : "lançamentos foram reclassificados"} com sucesso!`
          );
        }
      }

      setDeletingCategory(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao processar exclusão da categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Gerenciador de Categorias Financeiras</h3>
              <p className="text-[10px] text-muted-foreground">Cadastre, edite e personalize categorias de receitas e despesas.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alternador de Tipo (Receita vs Despesa) */}
        <div className="p-3 bg-muted/20 border-b border-border flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("expense");
              setNewColor("#ef4444");
              clearMessages();
            }}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === "expense"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>Despesas (Saídas)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("revenue");
              setNewColor("#10b981");
              clearMessages();
            }}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === "revenue"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Receitas (Entradas)</span>
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Formulário de Criação / Edição */}
          {editingCategory ? (
            <form onSubmit={handleSaveEdit} className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-primary">Editar Categoria: {editingCategory.name}</span>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  Cancelar Edição
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Aluguel Sala Comercial"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Cor de Destaque</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border transition-all",
                        editColor === c ? "ring-2 ring-primary ring-offset-2 scale-110" : "border-transparent opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <span className="font-bold text-xs text-foreground block">
                + Nova Categoria de {activeTab === "expense" ? "Despesa" : "Receita"}
              </span>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={activeTab === "expense" ? "Ex: Frete, Embalagens, Aluguel..." : "Ex: Venda de Produtos, Serviços..."}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Cor de Destaque</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border transition-all",
                        newColor === c ? "ring-2 ring-primary ring-offset-2 scale-110" : "border-transparent opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading || !newName.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{loading ? "Cadastrando..." : "Cadastrar Categoria"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Lista de Categorias Cadastradas */}
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground block">
              Categorias de {activeTab === "expense" ? "Despesa" : "Receita"} ({currentCategories.length})
            </span>

            <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
              {currentCategories.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground text-xs">
                  Nenhuma categoria cadastrada para este tipo.
                </p>
              ) : (
                currentCategories.map(cat => {
                  const count = transactions.filter(t => t.category === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color || "#64748b" }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs">{cat.name}</span>
                            {cat.isSystem && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] bg-muted text-muted-foreground font-mono">
                                Padrão
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {count} {count === 1 ? "lançamento vinculado" : "lançamentos vinculados"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Editar nome ou cor da categoria"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePromptDelete(cat)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir ou arquivar categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Secundário de Proteção de Dados na Exclusão */}
        {deletingCategory && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-destructive/40 rounded-2xl shadow-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-destructive">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <h4 className="font-bold text-sm">
                  {linkedCount > 0 ? "Proteção de Lançamentos Vinculados" : "Confirmar Exclusão"}
                </h4>
              </div>

              {linkedCount === 0 ? (
                <p className="text-xs text-foreground leading-relaxed">
                  Tem certeza que deseja excluir permanentemente a categoria <strong>&quot;{deletingCategory.name}&quot;</strong>? Nenhum lançamento financeiro está vinculado a ela.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-foreground leading-relaxed">
                    A categoria <strong>&quot;{deletingCategory.name}&quot;</strong> possui{" "}
                    <span className="font-bold text-destructive">{linkedCount}</span>{" "}
                    {linkedCount === 1 ? "lançamento financeiro vinculado" : "lançamentos financeiros vinculados"}.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Para manter a integridade contábil do ERP sem apagar dados históricos, escolha como deseja proceder:
                  </p>

                  <div className="space-y-2 pt-1">
                    <label className={cn(
                      "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                      deleteMode === "reclassify" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"
                    )}>
                      <input
                        type="radio"
                        name="deleteMode"
                        checked={deleteMode === "reclassify"}
                        onChange={() => setDeleteMode("reclassify")}
                        className="mt-0.5 text-primary"
                      />
                      <div className="space-y-1">
                        <span className="font-bold text-foreground block">Reclassificar lançamentos para outra categoria</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Os {linkedCount} lançamentos serão transferidos para a categoria escolhida e a categoria antiga será removida.
                        </span>
                        {deleteMode === "reclassify" && (
                          <select
                            value={reclassifyToId}
                            onChange={(e) => setReclassifyToId(e.target.value)}
                            className="mt-2 w-full px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground"
                          >
                            {otherCategoriesOfSameType.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                      deleteMode === "archive" ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted/20"
                    )}>
                      <input
                        type="radio"
                        name="deleteMode"
                        checked={deleteMode === "archive"}
                        onChange={() => setDeleteMode("archive")}
                        className="mt-0.5 text-amber-500"
                      />
                      <div className="space-y-1">
                        <span className="font-bold text-foreground block">Arquivar categoria (Recomendado)</span>
                        <span className="text-[10px] text-muted-foreground block">
                          A categoria não aparecerá para novos lançamentos, mas preservará 100% dos lançamentos históricos existentes intactos.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setDeletingCategory(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50"
                >
                  {loading ? "Processando..." : linkedCount === 0 ? "Excluir Categoria" : deleteMode === "archive" ? "Arquivar Categoria" : "Reclassificar e Excluir"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
