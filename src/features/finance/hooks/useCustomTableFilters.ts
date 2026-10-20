"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDefinition, CustomFilterGroup } from "../types/filters";
import { applyCustomFilters } from "../utils/filterEngine";

interface UseCustomTableFiltersOptions<T> {
  storageKey: string;
  columns: ColumnDefinition<T>[];
  items: T[];
  onPageReset?: () => void;
  getAmountFn?: (item: T) => number;
}

export function useCustomTableFilters<T = any>({
  storageKey,
  columns,
  items,
  onPageReset,
  getAmountFn,
}: UseCustomTableFiltersOptions<T>) {
  // 1. Estado de Filtros Personalizados
  const [filterGroup, setFilterGroup] = useState<CustomFilterGroup>({
    logicalOperator: "AND",
    conditions: [],
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCustomizeColumnsModalOpen, setIsCustomizeColumnsModalOpen] = useState(false);

  // 2. Estado de Colunas (visibilidade e ordem)
  const defaultColumnIds = useMemo(
    () => columns.filter((c) => c.defaultVisible !== false).map((c) => c.id),
    [columns]
  );
  const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns]);

  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(defaultColumnIds);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);

  // Carrega preferências do localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`custom_cols_${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.visible)) {
          // Garante que colunas alwaysVisible permaneçam
          const always = columns.filter((c) => c.alwaysVisible).map((c) => c.id);
          const combined = Array.from(new Set([...parsed.visible, ...always]));
          setVisibleColumnIds(combined);
        }
        if (Array.isArray(parsed.order)) {
          setColumnOrder(parsed.order);
        }
      }
    } catch {
      // fallback para default
    }
  }, [storageKey, columns]);

  // Salva preferências no localStorage
  const savePreferences = useCallback(
    (newVisible: string[], newOrder: string[]) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(
          `custom_cols_${storageKey}`,
          JSON.stringify({ visible: newVisible, order: newOrder })
        );
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const toggleColumn = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id);
      if (col?.alwaysVisible) return;

      setVisibleColumnIds((prev) => {
        const next = prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id];
        savePreferences(next, columnOrder);
        return next;
      });
    },
    [columns, columnOrder, savePreferences]
  );

  const moveColumn = useCallback(
    (index: number, direction: "up" | "down") => {
      setColumnOrder((prev) => {
        const next = [...prev];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return prev;

        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;

        savePreferences(visibleColumnIds, next);
        return next;
      });
    },
    [visibleColumnIds, savePreferences]
  );

  const resetColumnDefaults = useCallback(() => {
    setVisibleColumnIds(defaultColumnIds);
    setColumnOrder(defaultOrder);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`custom_cols_${storageKey}`);
      } catch {
        // ignore
      }
    }
  }, [defaultColumnIds, defaultOrder, storageKey]);

  // 3. Aplicação dos Filtros
  const filteredItems = useMemo(() => {
    return applyCustomFilters(items, filterGroup, columns);
  }, [items, filterGroup, columns]);

  // Reset de página sempre que os filtros mudarem
  const applyFilters = useCallback(
    (newGroup: CustomFilterGroup) => {
      setFilterGroup(newGroup);
      if (onPageReset) onPageReset();
    },
    [onPageReset]
  );

  const removeCondition = useCallback(
    (conditionId: string) => {
      setFilterGroup((prev) => ({
        ...prev,
        conditions: prev.conditions.filter((c) => c.id !== conditionId),
      }));
      if (onPageReset) onPageReset();
    },
    [onPageReset]
  );

  const clearFilters = useCallback(() => {
    setFilterGroup({
      logicalOperator: "AND",
      conditions: [],
    });
    if (onPageReset) onPageReset();
  }, [onPageReset]);

  // Total monetário dos registros filtrados
  const filteredTotalAmount = useMemo(() => {
    if (!getAmountFn) return undefined;
    return filteredItems.reduce((acc, item) => acc + (getAmountFn(item) || 0), 0);
  }, [filteredItems, getAmountFn]);

  return {
    filterGroup,
    filteredItems,
    visibleColumnIds,
    columnOrder,
    isFilterModalOpen,
    isCustomizeColumnsModalOpen,
    setIsFilterModalOpen,
    setIsCustomizeColumnsModalOpen,
    applyFilters,
    removeCondition,
    clearFilters,
    toggleColumn,
    moveColumn,
    resetColumnDefaults,
    filteredTotalAmount,
  };
}
