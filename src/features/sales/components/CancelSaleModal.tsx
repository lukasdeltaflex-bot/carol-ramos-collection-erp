import React, { useState } from "react";
import { Sale } from "@/features/sales/types";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle,
  RotateCcw,
  X,
  Package,
  DollarSign,
  UserCheck
} from "lucide-react";

interface CancelSaleModalProps {
  sale: Sale | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
}

export const CancelSaleModal: React.FC<CancelSaleModalProps> = ({
  sale,
  onClose,
  onConfirm,
  loading
}) => {
  const [reason, setReason] = useState("");

  if (!sale) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
  };

  const totalItemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-red-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Cancelar Venda
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Ref #{sale.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 space-y-2">
            <p className="font-semibold text-xs leading-relaxed">
              Esta ação é definitiva e irá reconciliar todos os impactos da venda:
            </p>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground list-disc pl-4">
              <li>
                <strong className="text-foreground">Estorno de Estoque:</strong> As {totalItemsCount} unidades dos produtos vendidos retornarão imediatamente ao estoque disponível.
              </li>
              <li>
                <strong className="text-foreground">Financeiro:</strong> O lançamento de receita ({formatCurrency(sale.total)}) ou as parcelas a receber vinculadas serão canceladas.
              </li>
              {sale.customerId && (
                <li>
                  <strong className="text-foreground">Métricas do Cliente:</strong> O histórico de compras e ticket do cliente serão recalculados.
                </li>
              )}
            </ul>
          </div>

          {/* Resumo dos Itens que retornarão ao estoque */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span>Itens que retornarão ao estoque</span>
            </label>
            <div className="max-h-28 overflow-y-auto border border-border rounded-xl p-2.5 bg-muted/20 space-y-1 font-mono text-[11px]">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-muted-foreground">
                  <span className="truncate max-w-[200px] text-foreground font-sans">{item.name}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                    +{item.quantity} un.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Campo Motivo */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
              Motivo do Cancelamento (Obrigatório)
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Desistência do cliente, erro no lançamento de quantidade, cliente não passou o cartão..."
              className="w-full p-3 rounded-xl border border-border bg-card/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none text-xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{loading ? "Cancelando..." : "Confirmar Estorno"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
