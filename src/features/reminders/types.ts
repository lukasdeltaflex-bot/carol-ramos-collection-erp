import { BaseDocument } from "@/types/shared";

export type ReminderCategory = "idea" | "task" | "reminder" | "meeting" | "other";
export type ReminderPriority = "low" | "medium" | "high" | "urgent";
export type ReminderStatus = "pending" | "in_progress" | "completed" | "archived";

export interface Reminder extends BaseDocument {
  tenantId: string;
  title: string;
  description?: string;
  category: ReminderCategory;
  priority: ReminderPriority;
  creationDate: string; // YYYY-MM-DD
  dueDate?: string;     // YYYY-MM-DD
  dueTime?: string;     // HH:MM
  color?: string;       // Hex or CSS color
  tags?: string[];      // Array of tags
  responsiblePerson?: string;
  status: ReminderStatus;
  isFavorite?: boolean;
  isPinned?: boolean;
}
