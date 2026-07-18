import { z } from "zod";

export const AppointmentSchema = z.object({
  customerId: z.string().min(1, "Selecione um cliente"),
  serviceName: z.string().min(2, "Nome do serviço é obrigatório"),
  price: z.number().positive("O preço do serviço deve ser maior que zero"),
  professionalName: z.string().min(2, "Nome do profissional é obrigatório"),
  dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data e horário inválidos (formato: AAAA-MM-DDTHH:MM)"),
  durationMinutes: z.number().int().positive("A duração deve ser maior que zero"),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).default("scheduled"),
  notes: z.string().optional(),
});
