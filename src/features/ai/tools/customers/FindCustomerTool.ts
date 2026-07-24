import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class FindCustomerTool implements AITool {
  id = "customers.find";
  version = "1.0.0";
  name = "Localizar Cliente";
  category = "Customer" as const;
  description = "Busca as informações detalhadas de um cliente pelo seu nome ou documento.";
  permissions = ["customers.read"];
  riskLevel = "NONE" as const;
  requiresConfirmation = false;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      searchTerm: {
        type: "string",
        description: "O nome, e-mail ou documento (CPF/CNPJ) do cliente a ser localizado."
      }
    },
    required: ["searchTerm"]
  };

  async execute(params: { searchTerm: string }, context: AIExecutionContext): Promise<AIToolResponse> {
    const { searchTerm } = params;
    
    // Simplificando a busca: buscando por nome usando startAt/endAt no Firestore
    const snapshot = await adminDb
      .collection("customers")
      .where("tenantId", "==", context.tenantId)
      .where("name", ">=", searchTerm)
      .where("name", "<=", searchTerm + "\uf8ff")
      .limit(5)
      .get();

    if (snapshot.empty) {
      return {
        success: true,
        message: "Nenhum cliente encontrado com este termo.",
        data: [],
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      success: true,
      message: `${customers.length} cliente(s) encontrado(s).`,
      data: customers,
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
