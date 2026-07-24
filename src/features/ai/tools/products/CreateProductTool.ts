import { AITool } from "../core/AITool";
import { AIExecutionContext, AIToolResponse } from "../core/types";
import { adminDb } from "@/lib/firebase/admin";

export class CreateProductTool implements AITool {
  id = "products.create";
  version = "1.0.0";
  name = "Cadastrar Produto";
  category = "Product" as const;
  description = "Cadastra um novo produto no estoque do sistema.";
  permissions = ["products.create"];
  riskLevel = "LOW" as const;
  requiresConfirmation = true;
  enabled = true;

  parameters = {
    type: "object",
    properties: {
      name: { type: "string", description: "Nome do produto." },
      sku: { type: "string", description: "Código SKU do produto." },
      price: { type: "number", description: "Preço de venda." },
      stock: { type: "number", description: "Estoque inicial." }
    },
    required: ["name", "price"]
  };

  async execute(params: any, context: AIExecutionContext): Promise<AIToolResponse> {
    const { name, sku, price, stock } = params;
    
    if (context.dryRun) {
      return {
        success: true,
        message: "Simulação de criação de produto.",
        data: { name, price, stock, action: "will_create_product" },
        executionTime: 0,
        toolVersion: this.version
      };
    }

    const payload = {
      tenantId: context.tenantId,
      name,
      sku: sku || "",
      price: Number(price),
      stock: Number(stock) || 0,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: context.userId
    };

    const docRef = await adminDb.collection("products").add(payload);

    return {
      success: true,
      message: `Produto ${name} cadastrado com sucesso.`,
      data: { id: docRef.id, ...payload },
      executionTime: 0,
      toolVersion: this.version
    };
  }
}
