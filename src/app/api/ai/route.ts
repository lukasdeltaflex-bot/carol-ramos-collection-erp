import { NextResponse } from "next/server";
import { calculateStrategicMetrics } from "@/services/aiStrategicEngine";
import { aiToolRegistry, AIToolExecutor, AIExecutionContext } from "@/features/ai/tools";
import { AIPlanner, AIPlanExecutor } from "@/features/ai/planner";
export async function POST(req: Request) {
  try {
    const { prompt, context, memories, confirmedToolCall, confirmedPlan } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    // Se a requisição for a CONFIRMAÇÃO de um plano inteiro
    if (confirmedPlan) {
      const execContext: AIExecutionContext = {
        tenantId: context?.tenantId || "default_tenant",
        userId: context?.userId || "unknown",
        userRole: "admin",
        reasoning: "Plano confirmado pelo usuário."
      };
      
      const resultPlan = await AIPlanExecutor.executePlan(confirmedPlan, execContext);
      return NextResponse.json({
        response: `✅ **Plano Executado:** ${resultPlan.steps.filter(s => s.status === 'completed').length} etapas concluídas.`,
        actionResult: resultPlan,
        isPlanResult: true
      });
    }

    // Se a requisição já for uma CONFIRMAÇÃO de execução pendente de uma única ferramenta (Legacy Fase 8)
    if (confirmedToolCall) {
      const execContext: AIExecutionContext = {
        tenantId: context?.tenantId || "default_tenant",
        userId: context?.userId || "unknown",
        userRole: "admin",
        reasoning: "Usuário confirmou explicitamente a ação na interface."
      };
      
      const result = await AIToolExecutor.executeTool(
        confirmedToolCall.toolId,
        confirmedToolCall.parameters,
        execContext,
        true // isConfirmed = true
      );

      return NextResponse.json({
        response: `✅ **Ação executada:** ${result.message}`,
        actionResult: result
      });
    }

    // Geração do Schema de Ferramentas Ativas
    const availableTools = aiToolRegistry.getAllEnabledTools();
    const functionDeclarations = availableTools.map(tool => ({
      name: tool.id.replace(".", "_"), // Gemini requires snake_case names
      description: tool.description,
      parameters: tool.parameters
    }));

    const companyName = context?.companyName || "Carol Ramos Collection ERP";
    // ... logic for metrics remains for context
    const products = context?.products || [];
    const sales = context?.sales || [];
    const customers = context?.customers || [];
    const receivables = context?.receivables || [];
    const payables = context?.payables || [];
    const marketplaces = context?.marketplaces || [];
    const { metrics, recommendations } = calculateStrategicMetrics({ products, sales, customers, receivables, payables, marketplaces });

    const systemPrompt = `
Você é o Agente Inteligente de Gestão (AI Agent) do ERP Carol Ramos Collection.
Sua função é auxiliar o usuário a gerenciar o negócio. Você PODE e DEVE executar ações no sistema através das ferramentas fornecidas quando o usuário pedir.
Ao usar uma ferramenta, você preencherá os parâmetros com os dados inferidos do prompt.
Dados da Empresa: ${companyName}
Saúde: ${metrics.healthScore}/100, Risco de Caixa: ${metrics.cashFlowRisk}, Cobertura de Estoque: ${metrics.inventoryCoverageDays} dias.
Se não houver necessidade de chamar ferramentas, responda normalmente formatando em markdown.
`;

    if (apiKey && apiKey !== "your-gemini-api-key" && apiKey !== "") {
      const apiBody: any = {
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }, { text: `Pedido do Usuário: "${prompt}"` }]
          }
        ],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.2 },
      };

      if (functionDeclarations.length > 0) {
        apiBody.tools = [{ functionDeclarations }];
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0];
        
        // INTERCEPTAÇÃO DE FUNCTION CALL
        if (candidate?.functionCall) {
          const fnName = candidate.functionCall.name;
          const fnArgs = candidate.functionCall.args;
          const toolId = fnName.replace("_", "."); // Restaura o namespace do ID

          const execContext: AIExecutionContext = {
            tenantId: context?.tenantId || "default_tenant",
            userId: context?.userId || "unknown",
            userRole: "admin", // Padrão
            reasoning: `Gemini invocou ${toolId} baseado no prompt: "${prompt}"`
          };

          // Se for uma intenção de alteração (ou se o prompt tiver cara de multi-step), podemos gerar um plano.
          // Para Fase 9, interceptamos todas as chamadas de ferramentas e tentamos gerar um plano!
          const plan = await AIPlanner.generatePlan(prompt, execContext);
          
          if (plan && plan.steps.length > 0) {
            return NextResponse.json({
              response: `⚠️ **Plano de Execução Criado:** Entendi que você quer realizar ações no sistema. Por favor, revise e autorize o plano abaixo.`,
              requires_plan_confirmation: true,
              planPending: plan
            });
          }

          // Fallback para execução única se o Planner falhar ou retornar vazio
          const result = await AIToolExecutor.executeTool(toolId, fnArgs, execContext, false);

          if (result.message === "requires_confirmation") {
            // Retorna ao frontend para pedir confirmação antes de persistir
            return NextResponse.json({
              response: `⚠️ **Ação Interrompida: Confirmação Necessária**\n\nEu entendi que você quer executar uma ação no sistema. Preciso da sua autorização para continuar.`,
              actionPending: result.data
            });
          }

          // Se for leitura (riskLevel=NONE e não requiresConfirmation), retorna resultado formatado
          return NextResponse.json({
            response: `✅ **Pesquisa concluída:** ${result.message}`,
            actionResult: result
          });
        }

        if (candidate?.text) {
          return NextResponse.json({ response: candidate.text });
        }
      }
    }

    return NextResponse.json({ response: "### Fallback local. Não foi possível acionar a API remota de IA ou a ferramenta." });
  } catch (error: any) {
    console.error("Erro na rota de IA:", error);
    return NextResponse.json({ response: "Erro interno no servidor da IA." }, { status: 500 });
  }
}
