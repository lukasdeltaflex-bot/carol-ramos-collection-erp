import { z } from "zod";

export const SupplierSchema = z.object({
  name: z.string().min(2, "Razão Social deve conter pelo menos 2 caracteres"),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  ie: z.string().optional(),
  im: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  logo: z.string().optional(),
  
  // Contact
  email: z.string().email("Formato de e-mail inválido").or(z.string().length(0)).optional(),
  phone: z.string().optional(),
  isWhatsapp: z.boolean().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  
  // Representative
  contactPerson: z.string().optional(),
  contactRole: z.string().optional(),
  contactDepartment: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Formato de e-mail inválido").or(z.string().length(0)).optional(),
  contactIsWhatsapp: z.boolean().optional(),
  
  // Address
  address: z.object({
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  
  // Commercial
  category: z.string().optional(),
  specialty: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().nonnegative().optional().or(z.string().transform(v => parseInt(v) || 0).pipe(z.number().int().nonnegative())),
  bankName: z.string().optional(),
  bankAgency: z.string().optional(),
  bankAccount: z.string().optional(),
  pixKey: z.string().optional(),
  creditLimit: z.number().nonnegative().optional().or(z.string().transform(v => parseFloat(v) || 0).pipe(z.number().nonnegative())),
  
  // Additional
  notes: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional(),
});
