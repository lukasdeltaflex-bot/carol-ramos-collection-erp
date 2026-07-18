import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your-gemini-api-key" || apiKey === "") {
      return NextResponse.json({
        response: "Chave API do Gemini não configurada. Ative a variável de ambiente `GEMINI_API_KEY` na Vercel ou no arquivo `.env` para respostas completas de IA do modelo Gemini 1.5 Pro. Usando analisador inteligente local como fallback temporário."
      });
    }

    const systemPrompt = `
Você é o assistente virtual analítico inteligente do ERP Carol Ramos Collection (beleza, cosméticos e skincare).
Você tem acesso aos seguintes dados em tempo real sobre a empresa ativa:
${JSON.stringify(context, null, 2)}

Regras de Negócio e Resposta:
1. Responda de forma elegante, prestativa, concisa e altamente profissional.
2. Utilize formatação Markdown rica (negrito, listas, tabelas) para deixar a resposta premium.
3. Se o usuário perguntar sobre faturamento de hoje, estoque baixo ou aniversariantes, use os dados acima para fornecer o resumo exato.
4. Caso as listas de dados estejam vazias, oriente o usuário a cadastrar itens no PDV, Estoque ou Contatos.
5. Sempre responda em Português do Brasil (pt-BR).
`;

    const apiBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { text: `Pergunta do usuário: "${prompt}"` }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      }
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiBody),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Erro na chamada da API do Gemini:", errText);
      return NextResponse.json({
        response: "Não foi possível conectar à API do Gemini no momento. Verifique a validade da chave API."
      }, { status: 502 });
    }

    const data = await res.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta gerada pelo modelo.";

    return NextResponse.json({ response: replyText });
  } catch (error: any) {
    console.error("Erro na rota de IA:", error);
    return NextResponse.json({ response: "Erro interno no servidor da IA." }, { status: 500 });
  }
}
