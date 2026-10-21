"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Check,
  RotateCcw,
  Calendar,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ColumnSortState,
  ColumnFilter,
  TextFilter,
  DateFilter,
  CurrencyFilter,
  SelectFilter
} from "../utils/columnFilters";

interface SelectOption {
  value: string;
  label: string;
}

interface TableColumnHeaderProps {
  title: string;
  columnId: string;
  align?: "left" | "right" | "center";
  className?: string;
  sortable?: boolean;
  currentSort?: ColumnSortState | null;
  onSortChange?: (newSort: ColumnSortState | null) => void;
  filterable?: boolean;
  filterType?: "text" | "date" | "currency" | "select" | "status";
  currentFilter?: ColumnFilter | null;
  onFilterChange?: (newFilter: ColumnFilter | null) => void;
  selectOptions?: SelectOption[];
  popoverAlign?: "left" | "right";
}

export default function TableColumnHeader({
  title,
  columnId,
  align = "left",
  className,
  sortable = true,
  currentSort,
  onSortChange,
  filterable = true,
  filterType = "text",
  currentFilter,
  onFilterChange,
  selectOptions = [],
  popoverAlign = "left"
}: TableColumnHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados locais para rascunho de filtro enquanto o popover está aberto
  const [textValue, setTextValue] = useState("");
  const [textMode, setTextMode] = useState<"contains" | "exact" | "starts_with">("contains");

  const [dateMode, setDateMode] = useState<"range" | "exact">("range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exactDate, setExactDate] = useState("");

  const [currencyOp, setCurrencyOp] = useState<"gt" | "gte" | "lt" | "lte" | "eq" | "between">("gt");
  const [currencyVal, setCurrencyVal] = useState<string>("");
  const [currencyVal2, setCurrencyVal2] = useState<string>("");

  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  // Sincroniza rascunho com o filtro atual quando o popover é aberto
  useEffect(() => {
    if (!isOpen) return;

    if (!currentFilter) {
      setTextValue("");
      setTextMode("contains");
      setDateMode("range");
      setStartDate("");
      setEndDate("");
      setExactDate("");
      setCurrencyOp("gt");
      setCurrencyVal("");
      setCurrencyVal2("");
      setSelectedValues([]);
      return;
    }

    if (currentFilter.type === "text") {
      setTextValue(currentFilter.value || "");
      setTextMode(currentFilter.mode || "contains");
    } else if (currentFilter.type === "date") {
      setDateMode(currentFilter.mode || "range");
      setStartDate(currentFilter.startDate || "");
      setEndDate(currentFilter.endDate || "");
      setExactDate(currentFilter.exactDate || "");
    } else if (currentFilter.type === "currency") {
      setCurrencyOp(currentFilter.operator || "gt");
      setCurrencyVal(currentFilter.value !== undefined ? String(currentFilter.value) : "");
      setCurrencyVal2(currentFilter.secondValue !== undefined ? String(currentFilter.secondValue) : "");
    } else if (currentFilter.type === "select") {
      setSelectedValues([...(currentFilter.selectedValues || [])]);
    }
  }, [isOpen, currentFilter]);

  // Fecha o popover ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Alterna a ordenação: neutro -> asc -> desc -> neutro
  const handleSortClick = () => {
    if (!sortable || !onSortChange) return;

    if (!currentSort || currentSort.column !== columnId) {
      onSortChange({ column: columnId, direction: "asc" });
    } else if (currentSort.direction === "asc") {
      onSortChange({ column: columnId, direction: "desc" });
    } else {
      onSortChange(null);
    }
  };

  const isCurrentSort = currentSort?.column === columnId;
  const isSortAsc = isCurrentSort && currentSort?.direction === "asc";
  const isSortDesc = isCurrentSort && currentSort?.direction === "desc";

  const isFilterActive = Boolean(currentFilter);

  // Aplica o filtro atual conforme o tipo
  const handleApply = () => {
    if (!onFilterChange) return;

    if (filterType === "text") {
      if (!textValue.trim()) {
        onFilterChange(null);
      } else {
        onFilterChange({
          type: "text",
          value: textValue.trim(),
          mode: textMode
        });
      }
    } else if (filterType === "date") {
      if (dateMode === "exact") {
        if (!exactDate) {
          onFilterChange(null);
        } else {
          onFilterChange({
            type: "date",
            mode: "exact",
            exactDate
          });
        }
      } else {
        if (!startDate && !endDate) {
          onFilterChange(null);
        } else {
          onFilterChange({
            type: "date",
            mode: "range",
            startDate: startDate || undefined,
            endDate: endDate || undefined
          });
        }
      }
    } else if (filterType === "currency") {
      const v1 = parseFloat(currencyVal.replace(",", "."));
      const v2 = parseFloat(currencyVal2.replace(",", "."));
      if (isNaN(v1)) {
        onFilterChange(null);
      } else {
        onFilterChange({
          type: "currency",
          operator: currencyOp,
          value: v1,
          secondValue: currencyOp === "between" && !isNaN(v2) ? v2 : undefined
        });
      }
    } else if (filterType === "select" || filterType === "status") {
      if (selectedValues.length === 0) {
        onFilterChange(null);
      } else {
        onFilterChange({
          type: "select",
          selectedValues
        });
      }
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    if (onFilterChange) {
      onFilterChange(null);
    }
    setIsOpen(false);
  };

  const toggleSelectValue = (val: string) => {
    setSelectedValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  return (
    <th
      className={cn(
        "p-4 relative text-xs font-semibold select-none group",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
        )}
      >
        {/* Título da Coluna & Botão de Ordenação */}
        {sortable ? (
          <button
            type="button"
            onClick={handleSortClick}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5 -mx-1",
              isCurrentSort
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={`Ordenar por ${title} (${
              isSortAsc ? "Crescente ativo - clique para decrescente" : isSortDesc ? "Decrescente ativo - clique para padrão" : "Clique para ordenar"
            })`}
          >
            <span>{title}</span>
            <span className="shrink-0">
              {isSortAsc ? (
                <ArrowUp className="h-3.5 w-3.5 text-primary" />
              ) : isSortDesc ? (
                <ArrowDown className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-75 transition-opacity" />
              )}
            </span>
          </button>
        ) : (
          <span className="text-muted-foreground">{title}</span>
        )}

        {/* Botão de Filtro da Coluna */}
        {filterable && (
          <div ref={containerRef} className="relative inline-block text-left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen((prev) => !prev);
              }}
              className={cn(
                "p-1 rounded-md transition-all focus:outline-none focus:ring-1 focus:ring-primary/40 relative",
                isFilterActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-xs"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
              )}
              title={isFilterActive ? `Filtro ativo em ${title} (clique para ver/alterar)` : `Filtrar por ${title}`}
            >
              <Filter className={cn("h-3 w-3", isFilterActive && "fill-primary/20")} />
              {isFilterActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>

            {/* Menu Popover Flutuante de Filtro */}
            {isOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "absolute top-full mt-2 z-50 w-72 rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-4 shadow-2xl text-foreground text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150",
                  popoverAlign === "right" || align === "right" ? "right-0" : "left-0"
                )}
              >
                {/* Header do Popover */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span>Filtrar {title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Conteúdo específico por tipo de dado */}
                {filterType === "text" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40 text-[10px]">
                      {(["contains", "starts_with", "exact"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTextMode(mode)}
                          className={cn(
                            "flex-1 py-1 px-1.5 rounded-md font-semibold transition-all text-center",
                            textMode === mode
                              ? "bg-card text-foreground shadow-xs border border-border/50"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {mode === "contains" ? "Contém" : mode === "starts_with" ? "Começa" : "Exato"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApply();
                      }}
                      placeholder={`Pesquisar ${title.toLowerCase()}...`}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-card placeholder-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>
                )}

                {filterType === "date" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDateMode("range")}
                        className={cn(
                          "flex-1 py-1 px-1.5 rounded-md font-semibold transition-all text-center",
                          dateMode === "range"
                            ? "bg-card text-foreground shadow-xs border border-border/50"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Período / Intervalo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateMode("exact")}
                        className={cn(
                          "flex-1 py-1 px-1.5 rounded-md font-semibold transition-all text-center",
                          dateMode === "exact"
                            ? "bg-card text-foreground shadow-xs border border-border/50"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Data Específica
                      </button>
                    </div>

                    {dateMode === "range" ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            A partir de (Data inicial):
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Até (Data final):
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          Data exata:
                        </label>
                        <input
                          type="date"
                          value={exactDate}
                          onChange={(e) => setExactDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    )}
                  </div>
                )}

                {filterType === "currency" && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        Condição:
                      </label>
                      <select
                        value={currencyOp}
                        onChange={(e) => setCurrencyOp(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium"
                      >
                        <option value="gt">Maior que (&gt;)</option>
                        <option value="gte">Maior ou igual (&gt;=)</option>
                        <option value="lt">Menor que (&lt;)</option>
                        <option value="lte">Menor ou igual (&lt;=)</option>
                        <option value="eq">Igual a (=)</option>
                        <option value="between">Entre dois valores</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        {currencyOp === "between" ? "Valor mínimo (R$):" : "Valor (R$):"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        placeholder="0,00"
                        value={currencyVal}
                        onChange={(e) => setCurrencyVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleApply();
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>

                    {currencyOp === "between" && (
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          Valor máximo (R$):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={currencyVal2}
                          onChange={(e) => setCurrencyVal2(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleApply();
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(filterType === "select" || filterType === "status") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pb-1 border-b border-border/40">
                      <span>Selecione uma ou mais opções:</span>
                      {selectedValues.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedValues([])}
                          className="text-primary hover:underline"
                        >
                          Desmarcar todas
                        </button>
                      )}
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                      {selectOptions.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground py-2 text-center">
                          Nenhuma opção disponível.
                        </p>
                      ) : (
                        selectOptions.map((opt) => {
                          const isChecked = selectedValues.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs",
                                isChecked
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-muted/50 text-foreground"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectValue(opt.value)}
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                              />
                              <span className="truncate flex-1">{opt.label}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Rodapé com botões de ação */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!isFilterActive}
                    className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Limpar</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/95 transition-all shadow-xs"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}
