"use client";

import React from "react";
import { Filter, X, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ColumnFilter } from "../utils/columnFilters";

interface FilterChipInfo {
  columnId: string;
  columnTitle: string;
  filter: ColumnFilter;
}

interface ActiveTableFiltersBarProps {
  filters: Record<string, ColumnFilter | null>;
  columnTitles: Record<string, string>;
  onRemoveFilter: (columnId: string) => void;
  onClearAll: () => void;
  totalOriginalCount: number;
  totalFilteredCount: number;
  filteredTotalAmount?: number;
  amountLabel?: string;
}

export default function ActiveTableFiltersBar({
  filters,
  columnTitles,
  onRemoveFilter,
  onClearAll,
  totalOriginalCount,
  totalFilteredCount,
  filteredTotalAmount,
  amountLabel = "Total filtrado"
}: ActiveTableFiltersBarProps) {
  // Coleta os filtros ativos
  const activeChips: FilterChipInfo[] = [];

  Object.entries(filters).forEach(([colId, filter]) => {
    if (!filter) return;
    activeChips.push({
      columnId: colId,
      columnTitle: columnTitles[colId] || colId,
      filter
    });
  });

  if (activeChips.length === 0) {
    return null;
  }

  const formatFilterDescription = (filter: ColumnFilter): string => {
    switch (filter.type) {
      case "text":
        return `contém "${filter.value}"`;
      case "date":
        if (filter.mode === "exact" && filter.exactDate) {
          const parts = filter.exactDate.split("-");
          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : filter.exactDate;
        }
        if (filter.startDate && filter.endDate) {
          const s = filter.startDate.split("-");
          const e = filter.endDate.split("-");
          const sStr = s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : filter.startDate;
          const eStr = e.length === 3 ? `${e[2]}/${e[1]}/${e[0]}` : filter.endDate;
          return `${sStr} até ${eStr}`;
        }
        if (filter.startDate) {
          const s = filter.startDate.split("-");
          return `a partir de ${s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : filter.startDate}`;
        }
        if (filter.endDate) {
          const e = filter.endDate.split("-");
          return `até ${e.length === 3 ? `${e[2]}/${e[1]}/${e[0]}` : filter.endDate}`;
        }
        return "intervalo selecionado";
      case "currency": {
        const opSymbol =
          filter.operator === "gt"
            ? ">"
            : filter.operator === "gte"
            ? ">="
            : filter.operator === "lt"
            ? "<"
            : filter.operator === "lte"
            ? "<="
            : filter.operator === "eq"
            ? "="
            : "entre";
        if (filter.operator === "between") {
          return `${formatCurrency(filter.value || 0)} e ${formatCurrency(filter.secondValue || 0)}`;
        }
        return `${opSymbol} ${formatCurrency(filter.value || 0)}`;
      }
      case "select":
        return filter.selectedValues.join(", ");
      default:
        return "ativo";
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-xl border border-primary/20 bg-primary/5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground shrink-0 mr-1">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span>Filtros ativos:</span>
        </div>

        {activeChips.map((chip) => (
          <div
            key={chip.columnId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-card/80 text-[11px] font-medium shadow-xs"
          >
            <span className="font-bold text-foreground">{chip.columnTitle}:</span>
            <span className="text-muted-foreground">{formatFilterDescription(chip.filter)}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(chip.columnId)}
              className="text-muted-foreground hover:text-destructive p-0.5 rounded-full hover:bg-muted transition-colors ml-0.5"
              title={`Remover filtro de ${chip.columnTitle}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors ml-1"
          title="Limpar todos os filtros da tabela"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Limpar todos</span>
        </button>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 font-medium">
        <span>
          Mostrando <strong className="text-foreground">{totalFilteredCount}</strong> de {totalOriginalCount} lançamentos
        </span>
        {filteredTotalAmount !== undefined && (
          <span className="border-l border-border/80 pl-3 font-mono">
            {amountLabel}: <strong className="text-foreground font-bold">{formatCurrency(filteredTotalAmount)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
