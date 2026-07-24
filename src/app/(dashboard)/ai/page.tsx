"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import {
  Brain,
  Trash2,
  Copy,
  RefreshCw,
  Check,
  Send,
  Zap,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  Box,
  DollarSign,
  ShieldCheck,
  CalendarCheck,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { AccountsReceivable, AccountsPayable } from "@/features/finance/types";
import { MarketplaceAccount } from "@/features/integrations/types/marketplaces";
import { calculateStrategicMetrics, generateDailyExecutiveSummary, BusinessHealthMetrics, StrategicRecommendation } from "@/services/aiStrategicEngine";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actionPending?: any;
  planPending?: any;
}

export default function AIStrategicPage() {
  const { user } = useAuth();
  const { success, info, warning } = useToast();
  const { getDocs, createDoc } = useDb();
  const tenantId = (user as any)?.tenantId || "default_tenant";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ERP Context Data
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [marketplaces, setMarketplaces] = useState<MarketplaceAccount[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Strategic Engine States
  const [metrics, setMetrics] = useState<BusinessHealthMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<StrategicRecommendation[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>("");

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
      setIsDataLoaded(true);
    } catch (e) {
      console.error("Erro ao carregar contexto do ERP para a IA:", e);
    }
  }, [getDocs]);

  useEffect(() => {
    loadERPData();
  }, [loadERPData]);

  // Run Strategic Engine when data is loaded
  useEffect(() => {
    if (!isDataLoaded) return;

    const contextParams = {
      companyName: (user as any)?.displayName || "Carol Ramos Collection ERP",
      products,
      sales,
      customers,
      receivables,
      payables,
      marketplaces
    };

    const { metrics: calcMetrics, recommendations: calcRecs } = calculateStrategicMetrics(contextParams);
    setMetrics(calcMetrics);
    setRecommendations(calcRecs);
    setExecutiveSummary(generateDailyExecutiveSummary(contextParams));
  }, [isDataLoaded, products, sales, customers, receivables, payables, marketplaces, user]);

  // Initialize Chat History
  useEffect(() => {
    if (!isDataLoaded) return;
    const saved = localStorage.getItem(`ai_chat_history_${tenantId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao ler histórico da IA:", e);
      }
    } else {
      if (executiveSummary) {
        setMessages([
          {
            id: "welcome-1",
            sender: "ai",
            text: executiveSummary,
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    }
  }, [tenantId, isDataLoaded, executiveSummary]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
            companyName: (user as any)?.displayName || "Carol Ramos Collection ERP",
            products,
            sales,
            customers,
            receivables,
            payables,
            marketplaces
          },
          memories: [] // Future extension for ai_memory context injection
        })
      });

      const data = await response.json();
      const aiReplyText = data.response || "Não foi possível gerar uma resposta analítica no momento.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        actionPending: data.actionPending,
        planPending: data.planPending
      };

      saveChatHistory([...updated, aiMsg]);

      // Save interaction to memory
      await createDoc("ai_memory", {
        prompt: queryText,
        response: aiReplyText,
        category: "operational_chat",
        tenantId,
        userId: user?.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro na comunicação com o Co-Piloto IA:", error);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Instabilidade na conexão com o motor estratégico da IA.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      saveChatHistory([...updated, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, actionData: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Executar ação confirmada",
          context: {
            tenantId,
            userId: user?.uid,
            companyName: (user as any)?.displayName || "Carol Ramos Collection ERP",
            products, sales, customers, receivables, payables, marketplaces
          },
          memories: [],
          confirmedToolCall: actionData
        })
      });

      const data = await response.json();
      const aiReplyText = data.response || "Ação executada com sucesso.";

      // Remove a pendência da mensagem original para não mostrar os botões novamente
      const updatedMessages = messages.map(m => m.id === msgId ? { ...m, actionPending: undefined } : m);
      
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      saveChatHistory([...updatedMessages, aiMsg]);
      success("Executado", "Ação concluída pelo Agente IA.");
    } catch (error) {
      console.error("Erro na confirmação da ação:", error);
      warning("Erro", "Não foi possível confirmar a ação.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPlan = async (msgId: string, planData: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Executar plano confirmado",
          context: {
            tenantId,
            userId: user?.uid,
            companyName: (user as any)?.displayName || "Carol Ramos Collection ERP",
            products, sales, customers, receivables, payables, marketplaces
          },
          memories: [],
          confirmedPlan: planData
        })
      });

      const data = await response.json();
      const aiReplyText = data.response || "Plano executado com sucesso.";

      // Remove a pendência do plano original
      const updatedMessages = messages.map(m => m.id === msgId ? { ...m, planPending: undefined } : m);
      
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      saveChatHistory([...updatedMessages, aiMsg]);
      success("Plano Executado", "O plano de execução foi concluído.");
    } catch (error) {
      console.error("Erro na confirmação do plano:", error);
      warning("Erro", "Não foi possível confirmar o plano.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (rec: StrategicRecommendation) => {
    if (!window.confirm(`Encontrei esta oportunidade: "${rec.title}". Deseja executar a ação recomendada: "${rec.suggestion}"?`)) {
      return;
    }

    try {
      if (rec.actionType === "create_reminder") {
        await createDoc("reminders", {
          ...rec.actionPayload,
          tenantId,
          status: "pending",
          dueDate: new Date(Date.now() + 86400000).toISOString() // amanhã
        });
        success("Ação Executada", "Lembrete criado com sucesso.");
      } else if (rec.actionType === "create_alert") {
        await createDoc("notifications", {
          ...rec.actionPayload,
          tenantId,
          read: false,
          type: "ai_alert"
        });
        success("Ação Executada", "Alerta registrado no sistema.");
      }

      // Log the action
      await createDoc("ai_action_logs", {
        tenantId,
        userId: user?.uid,
        action: rec.actionType,
        confirmed: true,
        payload: rec.actionPayload,
        executedAt: new Date().toISOString()
      });

      // Remove executed recommendation locally to refresh UI
      setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
    } catch (e) {
      console.error("Erro ao executar ação da IA:", e);
      warning("Erro na Execução", "Não foi possível completar a ação automática.");
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success("Copiado!", "Texto copiado para a área de transferência.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm("Deseja limpar a conversa atual?")) {
      localStorage.removeItem(`ai_chat_history_${tenantId}`);
      if (executiveSummary) {
        setMessages([
          {
            id: "welcome-1",
            sender: "ai",
            text: executiveSummary,
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        setMessages([]);
      }
      info("Histórico limpo", "Conversa reiniciada.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl text-primary border border-primary/20">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Agente Inteligente ERP
              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary font-semibold rounded-md border border-primary/20">
                Strategic Engine v1.0
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise preditiva, recomendações acionáveis e execução de tarefas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadERPData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recalcular Dados
          </button>
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-red-500/10 hover:text-red-500 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Conversa
          </button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-emerald-500" /> Saúde do Negócio
            </span>
            <div className="pt-1 flex items-baseline gap-2">
              <p className={cn("text-2xl font-bold", metrics.healthScore >= 70 ? "text-emerald-500" : metrics.healthScore >= 40 ? "text-amber-500" : "text-red-500")}>
                {metrics.healthScore}/100
              </p>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-500" /> Risco Financeiro
            </span>
            <div className="pt-1">
              <p className={cn("text-xl font-bold", metrics.cashFlowRisk === "LOW" ? "text-emerald-500" : metrics.cashFlowRisk === "MEDIUM" ? "text-amber-500" : "text-red-500")}>
                {metrics.cashFlowRisk === "LOW" ? "BAIXO RISCO" : metrics.cashFlowRisk === "MEDIUM" ? "ATENÇÃO" : "CRÍTICO"}
              </p>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1.5">
              <Box className="w-4 h-4 text-blue-500" /> Cobertura de Estoque
            </span>
            <div className="pt-1">
              <p className="text-2xl font-bold text-foreground">
                ~{metrics.inventoryCoverageDays} dias
              </p>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-md p-5 rounded-2xl border border-border space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-500" /> Canal Destaque
            </span>
            <div className="pt-1">
              <p className="text-lg font-bold text-foreground truncate">
                {metrics.topPerformingChannel}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Ações & Recomendações */}
        <div className="space-y-4 lg:col-span-1">
          {recommendations.length > 0 && (
            <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                Recomendações Práticas da IA
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="p-4 bg-accent/40 rounded-xl border border-border space-y-2">
                    <h4 className="font-semibold text-sm text-foreground flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {rec.title}
                    </h4>
                    <p className="text-xs text-muted-foreground"><strong>Análise:</strong> {rec.problem}</p>
                    <p className="text-xs text-muted-foreground"><strong>Ação Sugerida:</strong> {rec.suggestion}</p>
                    {rec.actionable && (
                      <button
                        onClick={() => handleExecuteAction(rec)}
                        className="mt-2 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Executar Sugestão
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border space-y-3">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Perguntas Inteligentes Rápidas
            </h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSendMessage("Cadastre um cliente chamado João Silva (joao@teste.com)")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors"
              >
                👥 Cadastrar Cliente
              </button>
              <button
                onClick={() => handleSendMessage("Crie uma conta a pagar de Aluguel no valor de 1500 reais para o dia 30.")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors"
              >
                💸 Criar Despesa
              </button>
              <button
                onClick={() => handleSendMessage("Sincronizar meus produtos com a Shopee.")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors"
              >
                🛍 Sincronizar Shopee
              </button>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border space-y-3">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Perguntas Inteligentes Rápidas
            </h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSendMessage("Se mantiver o ritmo atual, qual a previsão de faturamento para este mês?")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors"
              >
                📊 Previsão de Faturamento
              </button>
              <button
                onClick={() => handleSendMessage("Quais clientes são VIPs e quais estão inativos há mais de 30 dias?")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors"
              >
                👥 Análise de Clientes
              </button>
              <button
                onClick={() => handleSendMessage("Quais produtos críticos preciso comprar imediatamente considerando o giro de estoque?")}
                className="text-left p-2.5 bg-accent/30 hover:bg-primary/10 hover:text-primary rounded-xl text-xs transition-colors"
              >
                📦 Reposição Prioritária
              </button>
            </div>
          </div>
        </div>

        {/* Chat Principal */}
        <div className="lg:col-span-2 flex flex-col h-[650px] bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col space-y-1 max-w-[90%]", m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start")}
              >
                <div
                  className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed relative group shadow-sm",
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card border border-border text-foreground rounded-tl-none prose prose-sm dark:prose-invert prose-p:leading-snug prose-li:my-0.5"
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  
                  {/* Tool Confirmation Card */}
                  {m.actionPending && (
                    <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                      <div className="flex items-center gap-2 text-amber-500 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        Confirmação de Ação: {m.actionPending.name}
                      </div>
                      <div className="text-xs text-muted-foreground bg-black/20 p-2 rounded-lg font-mono overflow-x-auto">
                        {JSON.stringify(m.actionPending.parameters, null, 2)}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleConfirmAction(m.id, m.actionPending)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Autorizar Execução
                        </button>
                        <button
                          onClick={() => setMessages(messages.map(msg => msg.id === m.id ? { ...msg, actionPending: undefined } : msg))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Plan Confirmation Card */}
                  {m.planPending && (
                    <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                      <div className="flex items-center gap-2 text-blue-500 font-semibold">
                        <Brain className="w-4 h-4" />
                        Plano de Execução Gerado
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <p className="font-medium text-foreground">Objetivo: {m.planPending.objective}</p>
                        <ul className="space-y-2">
                          {m.planPending.steps.map((step: any, idx: number) => (
                            <li key={step.id} className="flex items-start gap-2 bg-black/10 p-2 rounded-lg">
                              <span className="font-mono font-bold">{idx + 1}.</span>
                              <div>
                                <p className="font-semibold">{step.intent}</p>
                                <p className="text-[10px] opacity-70 mt-0.5">Ferramenta: {step.toolName}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleConfirmPlan(m.id, m.planPending)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Autorizar Plano Completo
                        </button>
                        <button
                          onClick={() => setMessages(messages.map(msg => msg.id === m.id ? { ...msg, planPending: undefined } : msg))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                      </div>
                    </div>
                  )}

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
            {loading && (
              <div className="mr-auto flex items-center gap-2 p-3 bg-card border border-border rounded-2xl text-xs text-muted-foreground">
                <Brain className="w-4 h-4 animate-spin text-primary" />
                <span>O Agente Estratégico está avaliando as métricas e formulando o cenário...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-background/50 border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Peça uma previsão, análise ou execução de tarefa..."
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
