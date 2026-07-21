import { BaseDocument } from "@/types/shared";

export type NotificationCategory = "financial" | "stock" | "schedule" | "customer" | "system" | "reminder";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface SystemNotification extends BaseDocument {
  tenantId: string;
  title: string;
  description: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
  companyName?: string;
  iconName?: string;
  actionUrl?: string;
}

export interface NotificationSettings extends Partial<BaseDocument> {
  tenantId: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  sendTime: string; // HH:MM
  frequency: "daily" | "weekly" | "realtime";
  signature?: string;
  activeCategories: {
    financialPayables: boolean;
    financialOverduePayables: boolean;
    financialReceivables: boolean;
    financialOverdueReceivables: boolean;
    scheduleDaily: boolean;
    scheduleUpcoming: boolean;
    scheduleMeetings: boolean;
    customerBirthdays: boolean;
    customerPostSale: boolean;
    stockLow: boolean;
    stockOut: boolean;
    systemBackups: boolean;
    systemNewUser: boolean;
    systemCriticalErrors: boolean;
  };
  recipients: {
    admin: boolean;
    manager: boolean;
    financial: boolean;
    commercial: boolean;
    customEmails: string[];
  };
}

export interface EmailTemplate extends Partial<BaseDocument> {
  tenantId?: string;
  category: NotificationCategory;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}
