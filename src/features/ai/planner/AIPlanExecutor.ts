import { AIExecutionPlan, AIPlanStep } from "./types";
import { AIToolExecutor, AIExecutionContext } from "@/features/ai/tools";
import { adminDb } from "@/lib/firebase/admin";

export class AIPlanExecutor {
  /**
   * Executa um plano de ação completo de forma síncrona/iterativa.
   */
  static async executePlan(plan: AIExecutionPlan, context: AIExecutionContext): Promise<AIExecutionPlan> {
    plan.status = "running";
    plan.startedAt = new Date().toISOString();
    await this.savePlan(plan);

    const stepContextVars: Record<string, any> = {};

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      step.status = "running";
      step.startedAt = new Date().toISOString();
      await this.savePlan(plan);

      try {
        // Resolver variáveis de template nos parâmetros, ex: "{{customerId}}"
        const resolvedParameters = this.resolveParameters(step.parameters, stepContextVars);
        
        // Executa a tool
        const stepContext: AIExecutionContext = {
          ...context,
          executionPlanId: plan.id,
          stepId: step.id,
          reasoning: `Executando passo ${step.order} do plano ${plan.id}`
        };

        const toolResult = await AIToolExecutor.executeTool(
          step.toolName,
          resolvedParameters,
          stepContext,
          true // Se está num plano aprovado, considera-se isConfirmed = true
        );

        if (!toolResult.success) {
          throw new Error(toolResult.message);
        }

        step.status = "completed";
        step.finishedAt = new Date().toISOString();
        step.result = toolResult.data;
        step.actualDuration = toolResult.executionTime;

        // Guarda os resultados deste passo nas variáveis de contexto para os próximos
        if (toolResult.data && typeof toolResult.data === 'object') {
          Object.assign(stepContextVars, toolResult.data);
          // Permite também que o próximo passo referencie explicitamente o stepId: {{step_1.id}}
          stepContextVars[step.id] = toolResult.data; 
        }

      } catch (error: any) {
        step.status = "failed";
        step.finishedAt = new Date().toISOString();
        step.error = error.message;
        
        plan.status = "failed";
        plan.finishedAt = new Date().toISOString();
        plan.errorSummary = `Erro na etapa ${step.order} (${step.intent}): ${error.message}`;
        await this.savePlan(plan);
        
        // Circuit Breaker: Aborta execução de steps futuros
        return plan;
      }
    }

    plan.status = "completed";
    plan.finishedAt = new Date().toISOString();
    await this.savePlan(plan);

    return plan;
  }

  /**
   * Substitui marcações string como "{{id}}" por valores reais extraídos do contexto.
   */
  private static resolveParameters(parameters: Record<string, any>, contextVars: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        const regex = /\\{\\{([^}]+)\\}\\}/g;
        let finalValue = value;
        let match;
        
        // Para simplificar, se for exatamente a string "{{var}}", substituímos pelo tipo real (pode ser objeto, num, etc)
        const exactMatch = /^\\{\\{([^}]+)\\}\\}$/.exec(value);
        if (exactMatch) {
          const varPath = exactMatch[1];
          const val = this.getValueFromPath(contextVars, varPath);
          resolved[key] = val !== undefined ? val : value;
          continue;
        }

        // Se tiver interpolado: "Cliente ID: {{id}}"
        finalValue = finalValue.replace(regex, (m, varPath) => {
          const val = this.getValueFromPath(contextVars, varPath);
          return val !== undefined ? String(val) : m;
        });

        resolved[key] = finalValue;
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveParameters(value, contextVars);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  private static getValueFromPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const p of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[p];
    }
    return current;
  }

  /**
   * Persiste o plano no Firestore (ai_execution_plans)
   */
  public static async savePlan(plan: AIExecutionPlan): Promise<void> {
    try {
      await adminDb.collection("ai_execution_plans").doc(plan.id).set(plan, { merge: true });
    } catch (e) {
      console.error("[AIPlanExecutor] Falha ao salvar plano:", e);
    }
  }
}
