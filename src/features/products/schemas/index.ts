import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  slug: z.string().min(2, "Slug inválido"),
});

export const BrandSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
});

export const StockLocationSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  isVirtual: z.boolean().default(false),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const ProductSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  name: z.string().min(2, "O nome do produto é obrigatório"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  EAN: z.string().regex(/^\d{8,14}$/, "EAN deve ser numérico e ter de 8 a 14 dígitos").or(z.string().length(0)).optional(),
  NCM: z.string().regex(/^\d{8}$/, "NCM deve conter exatamente 8 dígitos numéricos").or(z.string().length(0)).optional(),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  brandId: z.string().min(1, "Selecione uma marca"),
  supplierId: z.string().optional(),
  costPrice: z.number().min(0, "Preço de custo não pode ser negativo"),
  freightCost: z.number().min(0).optional(),
  insuranceCost: z.number().min(0).optional(),
  taxCost: z.number().min(0).optional(),
  otherExpenses: z.number().min(0).optional(),
  freightMode: z.enum(["unit", "apportionment"]).optional(),
  totalFreightCost: z.number().min(0).optional(),
  totalFreightUnits: z.number().min(0).optional(),
  totalAcquisitionCost: z.number().min(0).optional(),
  sellPrice: z.number().gt(0, "Preço de venda deve ser maior que zero"),
  promoPrice: z.number().min(0, "Preço promocional não pode ser negativo").optional(),
  minStock: z.number().min(0, "Estoque mínimo não pode ser negativo").default(0),
  weightGrams: z.number().min(0, "Peso não pode ser negativo").optional(),
  dimensions: z.object({
    width: z.number().min(0, "Largura não pode ser negativa"),
    height: z.number().min(0, "Altura não pode ser negativa"),
    depth: z.number().min(0, "Profundidade não pode ser negativa"),
  }).optional(),
  pricingData: z.any().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});
