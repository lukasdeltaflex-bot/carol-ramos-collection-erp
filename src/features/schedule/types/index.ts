import { BaseDocument } from "@/types/shared";

export interface Appointment extends BaseDocument {
  tenantId: string;
  customerId: string; // References Customer
  customerName: string; // Denormalized for display speed
  customerPhone: string; // Used for WhatsApp reminders
  serviceName: string; // e.g. "Maquiagem Social", "Limpeza de Pele", etc.
  price: number;
  professionalName: string; // e.g. "Carol Ramos"
  dateTime: string; // ISO String (date + time)
  durationMinutes: number; // e.g. 60, 90, 120
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  saleId?: string; // Links to generated POS sale once completed
}
