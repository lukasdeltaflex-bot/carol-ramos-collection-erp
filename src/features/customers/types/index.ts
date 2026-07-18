import { BaseDocument } from "@/types/shared";

export interface Customer extends BaseDocument {
  tenantId: string;
  name: string;
  email?: string;
  phone: string;
  cpf?: string;
  instagram?: string;
  birthday?: string; // YYYY-MM-DD
  tags: string[];
  source: string; // instagram, shopee, walk-in, etc.
  notes?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  metrics: {
    totalOrders: number;
    totalSpent: number;
    lastPurchaseDate?: any;
  };
}

export interface Supplier extends BaseDocument {
  tenantId: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}
