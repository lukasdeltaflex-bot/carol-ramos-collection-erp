import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";

export class SyncShopeeTool implements AITool {
  id = "marketplaces.sync_shopee";
  version = "1.0.0";
  name = "Sincronizar Shopee";
  category = "Marketplace" as const;
  description = "Força a sincronização manual de pedidos e produtos com a Shopee.";
  permissions = ["marketplaces.sync"];
  riskLevel = "LOW" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      syncType: { 
        type: "string", 
        enum: ["orders", "products", "all"], 
        description: "O que sincronizar: orders (pedidos), products (produtos) ou all (tudo)."
      }
    },
    required: ["syncType"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { syncType } = params;
    
    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação de sincronização da Shopee.",
        data: { syncType, action: "will_dispatch_sync_job" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    // Como já existe um Worker/Fila RabbitMQ, aqui simularíamos o envio da mensagem para a fila
    // Ex: await rabbitMqService.publish("sync_queue", { tenantId: context.tenantId, marketplace: "shopee", type: syncType });
    
    return {
      success: true,
      message: `Comando de sincronização (${syncType}) enviado para a Shopee. O processo ocorrerá em segundo plano.`,
      data: { marketplace: "shopee", syncType, status: "queued" },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
