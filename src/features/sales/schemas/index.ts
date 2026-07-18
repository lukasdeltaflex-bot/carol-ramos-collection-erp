import { z } from "zod";

export const CashRegisterSchema = z.object({
  openingBalance: z.number().min(0, "Saldo inicial não pode ser negativo"),
  notes: z.string().optional(),
});

export const CashRegisterCloseSchema = z.object({
  closingBalance: z.number().min(0, "Saldo de fechamento não pode ser negativo"),
  notes: z.string().optional(),
});

export const SaleItemSchema = z.object({
  productId: z.string().min(1, "ID do produto inválido"),
  name: z.string().min(1, "Nome do produto inválido"),
  quantity: z.number().int().positive("Quantidade deve ser maior que zero"),
  unitPrice: z.number().positive("Preço unitário deve ser maior que zero"),
  costPrice: z.number().min(0, "Preço de custo não pode ser negativo"),
  discount: z.number().min(0, "Desconto não pode ser negativo").default(0),
});

export const SaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, "A venda deve conter pelo menos um item"),
  discount: z.number().min(0, "Desconto global não pode ser negativo").default(0),
  paymentMethod: z.enum(["credit_card", "debit_card", "pix", "cash", "split"]),
  paymentDetails: z.object({
    installments: z.number().int().positive().optional(),
    transactionId: z.string().optional(),
    splitDetails: z.array(z.object({
      method: z.string(),
      amount: z.number().positive()
    })).optional(),
  }).optional(),
  channel: z.enum(["pos", "whatsapp", "instagram", "shopee", "mercadolivre", "website"]).default("pos"),
});
