import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class UpdateStockTool implements AITool {
  id = "products.update_stock";
  version = "1.0.0";
  name = "Atualizar Estoque do Produto";
  category = "Product" as const;
  description = "Atualiza a quantidade em estoque de um produto específico através de seu nome ou ID.";
  permissions = ["products.update"];
  riskLevel = "MEDIUM" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      productName: { type: "string", description: "O nome do produto para buscar e atualizar." },
      newStock: { type: "number", description: "A nova quantidade exata em estoque." }
    },
    required: ["productName", "newStock"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { productName, newStock } = params;
    
    const snapshot = await adminDb.collection("products")
      .where("tenantId", "==", context.tenantId)
      .where("name", "==", productName)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        success: false,
        message: `Nenhum produto encontrado com o nome exato "${productName}".`,
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const doc = snapshot.docs[0];
    const oldStock = doc.data().stock || 0;

    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação de atualização de estoque.",
        data: { productName, oldStock, newStock, action: "will_update_stock" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    await doc.ref.update({
      stock: Number(newStock),
      updatedAt: new Date().toISOString(),
      updatedBy: context.userId
    });

    return {
      success: true,
      message: `Estoque do produto ${productName} alterado de ${oldStock} para ${newStock} com sucesso.`,
      data: { id: doc.id, oldStock, newStock },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
