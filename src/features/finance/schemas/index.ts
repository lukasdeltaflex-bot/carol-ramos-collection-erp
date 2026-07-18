import { z } from "zod";

export const BankAccountSchema = z.object({
  name: z.string().min(2, "Nome da conta deve conter pelo menos 2 caracteres"),
  type: z.enum(["checking", "savings", "wallet", "cash_register"]),
  balance: z.number().default(0),
  currency: z.string().default("BRL"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const FinancialTransactionSchema = z.object({
  type: z.enum(["revenue", "expense"]),
  category: z.enum(["sale", "rent", "marketing", "salary", "stock_purchase", "cash_register_adjustment", "other"]),
  amount: z.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(3, "Descrição deve conter pelo menos 3 caracteres"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (AAAA-MM-DD)").or(z.string().length(0)).optional(),
  status: z.enum(["paid", "cancelled"]).default("paid"),
  bankAccountId: z.string().min(1, "Selecione uma conta bancária"),
});

export const AccountsReceivableSchema = z.object({
  customerId: z.string().optional(),
  description: z.string().min(3, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida (AAAA-MM-DD)"),
  paymentMethod: z.enum(["credit_card", "debit_card", "pix", "cash", "split"]).optional(),
  installments: z.number().int().positive().optional(),
});

export const AccountsPayableSchema = z.object({
  supplierId: z.string().optional(),
  description: z.string().min(3, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida (AAAA-MM-DD)"),
  paymentMethod: z.enum(["credit_card", "bank_slip", "pix", "cash"]).optional(),
});

export const PurchaseItemSchema = z.object({
  productId: z.string().min(1, "Produto inválido"),
  name: z.string().min(1, "Nome de produto inválido"),
  quantity: z.number().int().positive("Quantidade deve ser maior que zero"),
  unitCost: z.number().positive("Preço de custo unitário deve ser maior que zero"),
});

export const PurchaseSchema = z.object({
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  items: z.array(PurchaseItemSchema).min(1, "A compra deve conter pelo menos um item"),
  paymentMethod: z.enum(["credit_card", "bank_slip", "pix", "cash"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida").or(z.string().length(0)).optional(),
});
