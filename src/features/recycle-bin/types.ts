import { BaseDocument } from "@/types/shared";

export type RecycleBinModule = 
  | "products"
  | "categories"
  | "customers"
  | "suppliers"
  | "companies"
  | "finance_accounts"
  | "credit_cards"
  | "accounts_payable"
  | "accounts_receivable"
  | "sales"
  | "reminders"
  | "other";

export interface RecycleBinItem extends Partial<BaseDocument> {
  tenantId: string;
  originalCollection: string;
  originalId: string;
  moduleName: RecycleBinModule | string;
  moduleLabel: string; // Human readable label (e.g. "Produtos", "Clientes", "Contas a Pagar")
  itemName: string;    // Display name (e.g. "Perfume Gold Rose", "João Silva")
  itemDetails?: string; // Secondary info (e.g. "SKU: PE-01", "R$ 850,00", "CNPJ: 12.345...")
  deletedBy: string;   // User display name or email
  deletedAt: string;   // ISO timestamp
  companyName?: string;
  expirationDate?: string; // Optional auto-purge date
  originalData: any;   // Full snapshot of the deleted item for instant recovery
}

export interface RecycleBinSettings extends Partial<BaseDocument> {
  tenantId: string;
  autoPurgeDays: number; // 0 = never, 30 = 30 days
  allowUserRestoration: boolean; // allow non-admins to restore
  restrictPermanentDeletionToAdmin: boolean; // only admins can permanently delete
}
