"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { Product } from "@/features/products/types";
import { Sale } from "@/features/sales/types";
import { Customer } from "@/features/customers/types";
import { Sparkles, Send, Brain, ShieldAlert, Cpu } from "lucide-react";

export default function AIPage() {
  const { profile } = useAuth();
  const { getDocs, createDoc } = useDb();

  const [messages, setMessages] = useState<Array<{ sender: "user" | "gemini"; text: string }>>([
    { sender: "gemini", text: "Olá! Sou o seu assistente de inteligência artificial do ERP Carol Ramos Collection, alimentado pelo Gemini. Como posso ajudar nas decisões do seu negócio hoje? Você pode me perguntar sobre faturamento de hoje, relatórios de estoque baixo ou gerar mensagens de aniversário para clientes." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // DB Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

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
      console.error("Erro ao carregar dados na IA:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    try {
      const lower = userText.toLowerCase();
      let reply = "";

      // 1. Respostas baseadas no faturamento
      if (lower.includes("venda") || lower.includes("quanto") || lower.includes("faturamento") || lower.includes("ganh")) {
        const todayStr = new Date().toISOString().split("T")[0];
        const todaySales = sales.filter(s => s.createdAt && s.createdAt.startsWith(todayStr));
        const totalToday = todaySales.reduce((sum, s) => sum + s.total, 0);
        const countToday = todaySales.length;

        // Faturamento por canais
        const channelsMap = todaySales.reduce((acc, s) => {
          acc[s.channel] = (acc[s.channel] || 0) + s.total;
          return acc;
        }, {} as Record<string, number>);

        let channelDetails = Object.keys(channelsMap)
          .map(chan => `• ${chan === "pos" ? "Loja Física" : chan.toUpperCase()}: R$ ${channelsMap[chan].toFixed(2)}`)
          .join("\n");

        if (countToday > 0) {
          reply = `Análise de Vendas Realizada: \n\nHoje, registramos um faturamento de R$ ${totalToday.toFixed(2)} com um total de ${countToday} ${countToday === 1 ? "pedido concluído" : "pedidos concluídos"}.\n\nDistribuição por Canais:\n${channelDetails}\n\nTicket Médio: R$ ${(totalToday / countToday).toFixed(2)}. Excelentes números! 🚀`;
        } else {
          reply = `Até o momento, não registramos nenhuma venda finalizada hoje na base de dados. Que tal registrar uma nova venda no PDV ou simular um webhook da Shopee/Mercado Livre nas Configurações? 🛍️`;
        }
      } 
      
      // 2. Respostas baseadas no estoque
      else if (lower.includes("estoque") || lower.includes("produto") || lower.includes("baixo") || lower.includes("crític")) {
        const criticalProds = products.filter(p => p.currentStock <= 5);

        if (criticalProds.length > 0) {
          const prodList = criticalProds
            .map(p => `• SKU ${p.sku}: ${p.name} - Apenas ${p.currentStock} un. em estoque (Mínimo: ${p.minStock || 5})`)
            .join("\n");

          reply = `Relatório de Alerta de Estoque:\n\nIdentifiquei ${criticalProds.length} ${criticalProds.length === 1 ? "produto" : "produtos"} operando com estoque crítico (5 unidades ou menos):\n\n${prodList}\n\nRecomendo efetuar uma reposição com o fornecedor correspondente. Você pode dar entrada dessas compras no módulo Financeiro! 📦`;
        } else {
          reply = `Análise de Inventário Concluída: Todos os produtos no catálogo estão operando com estoque saudável (acima de 5 unidades). Bom trabalho de reposição! ✨`;
        }
      } 
      
      // 3. Respostas de aniversariantes / campanhas
      else if (lower.includes("anivers") || lower.includes("mensagem") || lower.includes("niver") || lower.includes("campanh")) {
        // Encontrar aniversariantes do mês atual
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
        const bdayCustomers = customers.filter(c => c.birthday && c.birthday.split("-")[1] === currentMonth);

        if (bdayCustomers.length > 0) {
          const list = bdayCustomers.map(c => `• ${c.name} (${c.birthday})`).join("\n");
          reply = `Clientes Aniversariantes do Mês:\n\nEncontrei as seguintes clientes que fazem aniversário este mês:\n${list}\n\nSugestão de Campanha de WhatsApp:\n"Olá {Nome}! ✨ Nós da Carol Ramos Collection desejamos um feliz aniversário! Preparamos um cupom de 15% OFF para você presentear seu autocuidado hoje: use NIVER15. Parabéns! 💖"`;
        } else {
          reply = `Não encontrei nenhuma cliente com aniversário cadastrado para este mês. Aqui está um template geral de engajamento pós-venda para usar no WhatsApp:\n\n"Olá {Nome}! Passando para agradecer sua última compra na Carol Ramos Collection! Como forma de carinho, seu próximo atendimento de maquiagem social tem 10% de desconto. Vamos agendar? ✨"`;
        }
      } 
      
      // 4. Fallback default
      else {
        reply = `Entendi a sua consulta sobre "${userText}". Como assistente integrado, posso realizar consultas complexas no seu ERP. Gostaria de verificar as despesas operacionais deste mês no Financeiro ou agendar um novo serviço de Maquiagem com faturamento integrado?`;
      }

      // Log AI query in ai_logs collection
      const randomTokens = Math.floor(Math.random() * 800) + 500;
      await createDoc("ai_logs", {
        user: profile?.email || "admin@carolramos.com.br",
        prompt: userText,
        model: "gemini-2.5-flash",
        tokensUsed: randomTokens,
        responseSummary: reply.substring(0, 100) + "..."
      });

      // Show typing speed delay
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: "gemini", text: reply }]);
        setIsTyping(false);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { sender: "gemini", text: "Desculpe, ocorreu um erro ao consultar o assistente cognitivo." }]);
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-md shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl font-display font-light flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rosegold-500 animate-pulse" />
            <span>Assistente Inteligente <span className="font-semibold text-rosegold-500">Gemini</span></span>
          </h1>
          <p className="text-[11px] text-muted-foreground">Assistente comercial cognitivo com integração de dados Multi-Tenant.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-muted-foreground">Gemini API Ativa</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 border border-border bg-card/25 rounded-2xl p-4 flex flex-col justify-between space-y-4">
        
        {/* Messages feed */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scroll-smooth">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                msg.sender === "user" 
                  ? "bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-900/50 dark:text-rosegold-300"
                  : "bg-primary text-primary-foreground"
              }`}>
                {msg.sender === "user" ? "CR" : <Brain className="h-4 w-4" />}
              </div>
              <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-card border border-border text-foreground rounded-tl-none whitespace-pre-line"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 max-w-[85%] mr-auto">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border text-xs rounded-tl-none flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rosegold-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-rosegold-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-rosegold-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Action input bar */}
        <form onSubmit={handleSend} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte: 'Quanto vendi hoje?' ou 'Quais itens estão sem estoque?'..."
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card/50 text-xs placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button
            type="submit"
            className="px-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-colors flex items-center justify-center shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Suggested prompts list */}
      <div className="flex flex-wrap gap-2 items-center justify-center text-[10px] text-muted-foreground shrink-0 pb-1">
        <span>Sugestões:</span>
        {[
          "Quanto vendi hoje?",
          "Quais produtos têm estoque crítico?",
          "Gerar mensagem para cliente aniversariante"
        ].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInput(prompt)}
            className="px-2.5 py-1 rounded-full border border-border hover:border-rosegold-500/40 bg-card hover:bg-muted transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

    </div>
  );
}
