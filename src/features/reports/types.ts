import { BaseDocument } from "@/types/shared";

export type ReportCategory = 
  | "sales" 
  | "products" 
  | "finance" 
  | "customers" 
  | "suppliers" 
  | "purchases" 
  | "stock" 
  | "companies";

export interface ReportDefinition {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  iconName: string;
  rolesAllowed?: string[];
  isFavorite?: boolean;
}

export interface ReportFilterState {
  period: "today" | "yesterday" | "7days" | "30days font-mono" | "this_month" | "custom";
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  productId?: string;
  customerId?: string;
  supplierId?: string;
  paymentMethod?: string;
  status?: string;
}

export interface ScheduledReport extends Partial<BaseDocument> {
  tenantId: string;
  reportId: string;
  reportTitle: string;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  format: "pdf" | "excel";
  active: boolean;
  nextRunDate: string;
}
