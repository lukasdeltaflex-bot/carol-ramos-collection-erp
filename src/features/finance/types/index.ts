import { BaseDocument } from "@/types/shared";

export interface BankAccount extends BaseDocument {
  tenantId: string;
  name: string; // e.g. "Itaú PJ", "Carteira Shopee", "Caixa Físico"
  bankName?: string; // e.g. "Banco do Brasil", "C6 Bank", "Banco Inter"
  bankCode?: string; // e.g. "001", "260", "077"
  agency?: string; // e.g. "0001"
  accountNumber?: string; // e.g. "12345"
  accountDigit?: string; // e.g. "6"
  type: 'checking' | 'savings' | 'wallet' | 'cash_register' | 'payment' | 'investment' | 'other';
  holderName?: string;
  holderCpfCnpj?: string;
  pixKey?: string;
  balance: number;
  initialBalance?: number;
  color?: string; // Hex or tailwind badge color
  notes?: string;
  status: 'active' | 'inactive';
  currency: string;
}

export interface CompanyCreditCard extends BaseDocument {
  tenantId: string;
  name: string; // e.g. "Cartão Corporativo Itaú Black"
  issuerBank: string; // e.g. "Itaú", "Nubank", "Inter"
  flag: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
  lastFourDigits: string; // e.g. "4589"
  nameOnCard: string; // e.g. "CAROL RAMOS"
  totalLimit: number;
  availableLimit: number;
  closingDay: number; // e.g. 25 (Melhor dia para compra = closingDay + 1)
  dueDay: number; // e.g. 5 (Data de vencimento da fatura)
  linkedBankAccountId?: string;
  responsiblePerson?: string; // e.g. "Carol Ramos"
  status: 'active' | 'inactive' | 'blocked';
  color?: string;
  notes?: string;
}

export interface FinancialTransaction extends BaseDocument {
  tenantId: string;
  type: 'revenue' | 'expense';
  category: 'sale' | 'rent' | 'marketing' | 'salary' | 'stock_purchase' | 'cash_register_adjustment' | 'card_invoice_payment' | 'other';
  amount: number;
  description: string;
  paymentDate?: any;
  status: 'paid' | 'cancelled';
  bankAccountId: string; // References BankAccount
  cardId?: string; // References CompanyCreditCard if card payment
  cashRegisterId?: string; // References CashRegister (if processed via physical POS)
  referenceId?: string; // Links to Sale ID, Purchase ID, Receivable ID, or Payable ID
}

export interface AccountsReceivable extends BaseDocument {
  tenantId: string;
  customerId?: string;
  saleId?: string; // If originated from a sale
  description: string;
  amount: number;
  dueDate: any;
  receivedAmount?: number;
  receivedDate?: any;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue';
  paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'split';
  installments?: number;
  currentInstallment?: number;
}

export interface AccountsPayable extends BaseDocument {
  tenantId: string;
  supplierId?: string;
  purchaseId?: string; // If originated from a purchase order
  cardId?: string; // References CompanyCreditCard if paid via card
  description: string;
  amount: number;
  dueDate: any;
  paidAmount?: number;
  paidDate?: any;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue';
  paymentMethod?: 'credit_card' | 'company_credit_card' | 'bank_slip' | 'pix' | 'cash' | 'transfer' | 'bank_account';
  installments?: number;
  currentInstallment?: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface Purchase extends BaseDocument {
  tenantId: string;
  supplierId: string; // References Supplier
  items: PurchaseItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: 'credit_card' | 'company_credit_card' | 'bank_slip' | 'pix' | 'cash' | 'transfer' | 'bank_account';
  cardId?: string; // References CompanyCreditCard
  installments?: number;
  dueDate?: any; // If accounts payable generated
  receivedAt?: any; // Date when stock was checked in
  // Custos Adicionais de Aquisição
  freightCost?: number;         // Frete de Compra
  insuranceCost?: number;       // Seguro
  taxCost?: number;             // Impostos da Compra
  feesCost?: number;            // Taxas
  customsCost?: number;         // Despesas Aduaneiras
  packagingCost?: number;       // Embalagens
  otherCosts?: number;          // Outras Despesas
  additionalCostsTotal?: number;// Soma de todos os custos adicionais
  grandTotal?: number;          // total (produtos) + additionalCostsTotal
  allocationMethod?: 'by_quantity' | 'by_value' | 'manual'; // Método de rateio
}
