"use client";

import React from "react";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { ColumnDefinition } from "../types/filters";
import { Sliders, ArrowUp, ArrowDown, RotateCcw, Check, Eye, EyeOff } from "lucide-react";

interface CustomizeColumnsModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDefinition<T>[];
  visibleColumnIds: string[];
  columnOrder: string[];
  onToggleColumn: (id: string) => void;
  onMoveColumn: (index: number, direction: "up" | "down") => void;
  onResetDefaults: () => void;
}

export default function CustomizeColumnsModal<T = any>({
  isOpen,
  onClose,
  columns,
  visibleColumnIds,
  columnOrder,
  onToggleColumn,
  onMoveColumn,
  onResetDefaults,
}: CustomizeColumnsModalProps<T>) {
  // Ordena as colunas conforme columnOrder
  const orderedColumns = React.useMemo(() => {
    const map = new Map(columns.map((c) => [c.id, c]));
    const result: ColumnDefinition<T>[] = [];

    columnOrder.forEach((id) => {
      const col = map.get(id);
      if (col) {
        result.push(col);
        map.delete(id);
      }
    });

    // Adiciona quaisquer colunas remanescentes
    map.forEach((col) => result.push(col));
    return result;
  }, [columns, columnOrder]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Personalizar Colunas da Tabela"
      size="md"
    >
      <div className="space-y-4 text-xs">
        <p className="text-muted-foreground text-[11px]">
          Escolha quais colunas deseja exibir e reordene-as de acordo com a sua preferência de visualização. As alterações são salvas automaticamente no seu navegador.
        </p>

        <div className="divide-y divide-border/60 border border-border rounded-xl bg-card/40 overflow-hidden max-h-[380px] overflow-y-auto">
          {orderedColumns.map((col, idx) => {
            const isVisible = visibleColumnIds.includes(col.id);
            const isAlwaysVisible = col.alwaysVisible;

            return (
              <div
                key={col.id}
                className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isAlwaysVisible}
                    onClick={() => onToggleColumn(col.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isVisible
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                    } ${isAlwaysVisible ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    title={isAlwaysVisible ? "Coluna obrigatória" : isVisible ? "Ocultar coluna" : "Exibir coluna"}
                  >
                    {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>

                  <div>
                    <span className="font-semibold text-foreground block">{col.label}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Tipo: {col.type === "number" ? "Moeda/Número" : col.type === "date" ? "Data" : col.type === "status" ? "Status" : "Texto"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveColumn(idx, "up")}
                    className="p-1.5 rounded-lg border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover para cima"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === orderedColumns.length - 1}
                    onClick={() => onMoveColumn(idx, "down")}
                    className="p-1.5 rounded-lg border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Concluir</span>
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
