import { FinancialTransaction } from "../types";

export interface FinancialCategory {
  id: string; // Identificador imutável da categoria (ex: "rent", "freight", "cat_1731888000")
  name: string; // Nome legível (ex: "Aluguel Sala", "Frete & Logística")
  type: "expense" | "revenue"; // Tipo exclusivo da categoria
  color?: string; // Cor ou classe para destaque visual
  icon?: string;
  isSystem?: boolean; // Categorias padrão do sistema
  status: "active" | "archived"; // active ou archived
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Categorias Padrão Iniciais do Carol Ramos Collection ERP.
 * Mantém 100% de retrocompatibilidade com lançamentos históricos existentes.
 */
export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  // 1. Despesas
  { id: "other", name: "Outros Lançamentos", type: "expense", color: "#64748b", isSystem: true, status: "active" },
  { id: "rent", name: "Aluguel / Condomínio", type: "expense", color: "#8b5cf6", isSystem: true, status: "active" },
  { id: "marketing", name: "Marketing & Tráfego", type: "expense", color: "#ec4899", isSystem: true, status: "active" },
  { id: "salary", name: "Salários & Pró-Labore", type: "expense", color: "#3b82f6", isSystem: true, status: "active" },
  { id: "stock_purchase", name: "Compra de Mercadorias", type: "expense", color: "#f59e0b", isSystem: true, status: "active" },
  { id: "card_invoice_payment", name: "Pagamento Fatura Cartão", type: "expense", color: "#ef4444", isSystem: true, status: "active" },
  { id: "freight", name: "Frete & Logística", type: "expense", color: "#06b6d4", isSystem: true, status: "active" },
  { id: "packaging", name: "Embalagens", type: "expense", color: "#10b981", isSystem: true, status: "active" },
  { id: "taxes", name: "Impostos & Tributos", type: "expense", color: "#e11d48", isSystem: true, status: "active" },
  
  // 2. Receitas
  { id: "sale", name: "Venda de Produtos", type: "revenue", color: "#10b981", isSystem: true, status: "active" },
  { id: "services", name: "Serviços Prestados", type: "revenue", color: "#3b82f6", isSystem: true, status: "active" },
  { id: "cash_register_adjustment", name: "Ajuste de Caixa", type: "revenue", color: "#8b5cf6", isSystem: true, status: "active" },
  { id: "financial_income", name: "Rendimentos Financeiros", type: "revenue", color: "#06b6d4", isSystem: true, status: "active" },
  { id: "other_revenue", name: "Outras Receitas", type: "revenue", color: "#64748b", isSystem: true, status: "active" }
];

export interface FinancialDbInterface {
  getDocs?: (collectionName: string) => Promise<any[]>;
  getDocById?: (collectionName: string, id: string) => Promise<any>;
  updateDoc?: (collectionName: string, id: string, data: any) => Promise<any>;
  createDoc?: (collectionName: string, data: any) => Promise<any>;
}

/**
 * Carrega a lista completa de categorias do Firestore para o tenant,
 * mesclando categorias personalizadas salvas e categorias padrão do sistema.
 */
