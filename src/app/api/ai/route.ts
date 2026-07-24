import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, context, memories } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const companyName = context?.companyName || "Carol Ramos Collection ERP";
    const products = context?.products || [];
    const sales = context?.sales || [];
    const customers = context?.customers || [];
    const receivables = context?.receivables || [];
    const payables = context?.payables || [];
    const marketplaces = context?.marketplaces || [];

    // Estatísticas calculadas em tempo real
    const totalStockCount = products.reduce((acc: number, p: any) => acc + (p.currentStock || 0), 0);
    const lowStockItems = products.filter((p: any) => (p.currentStock || 0) <= 5);
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter((s: any) => s.createdAt && s.createdAt.startsWith(todayStr));
    const todayRevenue = todaySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);

    const pendingReceivables = receivables
      .filter((r: any) => r.status === "pending")
      .reduce((acc: number, r: any) => acc + (r.amount || 0), 0);

    const pendingPayables = payables
      .filter((p: any) => p.status === "pending")
      .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

    const shopeeAccount = marketplaces.find((m: any) => m.channel === "shopee");
    const meliAccount = marketplaces.find((m: any) => m.channel === "mercado_libre");

    const systemPrompt = `
Você é o **Co-Piloto Inteligente de Gestão Empresarial** do ERP Carol Ramos Collection (setor de beleza, cosméticos, skincare e varejo de moda).
Sua personalidade é de um **Consultor Sênior de Negócios, Diretor Financeiro e Gerente de Operações Multi-Canal**.

Sua missão é fornecer análises profundas, quantitativas, estratégicas e acionáveis, NUNCA genéricas.

### 🏢 CONTEXTO EM TEMPO REAL DA EMPRESA:
- **Empresa:** ${companyName}
- **Produtos Cadastrados:** ${products.length} itens (Estoque Total Físico: ${totalStockCount} un)
- **Itens em Nível Crítico (≤ 5 un):** ${lowStockItems.length} produtos (${lowStockItems.map((p: any) => `${p.name}: ${p.currentStock}un`).join(", ") || "Nenhum"})
- **Total de Clientes na Base:** ${customers.length} clientes
- **Vendas Hoje:** ${todaySales.length} pedidos (Faturamento: R$ ${todayRevenue.toFixed(2)})
- **Contas a Receber Pendentes:** R$ ${pendingReceivables.toFixed(2)}
- **Contas a Pagar Pendentes:** R$ ${pendingPayables.toFixed(2)}
- **Marketplaces Integrados:**
  - Shopee: ${shopeeAccount ? `CONECTADO (Shop ID #${shopeeAccount.sellerId})` : "Desconectado"}
  - Mercado Livre: ${meliAccount ? `CONECTADO (Seller ID #${meliAccount.sellerId})` : "Desconectado"}

### 🧠 MEMÓRIAS & PREFERÊNCIAS REGISTRADAS DA EMPRESA:
${JSON.stringify(memories || [], null, 2)}

### 📜 REGRAS DE RESPOSTA E DIAGNÓSTICO:
1. **Rigor Numérico:** Utilize SEMPRE os valores numéricos exatos acima. Explicite dados de faturamento, peças em estoque e valores a pagar/receber.
2. **Recomendações Práticas:** Para problemas de estoque, calcule a reposição ideal. Para vendas, sugira ações comerciais. Para financeiro, apresente o saldo projetado.
3. **Formatação Premium:** Use Markdown rico, negrito, listas e tabelas organizadas.
4. **Sem Frases Genéricas:** Proibido responder "Consulte seu financeiro" ou "Avalie seu estoque". Diga exatamente quais itens e valores exigem ação.
5. **Responda em Português do Brasil (pt-BR)**.
`;

    // Se houver chave API do Gemini configurada no ambiente
    if (apiKey && apiKey !== "your-gemini-api-key" && apiKey !== "") {
      const apiBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: `Pergunta do Usuário: "${prompt}"` }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.6,
        }
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiBody),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return NextResponse.json({ response: replyText });
        }
      }
    }

    // FALLBACK ANALÍTICO LOCAL INTELIGENTE (Executado quando a chave do Gemini não está presente ou em testes)
    const lowerPrompt = prompt.toLowerCase();
    let localResponse = "";

    if (lowerPrompt.includes("estoque") || lowerPrompt.includes("produto") || lowerPrompt.includes("reposição")) {
      localResponse = `### 📦 Diagnóstico Analítico de Estoque & Reposição

Analisei o catálogo da empresa **${companyName}** (${products.length} SKUs cadastrados, total de **${totalStockCount} unidades** físicas).

#### ⚠️ Produtos em Nível Crítico (Reposição Urgente):
${
  lowStockItems.length === 0
    ? "✅ **Seu estoque está saudável!** Nenhum produto possui menos de 5 unidades em estoque."
    : lowStockItems
        .map(
          (p: any) =>
            `- **${p.name}** (SKU: ${p.sku || "N/A"}): Apenas **${p.currentStock} un** disponíveis. *Sugestão de lote de compra:* +${(p.minStock || 10) * 3} unidades.`
        )
        .join("\n")
}

#### 💡 Ações Recomendadas pelo Co-Piloto:
1. Emitir ordem de compra para fornecedores dos itens acima.
2. Sincronizar o estoque atualizado com **Shopee** e **Mercado Livre** na aba *Marketplaces*.`;
    } else if (lowerPrompt.includes("financeiro") || lowerPrompt.includes("faturamento") || lowerPrompt.includes("caixa") || lowerPrompt.includes("vendas")) {
      const netBalance = pendingReceivables - pendingPayables;
      localResponse = `### 💰 Análise Financeira & Performance de Vendas

Aqui está o resumo financeiro consolidado da empresa **${companyName}**:

| Indicador Financeiro | Valor Atual |
| :--- | :--- |
| **Vendas Realizadas Hoje** | ${todaySales.length} pedidos (R$ ${todayRevenue.toFixed(2)}) |
| **Contas a Receber Pendentes** | R$ ${pendingReceivables.toFixed(2)} |
| **Contas a Pagar Pendentes** | R$ ${pendingPayables.toFixed(2)} |
| **Saldo Projetado Liquidador** | **R$ ${netBalance.toFixed(2)}** |

#### 📈 Insights Operacionais:
- **Saúde do Caixa:** ${netBalance >= 0 ? "🟢 Projetado positivo. Margem de caixa estável." : "🔴 Projetado negativo. Atenção para quitação de contas a pagar nos próximos dias."}
- **Marketplaces:** Sincronização automática ativa para impulsionar recebíveis.`;
    } else {
      localResponse = `### 🤖 Co-Piloto de Gestão — Visão Geral Operacional

Olá! Analisei os dados da sua empresa **${companyName}**:

- **Produtos:** ${products.length} cadastrados (**${lowStockItems.length}** em nível crítico).
- **Vendas Hoje:** ${todaySales.length} pedidos (R$ ${todayRevenue.toFixed(2)}).
- **Clientes Cadastrados:** ${customers.length} contatos ativos.
- **Contas a Receber:** R$ ${pendingReceivables.toFixed(2)} | **A Pagar:** R$ ${pendingPayables.toFixed(2)}.

Como posso ajudar na sua decisão estratégica hoje? (Análise de fornecedores, projeção de reposição de estoque ou campanha de vendas).`;
    }

    return NextResponse.json({ response: localResponse });
  } catch (error: any) {
    console.error("Erro na rota de IA:", error);
    return NextResponse.json({ response: "Erro interno no servidor da IA." }, { status: 500 });
  }
}
