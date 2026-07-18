import { BaseDocument } from "@/types/shared";

export interface BankAccount extends BaseDocument {
  tenantId: string;
  name: string; // e.g. "Itaú Carol Ramos", "Carteira Shopee", "Caixa Físico"
  type: 'checking' | 'savings' | 'wallet' | 'cash_register';
  balance: number;
  currency: string;
  status: 'active' | 'inactive';
}

export interface FinancialTransaction extends BaseDocument {
  tenantId: string;
  type: 'revenue' | 'expense';
  category: 'sale' | 'rent' | 'marketing' | 'salary' | 'stock_purchase' | 'cash_register_adjustment' | 'other';
  amount: number;
  description: string;
  paymentDate?: any;
  status: 'paid' | 'cancelled';
  bankAccountId: string; // References BankAccount
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
  description: string;
  amount: number;
  dueDate: any;
  paidAmount?: number;
  paidDate?: any;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue';
  paymentMethod?: 'credit_card' | 'bank_slip' | 'pix' | 'cash';
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
  paymentMethod: 'credit_card' | 'bank_slip' | 'pix' | 'cash';
  dueDate?: any; // If accounts payable generated
  receivedAt?: any; // Date when stock was checked in
}
