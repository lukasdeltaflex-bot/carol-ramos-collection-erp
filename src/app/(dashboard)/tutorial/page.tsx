"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Search, ChevronDown, ChevronRight, LayoutDashboard, Package, Users, ShoppingCart, DollarSign, Sparkles, Settings, Truck, Calendar, MessageCircle, Palette, ExternalLink, CheckCircle2, Lightbulb, Star, Trash2, BarChart2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

interface GuideStep {
  step: number;
  title: string;
  desc: string;
}

interface Guide {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  color: string;
  steps: GuideStep[];
  faqs: FAQItem[];
}

const GUIDES: Guide[] = [
  {
    id: "getting-started",
    title: "Primeiros Passos",
    category: "Início",
    icon: Star,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    steps: [
      { step: 1, title: "Faça login no sistema", desc: "Acesse com seu e-mail e senha, ou utilize o login com Google para entrar rapidamente." },
      { step: 2, title: "Configure sua empresa", desc: "Vá em Configurações > Perfil e preencha os dados da sua empresa: CNPJ, endereço, logo e redes sociais." },
      { step: 3, title: "Cadastre seus produtos", desc: "Acesse Produtos & Estoque e clique em '+ Novo Produto'. Preencha nome, SKU, preço, estoque mínimo e máximo." },
      { step: 4, title: "Adicione seus clientes", desc: "Acesse Clientes & Contatos para cadastrar sua base de clientes com histórico de compras." },
      { step: 5, title: "Registre sua primeira venda", desc: "Use o módulo Venda Rápida / PDV para registrar vendas com desconto, múltiplos itens e métodos de pagamento." },
    ],
    faqs: [
      { question: "Como faço para criar uma nova empresa?", answer: "Acesse Configurações e procure a seção 'Minhas Empresas'. Clique em '+ Nova Empresa', preencha os dados e salve. Você poderá alternar entre empresas pelo seletor no topo da tela." },
      { question: "Posso usar o sistema offline?", answer: "O sistema opera com dados em nuvem via Firebase. Para uso offline, os dados em cache do navegador podem ser visualizados, mas novas operações requerem conexão com a internet." },
      { question: "Como altero minha senha?", answer: "Clique no seu nome no canto superior direito e selecione 'Alterar Senha'. Você receberá um e-mail com instruções para redefinição." },
    ],
  },
  {
    id: "products",
    title: "Produtos & Estoque",
    category: "Módulos",
    icon: Package,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
    steps: [
      { step: 1, title: "Acesse o módulo", desc: "Clique em 'Produtos & Estoque' no menu lateral." },
      { step: 2, title: "Crie um novo produto", desc: "Clique em '+ Novo Produto' e preencha: Nome, SKU, Categoria, Preço de Custo, Preço de Venda e Estoque Inicial." },
      { step: 3, title: "Defina estoque mínimo", desc: "Configure o estoque mínimo para receber alertas automáticos quando o produto estiver prestes a acabar." },
      { step: 4, title: "Adicione variações", desc: "Para produtos com variações (cores, tamanhos), utilize o campo Observações ou crie produtos separados com SKUs distintos." },
      { step: 5, title: "Monitore o estoque", desc: "O Dashboard exibe os produtos com estoque crítico. O Assistente IA também pode gerar relatórios de estoque." },
    ],
    faqs: [
      { question: "Como faço um ajuste de estoque?", answer: "Edite o produto e altere o campo 'Estoque Atual'. Para um controle mais preciso, registre entradas de estoque via Financeiro (Conta a Pagar > Compra de Fornecedor)." },
      { question: "Posso importar produtos em massa?", answer: "Sim! Acesse Configurações > Dados e utilize a função 'Importar CSV'. O arquivo deve seguir o modelo disponível para download na mesma tela." },
      { question: "Como visualizar o histórico de movimentações?", answer: "Acesse o produto, clique em 'Editar' e verifique a aba 'Histórico'. Todas as alterações de estoque ficam registradas com data e responsável." },
    ],
  },
  {
    id: "sales",
    title: "Venda Rápida / PDV",
    category: "Módulos",
    icon: ShoppingCart,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    steps: [
      { step: 1, title: "Abra o PDV", desc: "Acesse 'Venda Rápida / PDV' no menu lateral." },
      { step: 2, title: "Selecione o cliente", desc: "Busque o cliente pelo nome, CPF ou telefone. Para clientes novos, cadastre rapidamente pelo botão '+ Cliente'." },
      { step: 3, title: "Adicione os produtos", desc: "Pesquise produtos pelo nome ou SKU e adicione à sacola de compras. Ajuste quantidades conforme necessário." },
      { step: 4, title: "Aplique desconto (opcional)", desc: "Digite o percentual de desconto no campo específico ou insira um cupom promocional." },
      { step: 5, title: "Finalize a venda", desc: "Selecione o método de pagamento (Dinheiro, Cartão, Pix) e clique em 'Finalizar Venda'. A nota fiscal e o comprovante são gerados automaticamente." },
    ],
    faqs: [
      { question: "Como cancelo uma venda?", answer: "Acesse o histórico de vendas (ícone de relógio no PDV), localize a venda e clique em 'Cancelar'. O estoque é restabelecido automaticamente." },
      { question: "Posso vender produtos com estoque zerado?", answer: "Por padrão, o sistema alerta quando o estoque está zerado mas permite prosseguir. Você pode bloquear isso em Configurações > Parâmetros > 'Bloquear venda sem estoque'." },
      { question: "Como registro uma venda a prazo?", answer: "Ao finalizar a venda, selecione 'A Prazo' como método de pagamento e configure as parcelas. O sistema criará automaticamente as contas a receber no módulo Financeiro." },
    ],
  },
  {
    id: "finance",
    title: "Financeiro",
    category: "Módulos",
    icon: DollarSign,
    color: "text-violet-500 bg-violet-50 dark:bg-violet-950/30",
    steps: [
      { step: 1, title: "Configure suas contas bancárias", desc: "Acesse Financeiro > Contas Bancárias e adicione suas contas. Selecione o banco pelo seletor visual com logos." },
      { step: 2, title: "Registre receitas", desc: "Clique em '+ Lançamento' e selecione 'Receita'. Informe: descrição, valor, data, categoria e conta bancária." },
      { step: 3, title: "Registre despesas", desc: "Da mesma forma, registre despesas como: aluguel, fornecedores, marketing e custos operacionais." },
      { step: 4, title: "Acompanhe o fluxo de caixa", desc: "O gráfico de fluxo de caixa mostra entradas e saídas mensais, com saldo projetado para os próximos 30 dias." },
      { step: 5, title: "Exporte relatórios", desc: "Gere relatórios em PDF ou CSV de qualquer período. Acesse Configurações > Dados > Exportar." },
    ],
    faqs: [
      { question: "Como reconcilio o caixa do dia?", answer: "Acesse Financeiro > Fechamento do Dia. O sistema compara as vendas registradas no PDV com os lançamentos financeiros e aponta divergências." },
      { question: "Posso lançar uma transferência entre contas?", answer: "Sim. No módulo Financeiro, clique em '+ Transferência'. Selecione a conta de origem, conta de destino e o valor. O sistema cria automaticamente os lançamentos de débito e crédito." },
      { question: "Como funciona o controle de contas a pagar/receber?", answer: "Todo lançamento pode ter uma data de vencimento. O sistema classifica automaticamente as pendências e envia alertas para contas vencidas ou com vencimento nos próximos 3 dias." },
    ],
  },
  {
    id: "ai",
    title: "Assistente IA (Gemini)",
    category: "Recursos",
    icon: Sparkles,
    color: "text-primary bg-primary/10",
    steps: [
      { step: 1, title: "Acesse o Assistente", desc: "Clique em 'Assistente IA' no menu lateral. O chat estará pronto para uso." },
      { step: 2, title: "Faça perguntas sobre o negócio", desc: "Pergunte: 'Quanto vendi hoje?', 'Quais produtos estão com estoque crítico?' ou 'Quem faz aniversário este mês?'" },
      { step: 3, title: "Use as sugestões rápidas", desc: "Na parte inferior do chat, há chips de sugestões de perguntas frequentes. Clique para preenchê-las automaticamente." },
      { step: 4, title: "Copie e compartilhe respostas", desc: "Cada resposta do Gemini tem um botão de copiar. Use isso para compartilhar relatórios via WhatsApp ou e-mail." },
      { step: 5, title: "Limpe o histórico", desc: "Use o botão de lixeira no canto do chat para limpar o histórico de conversas." },
    ],
    faqs: [
      { question: "O assistente acessa dados em tempo real?", answer: "Sim. O assistente consulta os dados do seu ERP (produtos, vendas, clientes) no momento da pergunta, garantindo respostas sempre atualizadas." },
      { question: "O Gemini pode gerar relatórios automaticamente?", answer: "O assistente pode gerar análises textuais detalhadas. Para relatórios em PDF, utilize o módulo de Exportação em Configurações > Dados." },
      { question: "As conversas são salvas?", answer: "O histórico do chat é salvo localmente no navegador. Ao limpar o cache ou usar outro dispositivo, o histórico não estará disponível." },
    ],
  },
  {
    id: "customers",
    title: "Clientes & Lixeira Inteligente",
    category: "Módulos",
    icon: Users,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
    steps: [
      { step: 1, title: "Acesse Clientes & Contatos", desc: "No menu lateral, clique em 'Clientes & Contatos' para visualizar sua lista ativa de clientes." },
      { step: 2, title: "Exclusão Segura (Soft Delete)", desc: "Ao clicar no ícone de lixeira em um cliente, o registro NÃO é removido permanentemente. Ele é enviado com segurança para a Lixeira Inteligente." },
      { step: 3, title: "Remoção Imediata da Lista Ativa", desc: "O cliente enviado para a Lixeira desaparece imediatamente da sua listagem de clientes e não retorna mesmo após atualizar a página ou fazer novo login." },
      { step: 4, title: "Restauração de Clientes", desc: "Se você excluiu um cliente por engano, acesse a '🗑️ Lixeira' no menu lateral, localize o cliente e clique em 'Restaurar'. Ele retornará intacto para a lista de clientes ativos." },
      { step: 5, title: "Exclusão Permanente", desc: "Caso deseje apagar definitivamente um cliente do banco de dados do Firestore, acesse a Lixeira e confirme a 'Exclusão Permanente'. Essa ação é irreversível." },
    ],
    faqs: [
      { question: "O que acontece com as vendas do cliente excluído?", answer: "As vendas e o histórico financeiro do cliente continuam intactos no ERP. Apenas o cadastro de contato é enviado para a Lixeira." },
      { question: "Qual a diferença entre exclusão lógica e exclusão definitiva?", answer: "Na exclusão lógica (soft delete), o registro é apenas marcado como inativo e movido para a Lixeira, podendo ser restaurado. Na exclusão definitiva, o documento é apagado do banco Firestore sem possibilidade de recuperação." },
      { question: "Clientes na Lixeira aparecem em buscas ou relatórios?", answer: "Não. Consultas normais, pesquisas do PDV e relatórios ignoram automaticamente registros marcados na Lixeira." },
    ],
  },
  {
    id: "recycle-bin",
    title: "Lixeira Inteligente",
    category: "Recursos",
    icon: Trash2,
    color: "text-red-500 bg-red-50 dark:bg-red-950/30",
    steps: [
      { step: 1, title: "Acesse a Lixeira", desc: "Clique em '🗑️ Lixeira' no menu lateral para visualizar todos os itens removidos do sistema." },
      { step: 2, title: "Filtros por Módulo e Data", desc: "Filtre facilmente os itens excluídos por módulo (Clientes, Produtos, Categorias, Contas, Vendas) ou período de exclusão." },
      { step: 3, title: "Ações em Lote (Batch)", desc: "Selecione múltiplos itens pelas caixas de seleção e restaure ou exclua todos de uma única vez." },
      { step: 4, title: "Configurações de Limpeza Automática", desc: "Configure a Lixeira para expurgar automaticamente registros antigos após 15, 30, 60 ou 90 dias." },
    ],
    faqs: [
      { question: "Quais cadastros vão para a Lixeira?", answer: "Produtos, Categorias, Clientes, Fornecedores, Contas a Pagar, Contas a Receber, Vendas e Lembretes." },
      { question: "Apenas administradores podem apagar definitivamente?", answer: "Sim. Nas configurações da Lixeira você pode restringir a exclusão permanente apenas a perfis administradores." },
    ],
  },
  {
    id: "reports-bi",
    title: "Relatórios & Business Intelligence (BI)",
    category: "Gestão",
    icon: BarChart2,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
    steps: [
      { step: 1, title: "Central de Relatórios", desc: "Acesse '📊 Relatórios' para gerar relatórios detalhados de Vendas, Estoque, Financeiro, Clientes, Fornecedores e Empresas." },
      { step: 2, title: "Exportação em PDF, Excel e CSV", desc: "Exporte qualquer relatório filtrado nos formatos PDF, Excel (.xlsx), CSV ou envie diretamente para impressão." },
      { step: 3, title: "Business Intelligence (BI)", desc: "Acesse '📈 Business Intelligence' para acompanhar indicadores estratégicos executivos (Faturamento, Lucro Líquido, ROI, Ticket Médio, Giro de Estoque)." },
      { step: 4, title: "Previsões & Metas", desc: "Acompanhe previsões preditivas para o próximo mês e defina metas comerciais com barras de progresso." },
    ],
    faqs: [
      { question: "Como agendar o envio automático de relatórios?", answer: "Na Central de Relatórios, selecione um relatório e clique em 'Agendar Envio'. Defina a frequência (Diário, Semanal, Mensal) e o e-mail destinatário." },
      { question: "Como salvar relatórios favoritos?", answer: "Clique na estrela ⭐ ao lado de qualquer relatório no catálogo para adicioná-lo à sua seção de Relatórios Favoritos." },
    ],
  },
  {
    id: "notifications",
    title: "Central de Notificações & Sino",
    category: "Recursos",
    icon: Bell,
    color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30",
    steps: [
      { step: 1, title: "Sino do Cabeçalho", desc: "No canto superior direito, o ícone de sino exibe um contador numérico em vermelho com o total de notificações não lidas." },
      { step: 2, title: "Visualizar Notificações Rápidas", desc: "Clique no sino para abrir o painel com alertas recentes de estoque baixo, contas a vencer e integrações." },
      { step: 3, title: "Marcar Todas como Lidas", desc: "Clique em 'Marcar todas como lidas' no topo do painel do sino ou na Central de Notificações. O contador zerará imediatamente e todas as notificações perderão o destaque de cor." },
      { step: 4, title: "Marcar Notificação Individual", desc: "Clique em qualquer notificação individual no painel ou na central para marcá-la como lida." },
      { step: 5, title: "Histórico & Configuração SMTP", desc: "Acesse 'Notificações & E-mails' no menu lateral para visualizar o histórico completo, criar modelos de e-mail e configurar seu servidor SMTP." },
    ],
    faqs: [
      { question: "O que acontece ao clicar em 'Marcar todas como lidas'?", answer: "Todas as notificações não lidas da sua empresa são atualizadas no Firestore com status 'read: true' e data/hora de leitura, zerando instantaneamente o badge do sino." },
      { question: "As notificações voltam como não lidas após atualizar a página?", answer: "Não. A leitura é gravada de forma persistente no banco de dados Firestore e sincronizada com o cache local." },
      { question: "Como sei se chegou uma notificação nova?", answer: "Sempre que um novo alerta é gerado (ex.: estoque crítico ou conta pendente), um contador numérico pulsante em vermelho aparecerá sobre o sino." },
    ],
  },
  {
    id: "suppliers",
    title: "Fornecedores",
    category: "Módulos",
    icon: Truck,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
    steps: [
      { step: 1, title: "Acesse o módulo", desc: "Clique em 'Fornecedores' no menu lateral." },
      { step: 2, title: "Cadastre um novo fornecedor", desc: "Clique em '+ Novo Fornecedor'. Preencha a Razão Social, CNPJ, dados de contato e endereço." },
      { step: 3, title: "Adicione o logo (opcional)", desc: "Na aba 'Dados Gerais', faça upload do logo do fornecedor para facilitar a identificação visual." },
      { step: 4, title: "Configure o CEP automaticamente", desc: "Digite o CEP no campo endereço e o sistema preencherá automaticamente rua, bairro, cidade e estado via ViaCEP." },
      { step: 5, title: "Gerencie o status", desc: "Marque fornecedores como 'Inativo' quando não estiverem mais em operação, sem excluir o histórico de dados." },
    ],
    faqs: [
      { question: "Como vinculo um fornecedor a uma compra?", answer: "Ao registrar uma despesa no Financeiro, você pode selecionar o fornecedor no campo 'Parceiro'. Isso cria um histórico de compras por fornecedor." },
      { question: "Posso importar fornecedores de uma planilha?", answer: "Sim! Acesse Configurações > Dados > Importar e selecione o tipo 'Fornecedores'. Use o modelo CSV disponível para download." },
      { question: "Como faço para contatar um fornecedor pelo WhatsApp?", answer: "No cadastro do fornecedor, clique no ícone do WhatsApp ao lado do número. O sistema abrirá o WhatsApp Web com o número pré-preenchido." },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { label: "Produtos", href: "/products", icon: Package, color: "text-indigo-500" },
  { label: "Vendas", href: "/sales", icon: ShoppingCart, color: "text-emerald-500" },
  { label: "Clientes", href: "/contacts", icon: Users, color: "text-orange-500" },
  { label: "Financeiro", href: "/finance", icon: DollarSign, color: "text-violet-500" },
  { label: "Assistente IA", href: "/ai", icon: Sparkles, color: "text-primary" },
  { label: "Fornecedores", href: "/suppliers", icon: Truck, color: "text-amber-500" },
  { label: "Configura\u00e7\u00f5es", href: "/settings", icon: Settings, color: "text-gray-500" },
];

export default function TutorialPage() {
  const [search, setSearch] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const filteredGuides = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return GUIDES;
    return GUIDES.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.faqs.some(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) ||
      g.steps.some(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Tutorial do Sistema
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Guias passo-a-passo, perguntas frequentes e atalhos para todas as funcionalidades.
          </p>
        </div>
        <a
          href="mailto:suporte@carolramos.com.br"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Suporte
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar tópicos, perguntas ou funcionalidades..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card/50 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* Quick Links */}
      {!search && (
        <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Atalhos Rápidos
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {QUICK_LINKS.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all group"
                >
                  <Icon className={cn("h-5 w-5 group-hover:scale-110 transition-transform", link.color)} />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Guide Detail View */}
      {selectedGuide ? (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => { setSelectedGuide(null); setExpandedFAQ(null); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Voltar para todos os guias
          </button>

          <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", selectedGuide.color)}>
                <selectedGuide.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{selectedGuide.title}</h2>
                <span className="text-[10px] text-muted-foreground">{selectedGuide.category}</span>
              </div>
            </div>

            {/* Steps */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Guia Passo a Passo</h3>
              <div className="space-y-2">
                {selectedGuide.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Perguntas Frequentes</h3>
            <div className="space-y-2">
              {selectedGuide.faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-left hover:bg-muted/30 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", expandedFAQ === i && "rotate-180")} />
                  </button>
                  {expandedFAQ === i && (
                    <div className="px-4 pb-4 pt-1 text-[11px] text-muted-foreground leading-relaxed bg-muted/10 border-t border-border">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Guide Cards Grid */
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {search ? `${filteredGuides.length} resultado(s) encontrado(s)` : "Guias Disponíveis"}
          </h2>
          {filteredGuides.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum resultado encontrado para &quot;{search}&quot;</p>
              <button onClick={() => setSearch("")} className="mt-2 text-xs text-primary hover:underline">
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredGuides.map(guide => {
                const Icon = guide.icon;
                return (
                  <button
                    key={guide.id}
                    onClick={() => { setSelectedGuide(guide); setExpandedFAQ(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="group p-5 rounded-2xl border border-border bg-card/50 hover:border-primary/30 hover:bg-muted/30 text-left transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", guide.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{guide.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{guide.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {guide.steps.length} passos
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {guide.faqs.length} FAQs
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Ver guia</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tips Banner */}
      {!search && !selectedGuide && (
        <div className="p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Dica Pro</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              Use o Assistente IA para perguntas rápidas sobre seu negócio. Ele analisa seus dados em tempo real e pode responder sobre vendas, estoque e clientes instantaneamente!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
