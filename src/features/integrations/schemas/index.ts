import { z } from "zod";

export const IntegrationConfigSchema = z.object({
  channel: z.enum(["shopee", "mercado_libre", "whatsapp"]),
  status: z.enum(["connected", "disconnected", "error"]).default("disconnected"),
  credentials: z.object({
    shopId: z.string().optional(),
    apiKey: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    phoneId: z.string().optional(),
    wabaId: z.string().optional(),
  }),
});

export const AutomationSchema = z.object({
  name: z.string().min(3, "Nome da regra deve conter pelo menos 3 caracteres"),
  trigger: z.enum(["sale_completed", "customer_created", "appointment_confirmed"]),
  actionType: z.enum(["whatsapp_message", "email_message", "discount_coupon"]),
  template: z.string().min(5, "O template/mensagem da ação deve conter pelo menos 5 caracteres"),
  status: z.enum(["active", "inactive"]).default("active"),
});
