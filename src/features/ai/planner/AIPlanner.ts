import { aiToolRegistry } from "@/features/ai/tools";
import { AIExecutionPlan, AIPlanStep } from "./types";
import { v4 as uuidv4 } from "uuid";

export class AIPlanner {
  /**
   * Generates a multi-step execution plan based on the user's objective and available tools.
   */
  static async generatePlan(
    objective: string,
    context: any
  ): Promise<AIExecutionPlan | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AIPlanner cannot function.");
      return null;
    }

    const availableTools = aiToolRegistry.getAllEnabledTools();
    const toolsContext = availableTools.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));

    const systemPrompt = `
      Você é um AI Planner Enterprise. Seu objetivo é pegar o pedido do usuário e dividi-lo em uma série de etapas utilizando as ferramentas disponíveis.
      
      FERRAMENTAS DISPONÍVEIS:
      ${JSON.stringify(toolsContext, null, 2)}
      
      REGRAS:
      1. Responda APENAS com um objeto JSON válido (sem \`\`\`json ou texto adicional).
      2. O objeto deve ter uma propriedade "steps" que é um array de objetos.
      3. Cada step deve ter: 
         - "toolName" (o id da ferramenta), 
         - "intent" (descrição breve do que faz), 
         - "parameters" (objeto chave-valor com os argumentos), 
         - "dependsOn" (opcional, array de toolNames ou ids dos quais este step depende).
      4. Se precisar do resultado do passo anterior nos parâmetros deste passo, use a sintaxe de dependência: "{{nome_do_campo_do_resultado_da_tool}}". 
         Exemplo: se a tool 1 cria um cliente e retorna { id: "123" }, no passo 2 você pode usar "{{id}}" como parâmetro se você depender da tool 1.
         Nós faremos o bind no executor. Para simplificar o parser, o executor buscará pelas chaves de saída das tools anteriores no escopo local de variáveis.
    `;

    const apiBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { text: `Pedido do Usuário: "${objective}"` }
          ]
        }
      ],
      generationConfig: { 
        maxOutputTokens: 2000, 
        temperature: 0.1,
        responseMimeType: "application/json"
      },
    };

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      });

      if (!res.ok) {
        console.error("Erro na API do Gemini ao gerar plano:", res.statusText);
        return null;
      }

      const data = await res.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) return null;

      let parsedContent;
      try {
        parsedContent = JSON.parse(textResponse);
      } catch (e) {
        console.error("Falha ao fazer parse do plano JSON do Gemini:", textResponse);
        return null;
      }

      const steps: AIPlanStep[] = (parsedContent.steps || []).map((s: any, idx: number) => ({
        id: `step_${uuidv4()}`,
        order: idx + 1,
        toolName: s.toolName,
        intent: s.intent || `Executar ${s.toolName}`,
        parameters: s.parameters || {},
        dependsOn: s.dependsOn || [],
        status: "pending",
        retries: 0,
        maxRetries: 3
      }));

      const plan: AIExecutionPlan = {
        id: `plan_${uuidv4()}`,
        tenantId: context.tenantId || "default_tenant",
        userId: context.userId || "unknown",
        objective,
        status: "pending",
        steps,
        createdAt: new Date().toISOString(),
        executionMode: steps.length > 3 ? "async" : "sync",
        totalRetries: 0
      };

      return plan;
    } catch (error) {
      console.error("Erro ao comunicar com AI Planner:", error);
      return null;
    }
  }
}
