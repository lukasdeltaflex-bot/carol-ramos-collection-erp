import { aiToolRegistry } from "./aiToolRegistry";
import { AIExecutionContext, AIToolResponse, RiskLevel } from "./types";
import { adminDb } from "@/lib/firebase/admin";

export class AIToolExecutor {
  /**
   * Pipeline Enterprise de Execução de Ferramentas
   */
  static async executeTool(
    toolId: string,
    parameters: any,
    context: AIExecutionContext,
    isConfirmed: boolean = false
  ): Promise<AIToolResponse> {
    const startTime = Date.now();
    
    // 1. Localizar Ferramenta
    const tool = aiToolRegistry.getTool(toolId);
    if (!tool || !tool.enabled) {
      return this.buildErrorResponse(`Ferramenta ${toolId} não encontrada ou desabilitada.`, startTime);
    }

    // 2. Avaliar Confirmação e Risco (Dry Run via requiresConfirmation)
    if (tool.requiresConfirmation && !isConfirmed) {
      return {
        success: false,
        message: "requires_confirmation",
        data: {
          toolId: tool.id,
          name: tool.name,
          description: tool.description,
          riskLevel: tool.riskLevel,
          parameters
        },
        executionTime: Date.now() - startTime,
        toolVersion: tool.version
      };
    }

    // 3. Validar Permissões (RBAC Simples por enquanto)
    const hasPermission = this.checkPermissions(context.userRole, tool.permissions);
    if (!hasPermission) {
      const resp = this.buildErrorResponse("Permissão negada para executar esta ferramenta.", startTime);
      await this.logExecution(toolId, tool.version, tool.riskLevel, parameters, context, resp, "FAILED");
      return resp;
    }

    // 4. Executar (Transação)
    let response: AIToolResponse;
    try {
      response = await tool.execute(parameters, context);
      response.executionTime = Date.now() - startTime;
      response.toolVersion = tool.version;
      
      // 5. Auditoria (Log)
      await this.logExecution(toolId, tool.version, tool.riskLevel, parameters, context, response, response.success ? "SUCCESS" : "FAILED");
    } catch (error: any) {
      console.error(`[AI Executor] Erro na ferramenta ${toolId}:`, error);
      response = this.buildErrorResponse(`Falha interna: ${error.message}`, startTime);
      await this.logExecution(toolId, tool.version, tool.riskLevel, parameters, context, response, "FAILED");
    }

    return response;
  }

  private static checkPermissions(userRole: string, permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    if (userRole === "admin") return true;
    // Lógica futura de mapeamento de perfis para permissões
    // Por hora, se exigir permissão e não for admin, negamos.
    return false; 
  }

  private static buildErrorResponse(message: string, startTime: number): AIToolResponse {
    return {
      success: false,
      message,
      executionTime: Date.now() - startTime,
      toolVersion: "unknown"
    };
  }

  private static async logExecution(
    toolName: string,
    toolVersion: string,
    riskLevel: RiskLevel,
    parameters: any,
    context: AIExecutionContext,
    result: AIToolResponse,
    status: "SUCCESS" | "FAILED" | "ROLLEDBACK"
  ) {
    try {
      // Mascarar parâmetros sensíveis (Ex: senhas, cartões) se necessário
      const maskedParams = JSON.stringify(parameters);

      await adminDb.collection("ai_action_logs").add({
        tenantId: context.tenantId,
        userId: context.userId,
        toolName,
        toolVersion,
        riskLevel,
        parameters: maskedParams,
        executionTime: result.executionTime,
        status,
        resultado: JSON.stringify(result.data || {}),
        erro: status === "FAILED" ? result.message : null,
        explanation: context.reasoning || "Ação executada diretamente pelo executor.",
        executionPlanId: context.executionPlanId || null,
        stepId: context.stepId || null,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error("[AI Executor] Falha ao registrar log de auditoria:", logError);
    }
  }
}
