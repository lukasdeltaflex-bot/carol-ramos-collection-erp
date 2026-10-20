import { ColumnDefinition, CustomFilterGroup, FilterCondition, FilterOperator } from "../types/filters";

/**
 * Remove acentos e converte para minúsculas para busca robusta em português
 */
export function normalizeText(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Converte valor para número de forma segura (suportando formato brasileiro R$ 1.234,56 ou 1234.56)
 */
export function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;

  const str = String(value).trim();
  // Remove "R$", espaços, e troca separador de milhar por nada e vírgula decimal por ponto
  const cleaned = str
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(,|$|\.))/g, "")
    .replace(",", ".");

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Converte qualquer representação de data (ISO, DD/MM/AAAA, Firestore Timestamp, Date) para Date válida
 */
export function parseToDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  // Objeto Firestore Timestamp com toDate()
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  // Objeto serializado { seconds: 123456789 }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  // String
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Formato brasileiro DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      const parts = trimmed.split("/");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2].slice(0, 4), 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // Formato ISO ou AAAA-MM-DD
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Normaliza o início do dia (00:00:00.000)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Normaliza o final do dia (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Avalia se um item atende a uma condição de filtro individual
 */
export function evaluateCondition(
  item: any,
  condition: FilterCondition,
  columnDefs: ColumnDefinition[]
): boolean {
  if (!condition.field) return true;

  const colDef = columnDefs.find((c) => c.id === condition.field);
  const rawValue = colDef ? colDef.getValue(item) : item[condition.field];

  const operator = condition.operator;
  const targetValue = condition.value;
  const secondValue = condition.secondValue;

  // 1. Operadores de Preenchimento (válidos para qualquer tipo)
  if (operator === "is_filled") {
    if (rawValue === null || rawValue === undefined) return false;
    if (typeof rawValue === "string" && rawValue.trim() === "") return false;
    return true;
  }

  if (operator === "is_empty") {
    if (rawValue === null || rawValue === undefined) return true;
    if (typeof rawValue === "string" && rawValue.trim() === "") return true;
    return false;
  }

  // 2. Operadores de Texto
  if (
    operator === "contains" ||
    operator === "not_contains" ||
    operator === "equals" ||
    operator === "not_equals" ||
    operator === "starts_with"
  ) {
    const strVal = normalizeText(rawValue);
    const targetStr = normalizeText(targetValue);

    if (operator === "contains") {
      return strVal.includes(targetStr);
    }
    if (operator === "not_contains") {
      return !strVal.includes(targetStr);
    }
    if (operator === "equals") {
      return strVal === targetStr;
    }
    if (operator === "not_equals") {
      return strVal !== targetStr;
    }
    if (operator === "starts_with") {
      return strVal.startsWith(targetStr);
    }
  }

  // 3. Operadores Numéricos / Monetários
  if (
    operator === "eq" ||
    operator === "neq" ||
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte" ||
    (operator === "between" && colDef?.type === "number")
  ) {
    const numVal = parseNumeric(rawValue);
    const targetNum = parseNumeric(targetValue);
    const secNum = parseNumeric(secondValue);

    if (numVal === null) return false;
    if (targetNum === null) return true;

    // Margem de tolerância para comparações de float (centavos)
    const EPSILON = 0.001;

    if (operator === "eq") {
      return Math.abs(numVal - targetNum) < EPSILON;
    }
    if (operator === "neq") {
      return Math.abs(numVal - targetNum) >= EPSILON;
    }
    if (operator === "gt") {
      return numVal > targetNum + EPSILON;
    }
    if (operator === "gte") {
      return numVal >= targetNum - EPSILON;
    }
    if (operator === "lt") {
      return numVal < targetNum - EPSILON;
    }
    if (operator === "lte") {
      return numVal <= targetNum + EPSILON;
    }
    if (operator === "between") {
      if (secNum === null) return numVal >= targetNum - EPSILON;
      const min = Math.min(targetNum, secNum);
      const max = Math.max(targetNum, secNum);
      return numVal >= min - EPSILON && numVal <= max + EPSILON;
    }
  }

  // 4. Operadores de Data
  if (
    operator === "before" ||
    operator === "after" ||
    (operator === "between" && colDef?.type === "date") ||
    operator === "last_7_days" ||
    operator === "last_30_days" ||
    operator === "this_month" ||
    operator === "last_month"
  ) {
    const itemDate = parseToDate(rawValue);
    if (!itemDate) return false;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (operator === "last_7_days") {
      const past7 = new Date(todayStart);
      past7.setDate(past7.getDate() - 7);
      return itemDate >= past7 && itemDate <= todayEnd;
    }

    if (operator === "last_30_days") {
      const past30 = new Date(todayStart);
      past30.setDate(past30.getDate() - 30);
      return itemDate >= past30 && itemDate <= todayEnd;
    }

    if (operator === "this_month") {
      return (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      );
    }

    if (operator === "last_month") {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return (
        itemDate.getFullYear() === prevYear &&
        itemDate.getMonth() === prevMonth
      );
    }

    const targetDate = parseToDate(targetValue);
    if (!targetDate) return true;

    if (operator === "before") {
      return itemDate < startOfDay(targetDate);
    }
    if (operator === "after") {
      return itemDate > endOfDay(targetDate);
    }
    if (operator === "between") {
      const secondDate = parseToDate(secondValue);
      if (!secondDate) return itemDate >= startOfDay(targetDate);
      const minDate = startOfDay(targetDate < secondDate ? targetDate : secondDate);
      const maxDate = endOfDay(targetDate > secondDate ? targetDate : secondDate);
      return itemDate >= minDate && itemDate <= maxDate;
    }
  }

  // 5. Operador 'in' (conjunto de opções / seleção múltipla)
  if (operator === "in") {
    if (Array.isArray(targetValue)) {
      if (targetValue.length === 0) return true;
      const normRaw = normalizeText(rawValue);
      return targetValue.some((tv) => normalizeText(tv) === normRaw);
    }
    return normalizeText(rawValue) === normalizeText(targetValue);
  }

  return true;
}

/**
 * Aplica um grupo completo de filtros customizados a uma lista de registros
 */
export function applyCustomFilters<T = any>(
  items: T[],
  filterGroup: CustomFilterGroup,
  columnDefs: ColumnDefinition<T>[]
): T[] {
  if (!filterGroup || !filterGroup.conditions || filterGroup.conditions.length === 0) {
    return items;
  }

  // Filtra condições válidas (que possuem campo preenchido e valor adequado se não for is_empty/is_filled/period)
  const activeConditions = filterGroup.conditions.filter((cond) => {
    if (!cond.field) return false;
    if (
      cond.operator === "is_filled" ||
      cond.operator === "is_empty" ||
      cond.operator === "last_7_days" ||
      cond.operator === "last_30_days" ||
      cond.operator === "this_month" ||
      cond.operator === "last_month"
    ) {
      return true;
    }
    if (cond.value === null || cond.value === undefined || cond.value === "") {
      return false;
    }
    if (Array.isArray(cond.value) && cond.value.length === 0) {
      return false;
    }
    return true;
  });

  if (activeConditions.length === 0) {
    return items;
  }

  const isOr = filterGroup.logicalOperator === "OR";

  return items.filter((item) => {
    if (isOr) {
      return activeConditions.some((cond) => evaluateCondition(item, cond, columnDefs));
    }
    return activeConditions.every((cond) => evaluateCondition(item, cond, columnDefs));
  });
}

/**
 * Operadores suportados organizados por tipo de campo
 */
export const OPERATORS_BY_FIELD_TYPE: Record<
  string,
  Array<{ value: FilterOperator; label: string; requiresSecondValue?: boolean; noValue?: boolean }>
> = {
  text: [
    { value: "contains", label: "Contém" },
    { value: "not_contains", label: "Não contém" },
    { value: "equals", label: "É exatamente igual a" },
    { value: "not_equals", label: "É diferente de" },
    { value: "starts_with", label: "Começa com" },
    { value: "is_filled", label: "Está preenchido", noValue: true },
    { value: "is_empty", label: "Está vazio", noValue: true },
  ],
  number: [
    { value: "eq", label: "Igual a (=)" },
    { value: "neq", label: "Diferente de (≠)" },
    { value: "gt", label: "Maior que (>)" },
    { value: "gte", label: "Maior ou igual a (≥)" },
    { value: "lt", label: "Menor que (<)" },
    { value: "lte", label: "Menor ou igual a (≤)" },
    { value: "between", label: "Entre dois valores", requiresSecondValue: true },
    { value: "is_filled", label: "Está preenchido", noValue: true },
    { value: "is_empty", label: "Está vazio / zero", noValue: true },
  ],
  date: [
    { value: "equals", label: "Na data exata" },
    { value: "before", label: "Antes de" },
    { value: "after", label: "Depois de" },
    { value: "between", label: "Entre duas datas (Período)", requiresSecondValue: true },
    { value: "last_7_days", label: "Últimos 7 dias", noValue: true },
    { value: "last_30_days", label: "Últimos 30 dias", noValue: true },
    { value: "this_month", label: "Este mês", noValue: true },
    { value: "last_month", label: "Mês anterior", noValue: true },
    { value: "is_filled", label: "Possui data", noValue: true },
    { value: "is_empty", label: "Sem data", noValue: true },
  ],
  status: [
    { value: "equals", label: "É igual a" },
    { value: "not_equals", label: "É diferente de" },
    { value: "in", label: "É um de (Vários)" },
  ],
  category: [
    { value: "equals", label: "É igual a" },
    { value: "not_equals", label: "É diferente de" },
    { value: "in", label: "É um de" },
    { value: "contains", label: "Contém texto" },
  ],
  select: [
    { value: "equals", label: "É igual a" },
    { value: "not_equals", label: "É diferente de" },
    { value: "in", label: "É um de" },
  ],
};
