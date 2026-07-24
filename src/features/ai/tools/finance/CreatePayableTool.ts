import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class CreatePayableTool implements AITool {
  id = "finance.create_payable";
  version = "1.0.0";
  name = "Criar Conta a Pagar";
  category = "Finance" as const;
  description = "Registra uma nova conta a pagar (despesa) no financeiro da empresa.";
  permissions = ["finance.write"];
  riskLevel = "MEDIUM" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      description: { type: "string", description: "Descrição ou título da conta a pagar." },
      amount: { type: "number", description: "Valor da conta a pagar." },
      dueDate: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD." },
      supplier: { type: "string", description: "Nome do fornecedor." }
    },
    required: ["description", "amount", "dueDate"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { description, amount, dueDate, supplier } = params;
    
    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação de criação de conta a pagar.",
        data: { description, amount, dueDate, action: "will_create_payable" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const payload = {
      tenantId: context.tenantId,
      type: "payable",
      description,
      amount: Number(amount),
      dueDate,
      supplier: supplier || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: context.userId
    };

    const docRef = await adminDb.collection("finance_transactions").add(payload);

    return {
      success: true,
      message: `Conta a pagar registrada com sucesso no valor de R$ ${amount}.`,
      data: { id: docRef.id, ...payload },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
