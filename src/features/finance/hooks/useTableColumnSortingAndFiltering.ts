"use client";

import { useState, useMemo } from "react";
import {
  ColumnSortState,
  ColumnFilter,
  parseDateToMillis,
  matchText,
  matchDate,
  matchCurrency,
  matchSelect
} from "../utils/columnFilters";

export interface ColumnConfig<T> {
  id: string;
  type: "text" | "date" | "currency" | "select" | "status";
  getValue: (item: T) => any;
}

interface UseTableColumnSortingAndFilteringOptions<T> {
  items: T[];
  columns: ColumnConfig<T>[];
  searchQuery?: string;
  searchFields?: Array<(item: T) => string>;
  itemsPerPage?: number;
}

export function useTableColumnSortingAndFiltering<T>({
  items,
  columns,
  searchQuery = "",
  searchFields = [],
  itemsPerPage = 12
}: UseTableColumnSortingAndFilteringOptions<T>) {
  const [sortConfig, setSortConfig] = useState<ColumnSortState | null>(null);
  const [filters, setFilters] = useState<Record<string, ColumnFilter | null>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Mapa de colunas para lookup rápido
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnConfig<T>>();
    columns.forEach((col) => map.set(col.id, col));
    return map;
  }, [columns]);

  // Define ou atualiza o filtro de uma coluna específica
  const setColumnFilter = (columnId: string, filter: ColumnFilter | null) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!filter) {
        delete next[columnId];
      } else {
        next[columnId] = filter;
      }
      return next;
    });
    setCurrentPage(1);
  };

  // Remove o filtro de uma coluna
  const clearColumnFilter = (columnId: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
    setCurrentPage(1);
  };

  // Limpa todos os filtros da tabela
  const clearAllFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Alterna ou define ordenação
  const handleSortChange = (newSort: ColumnSortState | null) => {
    setSortConfig(newSort);
    setCurrentPage(1);
  };

  // 1. Filtragem dos itens (Busca textual geral + Filtros individuais de coluna combinados com E)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1.1 Busca textual geral (se informada)
      if (searchQuery.trim() && searchFields.length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = searchFields.some((getField) => {
          const val = String(getField(item) || "").toLowerCase();
          return val.includes(query);
        });
        if (!matchesQuery) return false;
      }

      // 1.2 Filtros de cada coluna (combinação lógica E)
      for (const [colId, filter] of Object.entries(filters)) {
        if (!filter) continue;
        const colDef = columnMap.get(colId);
        if (!colDef) continue;

        const rawValue = colDef.getValue(item);

        if (filter.type === "text") {
          if (!matchText(rawValue, filter)) return false;
        } else if (filter.type === "date") {
          if (!matchDate(rawValue, filter)) return false;
        } else if (filter.type === "currency") {
          if (!matchCurrency(rawValue, filter)) return false;
        } else if (filter.type === "select") {
          if (!matchSelect(rawValue, filter)) return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, searchFields, filters, columnMap]);

  // 2. Ordenação dos itens filtrados
  const sortedItems = useMemo(() => {
    if (!sortConfig) return filteredItems;

    const colDef = columnMap.get(sortConfig.column);
    if (!colDef) return filteredItems;

    const multiplier = sortConfig.direction === "asc" ? 1 : -1;

    return [...filteredItems].sort((a, b) => {
      const valA = colDef.getValue(a);
      const valB = colDef.getValue(b);

      // Ordenação de Datas
      if (colDef.type === "date") {
        const timeA = parseDateToMillis(valA);
        const timeB = parseDateToMillis(valB);

        if (timeA === null && timeB === null) return 0;
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        return (timeA - timeB) * multiplier;
      }

      // Ordenação Numérica / Moeda
      if (colDef.type === "currency") {
        const numA = typeof valA === "number" ? valA : parseFloat(String(valA || 0).replace(",", "."));
        const numB = typeof valB === "number" ? valB : parseFloat(String(valB || 0).replace(",", "."));
        return (numA - numB) * multiplier;
      }

      // Ordenação de Texto / Status / Select
      const strA = String(valA || "").trim();
      const strB = String(valB || "").trim();
      return strA.localeCompare(strB, "pt-BR", { sensitivity: "base", numeric: true }) * multiplier;
    });
  }, [filteredItems, sortConfig, columnMap]);

  // 3. Paginação sobre os dados já filtrados e ordenados
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(start, start + itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

  const hasActiveFilters = Object.values(filters).some((f) => f !== null);

  return {
    sortConfig,
    filters,
    currentPage,
    setCurrentPage,
    totalPages,
    hasActiveFilters,
    filteredItems,
    sortedItems,
    paginatedItems,
    totalOriginalCount: items.length,
    totalFilteredCount: sortedItems.length,
    setColumnFilter,
    clearColumnFilter,
    clearAllFilters,
    handleSortChange
  };
}
