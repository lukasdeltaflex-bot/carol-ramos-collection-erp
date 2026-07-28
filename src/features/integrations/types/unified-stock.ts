import { BaseDocument } from "@/types/shared";
import { MarketplaceChannel } from "./marketplaces";

export type StockMovementType = "in" | "out" | "adjustment" | "return";

export type StockMovementOrigin =
  | "marketplace"
  | "manual"
  | "pos"
  | "adjustment"
  | "return"
  | "kit"
  | "import"
  | "inventory";

export interface UnifiedStockMovement extends Partial<BaseDocument> {
  id: string;
  tenantId: string;
  productId: string;
  productSku: string;
  productName: string;
  previousStock: number;
  newStock: number;
  quantityChanged: number;
  type: StockMovementType;
  origin: StockMovementOrigin;
  channel?: MarketplaceChannel;
  orderId?: string;
  channelOrderId?: string;
  reason: string;
  userId?: string;
  userEmail?: string;
  idempotencyKey?: string;
  isKitComponent?: boolean;
  parentKitId?: string;
  timestamp: string; // ISO Date
  createdAt: string;
}

export interface StockDeductionInput {
  tenantId: string;
  productId?: string;
  sku?: string;
  marketplaceSku?: string;
  quantity: number;
  origin: StockMovementOrigin;
  channel?: MarketplaceChannel;
  orderId?: string;
  channelOrderId?: string;
  reason: string;
  userId?: string;
  userEmail?: string;
  idempotencyKey?: string;
}

export interface StockReturnInput {
  tenantId: string;
  productId?: string;
  sku?: string;
  quantity: number;
  origin: StockMovementOrigin;
  channel?: MarketplaceChannel;
  orderId?: string;
  channelOrderId?: string;
  reason: string;
  userId?: string;
  idempotencyKey?: string;
}

export interface StockAdjustmentInput {
  tenantId: string;
  productId: string;
  newStock: number;
  reason: string;
  userId?: string;
  userEmail?: string;
  origin?: StockMovementOrigin;
}

export interface PairedProductResult {
  productId: string;
  productSku: string;
  productName: string;
  erpStock: number;
  isKit?: boolean;
  marketplaceItemId?: string;
  marketplaceSku?: string;
  channel?: MarketplaceChannel;
}

export interface TenantStockConfig extends Partial<BaseDocument> {
  id?: string;
  tenantId: string;
  autoSyncStock: boolean;          // Default true
  allowNegativeStock: boolean;     // Default false
  syncMode: "immediate" | "batch"; // Default immediate
  syncIntervalMinutes: number;     // Default 5
  deductTrigger: "paid" | "shipped" | "confirmed"; // Default paid
  minSafetyStock: number;          // Default 0
  syncActiveOnly: boolean;         // Default true
  createdAt?: string;
  updatedAt?: string;
}

export type StockSyncStatusType = "synced" | "pending" | "syncing" | "error" | "unpaired";

export interface StockChannelSyncDetail {
  channel: MarketplaceChannel;
  marketplaceItemId: string;
  externalSku?: string;
  syncedStock: number;
  syncStatus: StockSyncStatusType;
  lastSyncAt?: string;
  errorMessage?: string;
}

export interface StockItemSummary {
  productId: string;
  sku: string;
  name: string;
  erpStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  isKit: boolean;
  kitComponentsCount?: number;
  channels: StockChannelSyncDetail[];
  overallStatus: StockSyncStatusType;
  lastSyncAt?: string;
}

export interface UnifiedStockDashboardMetrics {
  totalErpProducts: number;
  totalSyncedProducts: number;
  totalPendingSync: number;
  totalSyncErrors: number;
  totalUnpairedProducts: number;
  totalKitsCount: number;
  totalStockMovementsToday: number;
  lastGlobalSyncAt?: string;
}
