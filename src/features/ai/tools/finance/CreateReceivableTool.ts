import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class CreateReceivableTool implements AITool {
  id = "finance.create_receivable";
  version = "1.0.0";
  name = "Criar Conta a Receber";
  category = "Finance" as const;
  description = "Registra uma nova conta a receber (receita) no financeiro da empresa.";
  permissions = ["finance.write"];
  riskLevel = "MEDIUM" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      description: { type: "string", description: "Descrição ou título da conta a receber." },
      amount: { type: "number", description: "Valor da conta a receber." },
      dueDate: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD." },
      customer: { type: "string", description: "Nome do cliente pagador." }
    },
    required: ["description", "amount", "dueDate"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { description, amount, dueDate, customer } = params;
    
    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação de criação de conta a receber.",
        data: { description, amount, dueDate, action: "will_create_receivable" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const payload = {
      tenantId: context.tenantId,
      type: "receivable",
      description,
      amount: Number(amount),
      dueDate,
      customer: customer || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: context.userId
    };

    const docRef = await adminDb.collection("finance_transactions").add(payload);

    return {
      success: true,
      message: `Conta a receber registrada com sucesso no valor de R$ ${amount}.`,
      data: { id: docRef.id, ...payload },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
