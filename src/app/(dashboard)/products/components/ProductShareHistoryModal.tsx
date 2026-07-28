"use client";

import React, { useState, useEffect } from "react";
import { Product, ShareHistoryRecord } from "@/features/products/types";
import { ShareHistoryService } from "@/services/sharing/ShareHistoryService";
import { X, RefreshCw, Calendar, History, MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProductShareHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductShareHistoryModal({
  product,
  isOpen,
  onClose,
}: ProductShareHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ShareHistoryRecord[]>([]);

  const loadHistory = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await ShareHistoryService.getHistory(product.id, 50);
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product && isOpen) {
      loadHistory();
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Histórico de Compartilhamentos</h2>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                Registros de envios da oferta: <span className="font-semibold text-foreground">{product.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listagem do Histórico */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-primary gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs text-muted-foreground">Carregando subcoleção de histórico...</span>
            </div>
          ) : history.length > 0 ? (
            history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border bg-card/50 hover:bg-accent/30 transition-colors space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary/15 text-primary tracking-wider">
                      {item.channel.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Plataforma: {item.platform || "web"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(item.sharedAt)}</span>
                  </div>
                </div>

                <p className="text-xs font-mono bg-muted/40 p-2.5 rounded-lg line-clamp-2 text-foreground/90">
                  {item.messageTemplate}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Enviado por: <strong>{item.user}</strong></span>
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Concluído com sucesso
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground italic text-xs space-y-1">
              <p>Nenhum registro de compartilhamento encontrado para esta oferta.</p>
              <p className="text-[11px]">Utilize o botão "Compartilhar" para disparar a oferta em seus canais.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Total de registros: <strong>{history.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold border border-border hover:bg-accent text-foreground transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
