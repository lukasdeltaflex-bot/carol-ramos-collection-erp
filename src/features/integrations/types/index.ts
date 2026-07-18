import { BaseDocument } from "@/types/shared";

export interface IntegrationConfig extends BaseDocument {
  tenantId: string;
  channel: 'shopee' | 'mercado_libre' | 'whatsapp';
  status: 'connected' | 'disconnected' | 'error';
  credentials: {
    shopId?: string;
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    phoneId?: string;
    wabaId?: string;
  };
  lastSyncAt?: string;
}

export interface IntegrationLog extends BaseDocument {
  tenantId: string;
  channel: 'shopee' | 'mercado_libre' | 'whatsapp';
  type: 'webhook' | 'sync_stock' | 'sync_order' | 'notification';
  status: 'success' | 'failed';
  message: string;
  payload?: any;
}

export interface Automation extends BaseDocument {
  tenantId: string;
  name: string;
  trigger: 'sale_completed' | 'customer_created' | 'appointment_confirmed';
  actionType: 'whatsapp_message' | 'email_message' | 'discount_coupon';
  template: string;
  status: 'active' | 'inactive';
}
