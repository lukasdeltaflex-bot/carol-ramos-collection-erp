import { AIExecutionPlan, AIExecutionPlanStep } from "./types";
import { aiToolRegistry } from "./aiToolRegistry";

/**
 * Módulo responsável por estruturar comandos complexos em um Plano de Execução.
 */
export class AIExecutionPlanner {
  /**
   * Constrói um plano a partir de uma lista de chamadas de funções fornecidas pelo LLM.
   */
  static buildPlan(functionCalls: { name: string; args: any }[]): AIExecutionPlan | null {
    if (!functionCalls || functionCalls.length === 0) return null;

    const steps: AIExecutionPlanStep[] = [];

    for (const call of functionCalls) {
      const tool = aiToolRegistry.getTool(call.name);
      if (tool && tool.enabled) {
        steps.push({
          toolId: tool.id,
          parameters: call.args,
        });
      } else {
        console.warn(`[AI Planner] Ferramenta não encontrada ou desabilitada: ${call.name}`);
      }
    }

    if (steps.length === 0) return null;

    return {
      planId: `plan_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      steps,
    };
  }
}
