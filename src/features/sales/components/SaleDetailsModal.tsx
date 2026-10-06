import React from "react";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  History
} from "lucide-react";

interface SaleDetailsModalProps {
  sale: Sale | null;
  customers: Customer[];
  onClose: () => void;
  onEdit?: (sale: Sale) => void;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  customers,
  onClose,
  onEdit
}) => {
  if (!sale) return null;

  const customer = customers.find(c => c.id === sale.customerId);
  const isCancelled = sale.status === "cancelled";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              isCancelled 
                ? "bg-red-500/10 text-red-500" 
                : "bg-emerald-500/10 text-emerald-500"
            }`}>
              {isCancelled ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Venda #{sale.id.slice(0, 8)}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  isCancelled
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}>
                  {isCancelled ? "Cancelada" : "Concluída"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(sale.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          
          {/* Alerta de Cancelamento */}
          {isCancelled && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1 text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>Venda Cancelada</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-foreground">Motivo:</strong> {sale.cancellationReason || "Não informado"}
              </p>
              {sale.cancelledAt && (
                <p className="text-[10px] text-muted-foreground">
                  Cancelada em: {new Date(sale.cancelledAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Cliente</span>
                <p className="font-semibold text-foreground text-sm">
                  {customer ? customer.name : "Cliente Não Identificado (Balcão)"}
                </p>
                {customer?.email && (
                  <p className="text-[11px] text-muted-foreground">{customer.email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canal</span>
              <p className="font-semibold text-foreground uppercase">{sale.channel || "PDV"}</p>
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Itens da Venda ({sale.items.length})</span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/40 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-center">Qtd</th>
                    <th className="p-2.5 text-right">Unitário</th>
                    <th className="p-2.5 text-right">Desconto</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs">
                  {sale.items.map((item, idx) => {
                    const lineTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
                    return (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-2.5 font-medium text-foreground">
                          {item.name}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 text-right font-mono text-muted-foreground">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-red-500">
                          {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "-"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo Financeiro & Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Método de Pagamento */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Forma de Pagamento</span>
              </div>
              <p className="text-sm font-semibold uppercase text-foreground">
                {sale.paymentMethod === "credit_card" && "Cartão de Crédito"}
                {sale.paymentMethod === "debit_card" && "Cartão de Débito"}
                {sale.paymentMethod === "pix" && "PIX Instantâneo"}
                {sale.paymentMethod === "cash" && "Dinheiro"}
                {sale.paymentMethod === "term" && "Crediário / A Prazo"}
                {sale.paymentMethod === "split" && "Pagamento Misto"}
              </p>
              {sale.paymentDetails?.installments && sale.paymentDetails.installments > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Parcelado em {sale.paymentDetails.installments}x
                </p>
              )}
              {sale.cashRegisterId && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  Sessão de Caixa: #{sale.cashRegisterId.slice(0, 8)}
                </p>
              )}
            </div>

            {/* Totais */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-red-500 text-xs">
                  <span>Desconto Global</span>
                  <span className="font-mono">-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-foreground font-bold text-sm pt-2 border-t border-border">
                <span>Total da Venda</span>
                <span className="font-mono text-primary">{formatCurrency(sale.total)}</span>
              </div>
            </div>

          </div>

          {/* Histórico de Edições */}
          {sale.editHistory && sale.editHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <History className="h-4 w-4 text-amber-500" />
                <span>Histórico de Modificações ({sale.editHistory.length})</span>
              </div>
              <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden bg-card">
                {sale.editHistory.map((h, i) => (
                  <div key={i} className="p-2.5 text-[11px] flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground">
                        {new Date(h.editedAt).toLocaleString("pt-BR")}
                      </span>
                      {h.reason && (
                        <p className="text-foreground italic">{h.reason}</p>
                      )}
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-muted-foreground line-through mr-2">
                        {formatCurrency(h.previousTotal)}
                      </span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(h.newTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center gap-3">
          <button
            onClick={() => alert("Impressão do cupom térmico simulada.")}
            className="px-3.5 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Cupom</span>
          </button>

          <div className="flex gap-2">
            {!isCancelled && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(sale);
                }}
                className="px-4 py-2 border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl text-xs font-semibold transition-colors"
              >
                Editar Venda
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
