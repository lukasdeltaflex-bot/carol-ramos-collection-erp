import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class CreateTaskTool implements AITool {
  id = "tasks.create";
  version = "1.0.0";
  name = "Criar Tarefa";
  category = "Tasks" as const;
  description = "Cria uma nova tarefa ou lembrete na agenda do usuário.";
  permissions = ["tasks.write"];
  riskLevel = "LOW" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      title: { type: "string", description: "Título ou resumo da tarefa." },
      description: { type: "string", description: "Detalhes adicionais da tarefa." },
      dueDate: { type: "string", description: "Data de vencimento (opcional) no formato YYYY-MM-DD." }
    },
    required: ["title"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { title, description, dueDate } = params;
    
    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação de criação de tarefa.",
        data: { title, description, dueDate, action: "will_create_task" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const payload = {
      tenantId: context.tenantId,
      title,
      description: description || "",
      dueDate: dueDate || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: context.userId
    };

    const docRef = await adminDb.collection("tasks").add(payload);

    return {
      success: true,
      message: `Tarefa "${title}" criada com sucesso.`,
      data: { id: docRef.id, ...payload },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
