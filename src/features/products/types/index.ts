import { BaseDocument } from "@/types/shared";

export interface Category extends BaseDocument {
  tenantId: string;
  name: string;
  description?: string;
  slug: string;
}

export interface Brand extends BaseDocument {
  tenantId: string;
  name: string;
  description?: string;
}

export interface StockLocation extends BaseDocument {
  tenantId: string;
  name: string;
  description?: string;
  isVirtual: boolean;
  status: 'active' | 'inactive';
}

export interface Product extends BaseDocument {
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  EAN?: string;
  NCM?: string;
  categoryId: string;
  brandId: string;
  supplierId?: string;
  costPrice: number;
  sellPrice: number;
  promoPrice?: number;
  averageCost: number;
  lastPurchasePrice: number;
  profitMargin: number; // percentage, e.g. 45 for 45%
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  weightGrams?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  images: Array<{
    url: string;
    path: string;
    isPrimary: boolean;
  }>;
  channels: {
    shopee?: { id: string; lastSync: any; synced: boolean };
    mercadolivre?: { id: string; lastSync: any; synced: boolean };
    ecommerce?: { id: string; active: boolean };
  };
  status: 'active' | 'inactive';
  lastSaleDate?: any;
  lastPurchaseDate?: any;
}
