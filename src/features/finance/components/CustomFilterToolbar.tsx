"use client";

import React from "react";
import { Filter, Sliders, X, RotateCcw } from "lucide-react";
import { ColumnDefinition, CustomFilterGroup } from "../types/filters";
import { formatCurrency } from "@/lib/utils";

interface CustomFilterToolbarProps<T = any> {
  columns: ColumnDefinition<T>[];
  filterGroup: CustomFilterGroup;
  onOpenFilterModal: () => void;
  onOpenCustomizeColumnsModal: () => void;
  onRemoveCondition: (conditionId: string) => void;
  onClearFilters: () => void;
  totalOriginalCount: number;
  totalFilteredCount: number;
  filteredTotalAmount?: number;
  currencyLabel?: string;
}

export default function CustomFilterToolbar<T = any>({
  columns,
  filterGroup,
  onOpenFilterModal,
  onOpenCustomizeColumnsModal,
  onRemoveCondition,
  onClearFilters,
  totalOriginalCount,
  totalFilteredCount,
  filteredTotalAmount,
  currencyLabel = "Total Filtrado",
}: CustomFilterToolbarProps<T>) {
  // Filtra apenas condições válidas com valor
  const activeConditions = React.useMemo(() => {
    return (filterGroup?.conditions || []).filter((cond) => {
      if (!cond.field) return false;
      if (
        cond.operator === "is_filled" ||
        cond.operator === "is_empty" ||
        cond.operator === "last_7_days" ||
        cond.operator === "last_30_days" ||
        cond.operator === "this_month" ||
        cond.operator === "last_month"
      ) {
        return true;
      }
      return cond.value !== null && cond.value !== undefined && cond.value !== "";
    });
  }, [filterGroup]);

  const activeCount = activeConditions.length;

  const getConditionLabel = (cond: (typeof activeConditions)[0]) => {
    const col = columns.find((c) => c.id === cond.field);
    const colName = col?.label || cond.field;

    let opText = cond.operator as string;
    switch (cond.operator) {
      case "contains":
        opText = "contém";
        break;
      case "not_contains":
        opText = "não contém";
        break;
      case "equals":
        opText = "=";
        break;
      case "not_equals":
        opText = "≠";
        break;
      case "starts_with":
        opText = "começa com";
        break;
      case "is_filled":
        return `${colName}: Preenchido`;
      case "is_empty":
        return `${colName}: Vazio`;
      case "eq":
        opText = "=";
        break;
      case "neq":
        opText = "≠";
        break;
      case "gt":
        opText = ">";
        break;
      case "gte":
        opText = "≥";
        break;
      case "lt":
        opText = "<";
        break;
      case "lte":
        opText = "≤";
        break;
      case "between":
        return `${colName}: ${cond.value} até ${cond.secondValue || "fim"}`;
      case "last_7_days":
        return `${colName}: Últimos 7 dias`;
      case "last_30_days":
        return `${colName}: Últimos 30 dias`;
      case "this_month":
        return `${colName}: Este mês`;
      case "last_month":
        return `${colName}: Mês anterior`;
      case "before":
        opText = "antes de";
        break;
      case "after":
        opText = "depois de";
        break;
      case "in":
        opText = "em";
        break;
    }

    let valText = cond.value;
    if (col?.options) {
      const opt = col.options.find((o) => o.value === cond.value);
      if (opt) valText = opt.label;
    } else if (col?.type === "number" && typeof cond.value === "number") {
      valText = formatCurrency(cond.value);
    }

    return `${colName} ${opText} "${valText}"`;
  };

  return (
    <div className="space-y-2.5">
      {/* Botões de Ação */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Filtrar Colunas */}
          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeCount > 0
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>🔎 Filtrar colunas</span>
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-primary-foreground text-primary font-extrabold">
                {activeCount}
              </span>
            )}
          </button>

          {/* Botão Personalizar Colunas */}
          <button
            type="button"
            onClick={onOpenCustomizeColumnsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>⚙️ Personalizar colunas</span>
          </button>
        </div>

        {/* Resumo de Contagem e Total Financeiro Filtrado */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          {activeCount > 0 ? (
            <>
              <span className="bg-muted/40 px-2 py-0.5 rounded border border-border">
                {totalFilteredCount} de {totalOriginalCount} registros
              </span>
              {filteredTotalAmount !== undefined && (
                <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold">
                  {currencyLabel}: {formatCurrency(filteredTotalAmount)}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/70">
              Total: {totalOriginalCount} registros
            </span>
          )}
        </div>
      </div>

      {/* Chips de Filtros Ativos */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-primary/20 bg-primary/5 text-xs animate-in fade-in duration-200">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider px-1">
            Filtros ativos ({filterGroup.logicalOperator === "AND" ? "E" : "OU"}):
          </span>

          {activeConditions.map((cond) => (
            <span
              key={cond.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] text-foreground font-medium shadow-xs"
            >
              <span>{getConditionLabel(cond)}</span>
              <button
                type="button"
                onClick={() => onRemoveCondition(cond.id)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                title="Remover este critério"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-destructive font-semibold ml-auto transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Limpar todos
          </button>
        </div>
      )}
    </div>
  );
}