export async function getFinancialCategories(
  tenantId: string,
  db: FinancialDbInterface
): Promise<FinancialCategory[]> {
  const currentTenant = tenantId || "carol-ramos-collection";

  try {
    if (db.getDocs) {
      const configs = await db.getDocs("integration_configs");
      const found = (configs || []).find(
        (c: any) =>
          c.channel === "financial_categories" &&
          (c.tenantId === currentTenant || c.tenantId === "shared")
      );

      if (found && Array.isArray(found.categories) && found.categories.length > 0) {
        // Assegura que todas as categorias padrão que não foram arquivadas estejam presentes
        const saved: FinancialCategory[] = found.categories;
        const savedIds = new Set(saved.map(c => c.id));
        const merged = [...saved];

        for (const def of DEFAULT_FINANCIAL_CATEGORIES) {
          if (!savedIds.has(def.id)) {
            merged.push(def);
          }
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn("[financialCategoriesService] Aviso ao carregar categorias do Firestore, usando padrões:", err);
  }

  return [...DEFAULT_FINANCIAL_CATEGORIES];
}

/**
 * Salva a lista de categorias do tenant de forma persistente no Firestore.
 */
export async function saveFinancialCategories(
  tenantId: string,
  categories: FinancialCategory[],
  db: FinancialDbInterface
): Promise<FinancialCategory[]> {
  const currentTenant = tenantId || "carol-ramos-collection";
  const now = new Date().toISOString();

  if (db.getDocs && db.updateDoc && db.createDoc) {
    const configs = await db.getDocs("integration_configs");
    const existing = (configs || []).find(
      (c: any) =>
        c.channel === "financial_categories" &&
        (c.tenantId === currentTenant || c.tenantId === "shared")
    );

    if (existing && existing.id) {
      await db.updateDoc("integration_configs", existing.id, {
        categories,
        updatedAt: now
      });
    } else {
      await db.createDoc("integration_configs", {
        tenantId: currentTenant,
        channel: "financial_categories",
        type: "financial_categories",
        categories,
        createdAt: now,
        updatedAt: now
      });
    }

    // Sincroniza em companies/{tenantId} se possível
    if (db.updateDoc) {
      try {
        await db.updateDoc("companies", currentTenant, {
          financialCategories: categories
        });
      } catch {
        // Fallback silencioso
      }
    }
  }

  return categories;
}

/**
 * Cria uma nova categoria com validações rigorosas:
 * - Não permite nomes vazios
 * - Não permite duplicadas dentro do mesmo tipo (case-insensitive)
 * - Gera ID persistente
 */
export async function createFinancialCategory(
  tenantId: string,
  data: {
    name: string;
    type: "expense" | "revenue";
    color?: string;
  },
  currentCategories: FinancialCategory[],
  db: FinancialDbInterface
): Promise<{ categories: FinancialCategory[]; created: FinancialCategory }> {
  const trimmedName = data.name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("O nome da categoria deve conter pelo menos 2 caracteres.");
  }

  // Verifica duplicidade no mesmo tipo
  const hasDuplicate = currentCategories.some(
    c => c.type === data.type && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (hasDuplicate) {
    throw new Error(`Já existe uma categoria de ${data.type === "expense" ? "despesa" : "receita"} com o nome "${trimmedName}".`);
  }

  // Gera slug seguro
  const slug = trimmedName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const id = `cat_${slug || Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newCategory: FinancialCategory = {
    id,
    name: trimmedName,
    type: data.type,
    color: data.color || (data.type === "revenue" ? "#10b981" : "#ef4444"),
    isSystem: false,
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  const updatedList = [...currentCategories, newCategory];
  await saveFinancialCategories(tenantId, updatedList, db);

  return { categories: updatedList, created: newCategory };
}

/**
 * Edita uma categoria existente preservando seu identificador ID,
 * garantindo que lançamentos históricos continuem relacionados corretamente.
 */
export async function updateFinancialCategory(
  tenantId: string,
  categoryId: string,
  data: {
    name: string;
    color?: string;
  },
  currentCategories: FinancialCategory[],
  db: FinancialDbInterface
): Promise<FinancialCategory[]> {
  const trimmedName = data.name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("O nome da categoria deve conter pelo menos 2 caracteres.");
  }

  const categoryIndex = currentCategories.findIndex(c => c.id === categoryId);
  if (categoryIndex === -1) {
    throw new Error("Categoria não encontrada.");
  }

  const existingCategory = currentCategories[categoryIndex];

  // Verifica duplicidade com outra categoria do mesmo tipo
  const hasDuplicate = currentCategories.some(
    c => c.id !== categoryId && c.type === existingCategory.type && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (hasDuplicate) {
    throw new Error(`Já existe outra categoria de ${existingCategory.type === "expense" ? "despesa" : "receita"} com o nome "${trimmedName}".`);
  }

  const now = new Date().toISOString();
  const updatedCategory: FinancialCategory = {
    ...existingCategory,
    name: trimmedName,
    color: data.color || existingCategory.color,
    updatedAt: now
  };

  const updatedList = [...currentCategories];
  updatedList[categoryIndex] = updatedCategory;

  await saveFinancialCategories(tenantId, updatedList, db);
  return updatedList;
}

/**
 * Exclui ou arquiva uma categoria com proteção total do histórico financeiro:
 * - Se existirem lançamentos vinculados, impede a exclusão direta desprotegida.
 * - Oferece reclassificação de lançamentos para outra categoria de destino.
 * - Ou arquivamento seguro (status: "archived") sem apagar referências.
 */
export async function deleteFinancialCategory(
  tenantId: string,
  categoryId: string,
  currentCategories: FinancialCategory[],
  transactions: FinancialTransaction[],
  options?: {
    reclassifyToId?: string; // Se fornecido, move os lançamentos antes de excluir
    archiveInstead?: boolean; // Se fornecido, arquiva em vez de remover da lista
  },
  db?: FinancialDbInterface
): Promise<{
  success: boolean;
  categories: FinancialCategory[];
  reclassifiedCount?: number;
  archived?: boolean;
}> {
  const category = currentCategories.find(c => c.id === categoryId);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  // Conta lançamentos vinculados no histórico
  const linkedTransactions = transactions.filter(t => t.category === categoryId);
  const linkedCount = linkedTransactions.length;

  // Se houver lançamentos vinculados e nenhuma ação segura foi escolhida
  if (linkedCount > 0 && !options?.reclassifyToId && !options?.archiveInstead) {
    throw new Error(
      `A categoria "${category.name}" possui ${linkedCount} ${linkedCount === 1 ? "lançamento vinculado" : "lançamentos vinculados"} no fluxo financeiro. Escolha uma categoria de destino para reclassificar ou utilize o arquivamento.`
    );
  }

  // 1. Caso de Arquivamento
  if (options?.archiveInstead) {
    const updatedList = currentCategories.map(c =>
      c.id === categoryId ? { ...c, status: "archived" as const, updatedAt: new Date().toISOString() } : c
    );
    if (db) await saveFinancialCategories(tenantId, updatedList, db);
    return { success: true, categories: updatedList, archived: true };
  }

  // 2. Caso de Reclassificação dos Lançamentos Vinculados
  if (options?.reclassifyToId) {
    const destCat = currentCategories.find(c => c.id === options.reclassifyToId);
    if (!destCat) {
      throw new Error("Categoria de destino para reclassificação não foi encontrada.");
    }

    if (db && db.updateDoc) {
      for (const t of linkedTransactions) {
        await db.updateDoc("financial_transactions", t.id, {
          category: options.reclassifyToId,
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  // 3. Remove a categoria da lista
  const updatedList = currentCategories.filter(c => c.id !== categoryId);
  if (db) await saveFinancialCategories(tenantId, updatedList, db);

  return {
    success: true,
    categories: updatedList,
    reclassifiedCount: linkedCount
  };
}

/**
 * Retorna o nome amigável de uma categoria a partir do seu ID
 */
export function getCategoryLabelFromList(
  categoryId: string,
  categories: FinancialCategory[] = DEFAULT_FINANCIAL_CATEGORIES
): string {
  const found = categories.find(c => c.id === categoryId);
  if (found) return found.name;

  // Fallback para códigos pré-existentes
  switch (categoryId) {
    case "sale": return "Venda de Produtos";
    case "rent": return "Aluguel / Condomínio";
    case "marketing": return "Marketing & Tráfego";
    case "salary": return "Salários & Pró-Labore";
    case "stock_purchase": return "Compra de Mercadorias";
    case "card_invoice_payment": return "Pagamento Fatura Cartão";
    case "cash_register_adjustment": return "Ajuste de Caixa";
    case "freight": return "Frete & Logística";
    case "packaging": return "Embalagens";
    case "taxes": return "Impostos & Tributos";
    case "services": return "Serviços Prestados";
    case "financial_income": return "Rendimentos Financeiros";
    case "other_revenue": return "Outras Receitas";
    default: return categoryId || "Outros Lançamentos";
  }
}
