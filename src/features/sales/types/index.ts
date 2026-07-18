import { BaseDocument } from "@/types/shared";

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // Cost at the time of sale for margin calculations
  discount: number;
}

export interface Sale extends BaseDocument {
  tenantId: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'split';
  paymentDetails?: {
    installments?: number;
    transactionId?: string;
    splitDetails?: Array<{ method: string; amount: number }>;
  };
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  channel: 'pos' | 'whatsapp' | 'instagram' | 'shopee' | 'mercadolivre' | 'website';
  channelOrderId?: string;
  cashRegisterId?: string; // Reference to the active cash register session
}

export interface CashRegister extends BaseDocument {
  tenantId: string;
  openedAt: any;
  closedAt?: any;
  openedBy: string; // uid
  closedBy?: string; // uid
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number; // opening + sales processed
  difference?: number; // closing - expected
  status: 'open' | 'closed';
  notes?: string;
}

export interface InventoryTransaction extends BaseDocument {
  tenantId: string;
  productId: string;
  locationId: string; // References StockLocation
  type: 'in' | 'out' | 'adjustment' | 'return';
  quantity: number;
  costPriceAtTime: number;
  reason: string; // e.g. 'Sale Ref #1234'
}
