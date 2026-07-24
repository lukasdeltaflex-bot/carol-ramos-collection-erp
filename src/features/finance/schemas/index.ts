import { z } from "zod";

export const BankAccountSchema = z.object({
  name: z.string().min(2, "Nome da conta deve conter pelo menos 2 caracteres"),
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  agency: z.string().optional(),
  accountNumber: z.string().optional(),
  accountDigit: z.string().optional(),
  type: z.enum(["checking", "savings", "wallet", "cash_register", "payment", "investment", "other"]),
  holderName: z.string().optional(),
  holderCpfCnpj: z.string().optional(),
  pixKey: z.string().optional(),
  balance: z.number().default(0),
  initialBalance: z.number().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  logo: z.string().optional(),
  currency: z.string().default("BRL"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const CompanyCreditCardSchema = z.object({
  name: z.string().min(2, "Nome do cartão deve conter pelo menos 2 caracteres"),
  issuerBank: z.string().min(2, "Informe o banco emissor"),
  flag: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "other"]),
  lastFourDigits: z.string().length(4, "Informe os últimos 4 dígitos"),
  nameOnCard: z.string().min(2, "Informe o nome impresso no cartão"),
  totalLimit: z.number().positive("Limite total deve ser maior que zero"),
  availableLimit: z.number().min(0, "Limite disponível não pode ser negativo"),
  closingDay: z.number().int().min(1).max(31, "Dia de fechamento inválido"),
  dueDay: z.number().int().min(1).max(31, "Dia de vencimento inválido"),
  linkedBankAccountId: z.string().optional(),
  responsiblePerson: z.string().optional(),
  status: z.enum(["active", "inactive", "blocked"]).default("active"),
  color: z.string().optional(),
  notes: z.string().optional(),
});

export const FinancialTransactionSchema = z.object({
  type: z.enum(["revenue", "expense"]),
  category: z.enum(["sale", "rent", "marketing", "salary", "stock_purchase", "cash_register_adjustment", "card_invoice_payment", "other"]),
  amount: z.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(3, "Descrição deve conter pelo menos 3 caracteres"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (AAAA-MM-DD)").or(z.string().length(0)).optional(),
  status: z.enum(["paid", "cancelled"]).default("paid"),
  bankAccountId: z.string().min(1, "Selecione uma conta bancária"),
  cardId: z.string().optional(),
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
  cardId: z.string().optional(),
  description: z.string().min(3, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida (AAAA-MM-DD)"),
  paymentMethod: z.enum(["credit_card", "company_credit_card", "bank_slip", "pix", "cash", "transfer", "bank_account"]).optional(),
  installments: z.number().int().positive().optional(),
  currentInstallment: z.number().int().positive().optional(),
});

export const PurchaseItemSchema = z.object({
  productId: z.string().min(1, "Produto inválido"),
  name: z.string().min(1, "Nome de produto inválido"),
  quantity: z.number().int().positive("Quantidade deve ser maior que zero"),
  unitCost: z.number().positive("Preço de custo unitário deve ser maior que zero"),
  discount: z.number().min(0, "Desconto não pode ser negativo").optional(),
});

export const PurchaseSchema = z.object({
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  invoiceNumber: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, "A compra deve conter pelo menos um item"),
  paymentMethod: z.enum(["credit_card", "company_credit_card", "bank_slip", "pix", "cash", "transfer", "bank_account"]),
  cardId: z.string().optional(),
  installments: z.number().int().positive().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida").or(z.string().length(0)).optional(),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  addition: z.number().min(0).optional(),
  freight: z.number().min(0, "Frete não pode ser negativo").optional(),
});
