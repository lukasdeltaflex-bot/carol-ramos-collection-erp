import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class SaveMemoryTool implements AITool {
  id = "memory.save";
  version = "1.0.0";
  name = "Salvar Memória";
  category = "Memory" as const;
  description = "Salva uma informação importante sobre o negócio do usuário para que a IA se lembre no futuro.";
  permissions = [];
  riskLevel = "NONE" as const;
  requiresConfirmation = false;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      content: { type: "string", description: "O fato ou informação a ser lembrada." },
      tags: { 
        type: "array", 
        items: { type: "string" }, 
        description: "Tags para categorizar a memória (ex: cliente, fornecedor, regra)." 
      }
    },
    required: ["content"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { content, tags } = params;
    
    const payload = {
      tenantId: context.tenantId,
      content,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      createdBy: context.userId
    };

    await adminDb.collection("ai_memory").add(payload);

    return {
      success: true,
      message: "Memória salva com sucesso.",
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
