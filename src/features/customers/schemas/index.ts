import { z } from "zod";

export const AddressSchema = z.object({
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado deve conter a sigla de 2 letras (ex: SP)"),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido (formato: XXXXX-XXX ou XXXXXXXX)"),
});

export const CustomerSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido").or(z.string().length(0)).optional(),
  phone: z.string().min(8, "Telefone inválido"),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido").or(z.string().length(0)).optional(),
  instagram: z.string().optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (AAAA-MM-DD)").or(z.string().length(0)).optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().min(1, "Canal de aquisição/origem é obrigatório"),
  notes: z.string().optional(),
  address: AddressSchema.optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(2, "O nome do fornecedor é obrigatório"),
  cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "CNPJ inválido").or(z.string().length(0)).optional(),
  email: z.string().email("E-mail inválido").or(z.string().length(0)).optional(),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: AddressSchema.optional(),
});
