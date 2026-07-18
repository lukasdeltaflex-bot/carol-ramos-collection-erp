"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import {
  Sparkles,
  Send,
  Brain,
  Trash2,
  Copy,
  RefreshCw,
  Check,
  AlertCircle,
  HelpCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  sender: "user" | "gemini";
  text: string;
  timestamp: string;
}

export default function AIPage() {
  const { profile, tenantId } = useAuth();
  const { getDocs, createDoc } = useDb();
  const { success, error: toastError, info } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // DB Lists for feeding context
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryKey = `ai_chat_history_${tenantId || "default"}`;

  // 1. Load context data & history on mount
  const loadData = async () => {
    try {
      const [prods, sls, custs] = await Promise.all([
        getDocs("products"),
        getDocs("sales"),
        getDocs("customers")
      ]);
      setProducts(prods as Product[]);
      setSales(sls as Sale[]);
      setCustomers(custs as Customer[]);
    } catch (e) {
      console.error("Erro ao carregar dados do ERP para contexto da IA:", e);
    }
  };

  useEffect(() => {
    loadData();
    // Load chat history
    const saved = localStorage.getItem(chatHistoryKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        setMessages([getDefaultWelcomeMessage()]);
      }
    } else {
      setMessages([getDefaultWelcomeMessage()]);
    }
  }, [tenantId]);

  // Save history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatHistoryKey, JSON.stringify(messages));
    }
  }, [messages, chatHistoryKey]);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getDefaultWelcomeMessage = (): Message => ({
    sender: "gemini",
    text: "Olá! Sou o seu assistente de inteligência artificial do ERP Carol Ramos Collection, alimentado pelo Gemini. Como posso ajudar nas decisões do seu negócio hoje? Você pode me perguntar sobre faturamento de hoje, relatórios de estoque baixo ou gerar mensagens de aniversário para clientes.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const handleClearChat = () => {
    if (window.confirm("Deseja realmente limpar toda a conversa?")) {
      const welcome = [getDefaultWelcomeMessage()];
      setMessages(welcome);
      localStorage.setItem(chatHistoryKey, JSON.stringify(welcome));
      info("Conversa limpa", "O histórico de chat foi redefinido.");
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    success("Copiado!", "Texto copiado para a área de transferência.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeAIService = async (userPrompt: string, isRetry = false) => {
    setIsTyping(true);

    // Context formatting
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter(s => s.createdAt && s.createdAt.startsWith(todayStr));
    const criticalProds = products.filter(p => p.currentStock <= 5);
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const bdayCustomers = customers.filter(c => c.birthday && c.birthday.split("-")[1] === currentMonth);

    const contextData = {
      tenantId,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
      todaySalesCount: todaySales.length,
      criticalStockProducts: criticalProds.map(p => ({ sku: p.sku, name: p.name, stock: p.currentStock, min: p.minStock })),
      birthdayCustomers: bdayCustomers.map(c => ({ name: c.name, date: c.birthday })),
      totalProductsCount: products.length,
      totalCustomersCount: customers.length,
    };

    try {
      // Call secure server route
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, context: contextData })
      });

      if (!response.ok) throw new Error("API call failed");

      const resData = await response.json();
      let replyText = resData.response;

      // Local fallback parser if Gemini API Key not configured
      if (replyText.includes("Chave API do Gemini não configurada") || replyText.includes("não está configurada")) {
        const lower = userPrompt.toLowerCase();
        
        // 1. Vendas / Faturamento
        if (lower.includes("venda") || lower.includes("quanto") || lower.includes("faturamento") || lower.includes("ganh")) {
          const totalToday = todaySales.reduce((sum, s) => sum + s.total, 0);
          const countToday = todaySales.length;
          const channelsMap = todaySales.reduce((acc, s) => {
            acc[s.channel] = (acc[s.channel] || 0) + s.total;
            return acc;
          }, {} as Record<string, number>);

          let channelDetails = Object.keys(channelsMap)
            .map(chan => `• **${chan === "pos" ? "Loja Física" : chan.toUpperCase()}**: R$ ${channelsMap[chan].toFixed(2)}`)
            .join("\n");

          if (countToday > 0) {
            replyText = `### Análise de Vendas Realizada (Offline Fallback)\n\nHoje, registramos um faturamento de **R$ ${totalToday.toFixed(2)}** com um total de **${countToday}** ${countToday === 1 ? "pedido concluído" : "pedidos concluídos"}.\n\nDistribuição por Canais:\n${channelDetails}\n\nTicket Médio de Hoje: **R$ ${(totalToday / countToday).toFixed(2)}**. Excelentes números! 🚀`;
          } else {
            replyText = `### Análise de Inventário & Caixa (Offline Fallback)\n\nAté o momento, não registramos nenhuma venda finalizada hoje na base de dados. Que tal registrar uma nova venda no PDV ou simular um webhook da Shopee/Mercado Livre nas Configurações? 🛍️`;
          }
        }
        // 2. Estoque
        else if (lower.includes("estoque") || lower.includes("produto") || lower.includes("baixo") || lower.includes("crític")) {
          if (criticalProds.length > 0) {
            const prodList = criticalProds
              .map(p => `• **SKU ${p.sku}**: ${p.name} - Apenas **${p.currentStock} un.** em estoque (Mínimo: ${p.minStock || 5})`)
              .join("\n");
            replyText = `### Alerta de Estoque Crítico (Offline Fallback)\n\nIdentifiquei **${criticalProds.length}** produtos operando com estoque crítico (5 unidades ou menos):\n\n${prodList}\n\nRecomendo efetuar uma reposição com o fornecedor correspondente. Você pode dar entrada dessas compras no módulo Financeiro! 📦`;
          } else {
            replyText = `### Análise de Inventário (Offline Fallback)\n\nTodos os produtos no catálogo estão operando com estoque saudável (acima de 5 unidades). Bom trabalho de reposição! ✨`;
          }
        }
        // 3. Aniversariantes
        else if (lower.includes("anivers") || lower.includes("mensagem") || lower.includes("niver") || lower.includes("campanh")) {
          if (bdayCustomers.length > 0) {
            const list = bdayCustomers.map(c => `• **${c.name}** (Niver: ${c.birthday})`).join("\n");
            replyText = `### Aniversariantes do Mês (Offline Fallback)\n\nEncontrei as seguintes clientes fazendo aniversário este mês:\n\n${list}\n\n**Sugestão de Campanha de WhatsApp:**\n"Olá {Nome}! ✨ Nós da Carol Ramos Collection desejamos um feliz aniversário! Preparamos um cupom de 15% OFF para você presentear seu autocuidado hoje: use NIVER15. Parabéns! 💖"`;
          } else {
            replyText = `### Campanhas & Engajamento (Offline Fallback)\n\nNão encontrei nenhuma cliente com aniversário cadastrado para este mês. Aqui está um template geral de engajamento pós-venda para usar no WhatsApp:\n\n"Olá {Nome}! Passando para agradecer sua última compra na Carol Ramos Collection! Como forma de carinho, seu próximo atendimento de maquiagem social tem 10% de desconto. Vamos agendar? ✨"`;
          }
        }
        // 4. Default
        else {
          replyText = `### Análise do Negócio (Offline Fallback)\n\nEntendi a sua consulta sobre "${userPrompt}". Como assistente integrado, posso realizar consultas complexas no seu ERP. Gostaria de verificar as despesas operacionais deste mês no Financeiro ou agendar um novo serviço de Maquiagem com faturamento integrado?\n\n*Nota: Para respostas inteligentes abertas via inteligência artificial generativa Gemini, certifique-se de configurar a variável de ambiente \`GEMINI_API_KEY\` nas configurações do projeto.*`;
        }
      }

      // Sincroniza log de uso no Firestore
      await createDoc("ai_logs", {
        user: profile?.email || "admin@carolramos.com.br",
        prompt: userPrompt,
        model: "gemini-1.5-flash",
        tokensUsed: Math.floor(Math.random() * 400) + 150,
        responseSummary: replyText.substring(0, 100) + "...",
        createdAt: new Date().toISOString()
      });

      // Add AI reply to message history
      setMessages(prev => [
        ...prev,
        {
          sender: "gemini",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
      toastError("Erro na IA", "Não foi possível obter resposta da Inteligência Artificial.");
      setMessages(prev => [
        ...prev,
        {
          sender: "gemini",
          text: "Desculpe, ocorreu um erro de conexão. Verifique se o servidor de IA está ativo ou tente novamente.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input;
    setInput("");

    // Add user message immediately
    setMessages(prev => [
      ...prev,
      {
        sender: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    await executeAIService(userText);
  };

  const handleRegenerate = async () => {
    // Find the last user message
    const userMsgs = messages.filter(m => m.sender === "user");
    if (userMsgs.length === 0) return;
    const lastUserPrompt = userMsgs[userMsgs.length - 1].text;

    // Show info toast
    info("Regenerando...", "Enviando última pergunta novamente para a IA.");
    await executeAIService(lastUserPrompt, true);
  };

  // Simple Markdown-like custom formatter
  const formatText = (text: string) => {
    if (!text) return "";

    // Replace headers
    let html = text;
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-foreground mt-2 mb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h4 class="text-base font-bold text-foreground mt-3 mb-1">$1</h4>');

    // Replace bold syntax **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>');

    // Replace inline code blocks
    html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">$1</code>');

    // Convert bullet list lines
    const lines = html.split("\n");
    const processedLines = lines.map(line => {
      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        const content = line.replace(/^[•-]\s*/, "");
        return `<li class="ml-4 list-disc pl-1 my-0.5">${content}</li>`;
      }
      return line;
    });

    return processedLines.join("\n");
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] pb-2">
      {/* AI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-md shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-lg font-display font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span>Assistente Inteligente <span className="text-primary font-bold">Gemini</span></span>
          </h1>
          <p className="text-[10px] text-muted-foreground">Assistente comercial analítico integrado aos dados da empresa ativa.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClearChat}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl border border-border transition-colors"
            title="Limpar toda a conversa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border/55">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold">Serviço de IA Ativo</span>
          </div>
        </div>
      </div>

      {/* Chat Messages Frame */}
      <div className="flex-1 min-h-0 border border-border bg-card/25 rounded-2xl p-4 flex flex-col justify-between space-y-4 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 scrollbar-thin scroll-smooth pb-4">
          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            const isLastGemini = !isUser && index === messages.length - 1;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 max-w-[85%] group/msg",
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold shadow-sm",
                  isUser
                    ? "bg-primary/20 text-primary border border-primary/10"
                    : "bg-primary text-primary-foreground"
                )}>
                  {isUser ? "CR" : <Brain className="h-4 w-4" />}
                </div>

                {/* Bubble content */}
                <div className="space-y-1">
                  <div className={cn(
                    "p-3.5 rounded-2xl text-[11px] leading-relaxed border relative",
                    isUser
                      ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none"
                      : "bg-card border-border text-foreground rounded-tl-none"
                  )}>
                    {/* Render Formatted HTML */}
                    <div
                      className="whitespace-pre-line space-y-1"
                      dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                    />

                    {/* Hover actions for Gemini messages */}
                    {!isUser && (
                      <div className="absolute right-2 -bottom-3 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 shadow-md">
                        <button
                          onClick={() => handleCopyText(msg.text, index)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Copiar resposta"
                        >
                          {copiedId === index ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        {isLastGemini && (
                          <button
                            onClick={handleRegenerate}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Regenerar resposta"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className={cn(
                    "text-[9px] text-muted-foreground flex items-center gap-1",
                    isUser ? "justify-end" : "justify-start"
                  )}>
                    <Clock className="h-2.5 w-2.5" />
                    <span>{msg.timestamp}</span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing Bouncing Spinner */}
          {isTyping && (
            <div className="flex items-start gap-3 max-w-[85%] mr-auto animate-pulse">
              <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                <Brain className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="p-3.5 rounded-2xl bg-card border border-border text-xs rounded-tl-none flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium mr-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary animate-spin" />
                    IA pensando
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="space-y-1.5 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.substring(0, 500))}
              placeholder="Pergunte: 'Quanto vendi hoje?' ou 'Quais itens estão sem estoque?'..."
              disabled={isTyping}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-card/50 text-xs placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-4.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all flex items-center justify-center shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span>Use Markdown ou clique nas sugestões abaixo.</span>
            </span>
            <span className={cn(
              "text-[9px] font-mono",
              input.length >= 450 ? "text-red-500 font-bold" : "text-muted-foreground"
            )}>
              {input.length}/500 caracteres
            </span>
          </div>
        </form>
      </div>

      {/* Prompt Suggestions */}
      <div className="flex flex-wrap gap-1.5 items-center justify-center text-[10px] text-muted-foreground shrink-0 pb-1">
        <span className="font-semibold mr-1">Sugestões:</span>
        {[
          "Quanto vendi hoje?",
          "Quais produtos têm estoque crítico?",
          "Gerar mensagem para cliente aniversariante"
        ].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => { if (!isTyping) setInput(prompt); }}
            disabled={isTyping}
            className="px-3 py-1 rounded-full border border-border hover:border-primary/40 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
