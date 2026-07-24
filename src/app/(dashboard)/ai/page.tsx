"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import {
  Sparkles,
  Send,
  Brain,
  Trash2,
  Copy,
  RefreshCw,
  Check,
  AlertCircle,
  TrendingUp,
  Box,
  Users,
  DollarSign,
  Globe,
  Lightbulb,
  Zap,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { AccountsReceivable, AccountsPayable } from "@/features/finance/types";
import { MarketplaceAccount } from "@/features/integrations/types/marketplaces";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export default function AIPage() {
  const { user } = useAuth();
  const { toast, success, info } = useToast();
  const { getDocs, createDoc } = useDb();
  const tenantId = (user as any)?.tenantId || "default_tenant";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real-time ERP Context Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [marketplaces, setMarketplaces] = useState<MarketplaceAccount[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadERPData = useCallback(async () => {
    try {
      const [prods, sls, custs, recs, pays, mkts] = await Promise.all([
        getDocs("products"),
        getDocs("sales"),
        getDocs("customers"),
        getDocs("accounts_receivable"),
        getDocs("accounts_payable"),
        getDocs("marketplace_accounts")
      ]);
      setProducts((prods as Product[]) || []);
      setSales((sls as Sale[]) || []);
      setCustomers((custs as Customer[]) || []);
      setReceivables((recs as AccountsReceivable[]) || []);
      setPayables((pays as AccountsPayable[]) || []);
      setMarketplaces((mkts as MarketplaceAccount[]) || []);
    } catch (e) {
      console.error("Erro ao carregar contexto do ERP para a IA:", e);
    }
  }, [getDocs]);

  useEffect(() => {
    loadERPData();

    // Carrega histórico de mensagens salvo no localStorage
    const saved = localStorage.getItem(`ai_chat_history_${tenantId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao ler histórico da IA:", e);
      }
    } else {
      // Mensagem inicial de boas-vindas do Co-Piloto
      setMessages([
        {
          id: "welcome-1",
          sender: "ai",
          text: `### 🤖 Olá! Sou seu Co-Piloto Inteligente de Gestão Empresarial.
          
Analisei os dados em tempo real da sua empresa. Estou pronto para fornecer **diagnósticos de estoque, faturamento, conciliação de pagamentos, estratégias para marketplaces e ações comerciais**.

Como posso ajudar sua tomada de decisão hoje?`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  }, [tenantId, loadERPData]);

  // Auto-scroll suave para o final do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Salvar no localStorage
  const saveChatHistory = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    localStorage.setItem(`ai_chat_history_${tenantId}`, JSON.stringify(newMsgs));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    const updated = [...messages, userMsg];
    saveChatHistory(updated);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: queryText,
          context: {
            companyName: "Carol Ramos Collection ERP",
            products,
            sales,
            customers,
            receivables,
            payables,
            marketplaces
          }
        })
      });

      const data = await response.json();
      const aiReplyText = data.response || "Não foi possível gerar uma resposta analítica no momento.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      saveChatHistory([...updated, aiMsg]);

      // Registra a conversa na memória da IA (`ai_memory`)
      await createDoc("ai_memory", {
        prompt: queryText,
        response: aiReplyText,
        category: "operational_chat",
        tenantId
      });
    } catch (error) {
      console.error("Erro na comunicação com o Co-Piloto IA:", error);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Ocorreu uma instabilidade na conexão com o servidor analítico da IA. Por favor, tente novamente.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      saveChatHistory([...updated, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success("Copiado!", "Texto copiado para a área de transferência.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm("Deseja realmente limpar todo o histórico da conversa?")) {
      localStorage.removeItem(`ai_chat_history_${tenantId}`);
      setMessages([]);
      info("Histórico limpo", "Conversa reiniciada com o Co-Piloto.");
    }
  };

  // Cálculo de estatísticas para a área de Inteligência Diária
  const lowStockCount = products.filter((p) => (p.currentStock || 0) <= 5).length;
  const pendingReceivablesTotal = receivables.filter((r) => r.status === "pending").reduce((a, r) => a + (r.amount || 0), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-16">
      {/* Header com Visual Co-Piloto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl text-primary border border-primary/20">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Co-Piloto IA de Gestão
              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary font-semibold rounded-md border border-primary/20">
                Gemini 1.5 Flash
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Inteligência operacional integrada ao estoque, financeiro, vendas e marketplaces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-red-500/10 hover:text-red-500 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Conversa
          </button>
        </div>
      </div>

      {/* Grid: Widgets de Inteligência Diária + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel Lateral: Inteligência Diária & Ações Rápidas */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Inteligência Diária
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-accent/40 rounded-xl border border-border space-y-1">
                <span className="text-muted-foreground font-medium">Estoque Crítico</span>
                <p className="font-bold text-foreground">{lowStockCount} produtos precisando de reposição</p>
              </div>

              <div className="p-3 bg-accent/40 rounded-xl border border-border space-y-1">
                <span className="text-muted-foreground font-medium">Contas a Receber</span>
                <p className="font-bold text-emerald-500">R$ {pendingReceivablesTotal.toFixed(2)} pendentes</p>
              </div>

              <div className="p-3 bg-accent/40 rounded-xl border border-border space-y-1">
                <span className="text-muted-foreground font-medium">Canais Conectados</span>
                <p className="font-bold text-foreground">{marketplaces.length} marketplaces ativos</p>
              </div>
            </div>
          </div>

          {/* Chips de Consultas Analíticas */}
          <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border space-y-3">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Análises Rápidas
            </h4>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSendMessage("Quais produtos estão com estoque crítico e precisam de reposição urgente?")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors flex items-center justify-between"
              >
                <span>📦 Reposição de Estoque</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleSendMessage("Qual é o meu faturamento de hoje e saldo projetado de contas a pagar?")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors flex items-center justify-between"
              >
                <span>💰 Análise Financeira</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleSendMessage("Como está a performance dos marketplaces Shopee e Mercado Livre?")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors flex items-center justify-between"
              >
                <span>🛍️ Diagnóstico Marketplaces</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Principal */}
        <div className="lg:col-span-3 flex flex-col h-[650px] bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
          {/* Conversa */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col space-y-1 max-w-[85%]", m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start")}
              >
                <div
                  className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed relative group shadow-sm",
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyText(m.id, m.text)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/50 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    title="Copiar texto"
                  >
                    {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground px-1">{m.timestamp}</span>
              </div>
            ))}

            {/* Bouncing Thinking dots */}
            {loading && (
              <div className="mr-auto flex items-center gap-2 p-3 bg-card border border-border rounded-2xl text-xs text-muted-foreground">
                <Brain className="w-4 h-4 animate-spin text-primary" />
                <span>Analisando dados do ERP em tempo real...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form de envio */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-background/50 border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Pergunte sobre estoque, financeiro, vendas ou marketplaces..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-card border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
