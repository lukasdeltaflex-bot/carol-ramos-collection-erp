import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class CreateCustomerTool implements AITool {
  id = "customers.create";
  version = "1.0.0";
  name = "Cadastrar Cliente";
  category = "Customer" as const;
  description = "Cadastra um novo cliente no sistema ERP com os dados básicos fornecidos.";
  permissions = ["customers.create"];
  riskLevel = "LOW" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      name: { type: "string", description: "Nome completo do cliente." },
      email: { type: "string", description: "Endereço de e-mail do cliente." },
      phone: { type: "string", description: "Telefone de contato do cliente." },
      document: { type: "string", description: "CPF ou CNPJ do cliente." }
    },
    required: ["name"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { name, email, phone, document } = params;
    
    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação executada com sucesso.",
        data: { name, email, action: "will_create" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const payload = {
      tenantId: context.tenantId,
      name,
      email: email || "",
      phone: phone || "",
      document: document || "",
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: context.userId
    };

    const docRef = await adminDb.collection("customers").add(payload);

    return {
      success: true,
      message: `Cliente ${name} cadastrado com sucesso.`,
      data: { id: docRef.id, ...payload },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
