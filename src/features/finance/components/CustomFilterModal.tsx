"use client";

import React, { useState, useEffect } from "react";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { ColumnDefinition, CustomFilterGroup, FilterCondition, FilterOperator } from "../types/filters";
import { OPERATORS_BY_FIELD_TYPE } from "../utils/filterEngine";
import { Plus, Trash2, Filter, RotateCcw, Check, Calendar, DollarSign, Layers } from "lucide-react";

interface CustomFilterModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDefinition<T>[];
  filterGroup: CustomFilterGroup;
  onApplyFilters: (newGroup: CustomFilterGroup) => void;
  onClearFilters: () => void;
}

export default function CustomFilterModal<T = any>({
  isOpen,
  onClose,
  columns,
  filterGroup,
  onApplyFilters,
  onClearFilters,
}: CustomFilterModalProps<T>) {
  // Estado local para rascunho de filtros durante a edição no modal
  const [localGroup, setLocalGroup] = useState<CustomFilterGroup>(() => ({
    logicalOperator: filterGroup.logicalOperator || "AND",
    conditions: filterGroup.conditions.length > 0 ? [...filterGroup.conditions] : [],
  }));

  // Sincroniza quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setLocalGroup({
        logicalOperator: filterGroup.logicalOperator || "AND",
        conditions:
          filterGroup.conditions.length > 0
            ? filterGroup.conditions.map((c) => ({ ...c }))
            : [createInitialCondition(columns)],
      });
    }
  }, [isOpen, filterGroup, columns]);

  function createInitialCondition(cols: ColumnDefinition<T>[]): FilterCondition {
    const firstCol = cols[0] || { id: "description", type: "text" };
    const defaultOp: FilterOperator =
      firstCol.type === "number" ? "gt" : firstCol.type === "date" ? "between" : "contains";

    return {
      id: "cond_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      field: firstCol.id,
      operator: defaultOp,
      value: "",
    };
  }

  const handleAddCondition = () => {
    setLocalGroup((prev) => ({
      ...prev,
      conditions: [...prev.conditions, createInitialCondition(columns)],
    }));
  };

  const handleRemoveCondition = (id: string) => {
    setLocalGroup((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== id),
    }));
  };

  const handleFieldChange = (condId: string, newField: string) => {
    const targetCol = columns.find((c) => c.id === newField);
    const availableOps = OPERATORS_BY_FIELD_TYPE[targetCol?.type || "text"] || OPERATORS_BY_FIELD_TYPE.text;
    const defaultOp = availableOps[0]?.value || "contains";

    setLocalGroup((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === condId
          ? {
              ...c,
              field: newField,
              operator: defaultOp,
              value: targetCol?.type === "status" || targetCol?.type === "category" ? (targetCol.options?.[0]?.value || "") : "",
              secondValue: undefined,
            }
          : c
      ),
    }));
  };

  const handleOperatorChange = (condId: string, newOp: FilterOperator) => {
    setLocalGroup((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => (c.id === condId ? { ...c, operator: newOp } : c)),
    }));
  };

  const handleValueChange = (condId: string, newValue: any) => {
    setLocalGroup((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => (c.id === condId ? { ...c, value: newValue } : c)),
    }));
  };

  const handleSecondValueChange = (condId: string, newSecondValue: any) => {
    setLocalGroup((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => (c.id === condId ? { ...c, secondValue: newSecondValue } : c)),
    }));
  };

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onApplyFilters(localGroup);
    onClose();
  };

  const handleClear = () => {
    onClearFilters();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Filtros Personalizados por Coluna"
      size="xl"
    >
      <form onSubmit={handleApply} className="space-y-5 text-xs">
        {/* Combinação Lógica: E ou OU */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card/40 backdrop-blur-sm">
          <div>
            <span className="font-semibold text-foreground block text-xs">Regra de Combinação:</span>
            <span className="text-[11px] text-muted-foreground">
              Como os critérios configurados abaixo devem filtrar os lançamentos.
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setLocalGroup((prev) => ({ ...prev, logicalOperator: "AND" }))}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                localGroup.logicalOperator === "AND"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Corresponder a TODOS (E)
            </button>
            <button
              type="button"
              onClick={() => setLocalGroup((prev) => ({ ...prev, logicalOperator: "OR" }))}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                localGroup.logicalOperator === "OR"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Corresponder a QUALQUER (OU)
            </button>
          </div>
        </div>

        {/* Lista Dinâmica de Critérios */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {localGroup.conditions.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum critério adicionado ainda.</p>
              <button
                type="button"
                onClick={handleAddCondition}
                className="mt-3 inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar primeiro critério
              </button>
            </div>
          ) : (
            localGroup.conditions.map((cond, index) => {
              const currentColumn = columns.find((c) => c.id === cond.field) || columns[0];
              const operators =
                OPERATORS_BY_FIELD_TYPE[currentColumn?.type || "text"] || OPERATORS_BY_FIELD_TYPE.text;
              const currentOpMeta = operators.find((op) => op.value === cond.operator);
              const requiresSecond = currentOpMeta?.requiresSecondValue;
              const noValueNeeded = currentOpMeta?.noValue;

              return (
                <div
                  key={cond.id}
                  className="p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Critério #{index + 1}
                      {index > 0 && (
                        <span className="ml-2 text-primary font-bold">
                          [{localGroup.logicalOperator === "AND" ? "E" : "OU"}]
                        </span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(cond.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remover critério"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* 1. Coluna */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-muted-foreground block mb-1">Coluna</label>
                      <select
                        value={cond.field}
                        onChange={(e) => handleFieldChange(cond.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                      >
                        {columns.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Operador */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-muted-foreground block mb-1">Condição</label>
                      <select
                        value={cond.operator}
                        onChange={(e) => handleOperatorChange(cond.id, e.target.value as FilterOperator)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                      >
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Valor / Parâmetros */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        {noValueNeeded ? "Parâmetro" : requiresSecond ? "Intervalo (De / Até)" : "Valor"}
                      </label>

                      {noValueNeeded ? (
                        <div className="px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/30 text-[11px] text-muted-foreground italic">
                          Automático (sem valor extra)
                        </div>
                      ) : currentColumn.options && currentColumn.options.length > 0 ? (
                        // Opções fornecidas (status, categorias, fornecedores, clientes)
                        <select
                          value={cond.value || ""}
                          onChange={(e) => handleValueChange(cond.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          {currentColumn.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : currentColumn.type === "date" ? (
                        // Campo de Data
                        requiresSecond ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="date"
                              value={cond.value || ""}
                              onChange={(e) => handleValueChange(cond.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                            />
                            <input
                              type="date"
                              value={cond.secondValue || ""}
                              onChange={(e) => handleSecondValueChange(cond.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={cond.value || ""}
                            onChange={(e) => handleValueChange(cond.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                          />
                        )
                      ) : currentColumn.type === "number" ? (
                        // Campo Numérico / Moeda
                        requiresSecond ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="number"
                              step="any"
                              placeholder="Mínimo"
                              value={cond.value ?? ""}
                              onChange={(e) => handleValueChange(cond.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none font-mono"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="Máximo"
                              value={cond.secondValue ?? ""}
                              onChange={(e) => handleSecondValueChange(cond.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none font-mono"
                            />
                          </div>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            placeholder="Valor numérico..."
                            value={cond.value ?? ""}
                            onChange={(e) => handleValueChange(cond.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none font-mono"
                          />
                        )
                      ) : (
                        // Campo de Texto
                        <input
                          type="text"
                          placeholder="Termo de pesquisa..."
                          value={cond.value || ""}
                          onChange={(e) => handleValueChange(cond.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botão Adicionar Critério */}
        <button
          type="button"
          onClick={handleAddCondition}
          className="w-full py-2.5 border border-dashed border-border hover:border-primary/60 rounded-xl text-primary text-xs font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>+ Adicionar outro critério</span>
        </button>

        {/* Rodapé com Ações */}
        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar Filtros</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Aplicar Filtros</span>
              </button>
            </div>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}
