export type SortDirection = "asc" | "desc";

export interface ColumnSortState {
  column: string;
  direction: SortDirection;
}

export interface TextFilter {
  type: "text";
  value: string;
  mode?: "contains" | "exact" | "starts_with";
}

export interface DateFilter {
  type: "date";
  mode: "exact" | "range";
  exactDate?: string;
  startDate?: string;
  endDate?: string;
}

export interface CurrencyFilter {
  type: "currency";
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "between";
  value?: number;
  secondValue?: number;
}

export interface SelectFilter {
  type: "select";
  selectedValues: string[];
}

export type ColumnFilter = TextFilter | DateFilter | CurrencyFilter | SelectFilter;

/**
 * Remove acentos, diacríticos e normaliza espaços para busca insensível a maiúsculas/minúsculas.
 */
export function normalizeText(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['`’´]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Converte datas de diversos formatos (Firestore Timestamp, ISO, DD/MM/YYYY, Date) em milissegundos UTC.
 */
export function parseDateToMillis(value: any): number | null {
  if (!value) return null;

  // 1. Objeto Date nativo
  if (value instanceof Date) {
    const time = value.getTime();
    return isNaN(time) ? null : time;
  }

  // 2. Firestore Timestamp { seconds, nanoseconds } ou com método .toDate()
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      try {
        const d = value.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : null;
      } catch {
        // segue para verificação de seconds
      }
    }
    if (typeof value.seconds === "number") {
      const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
      return isNaN(ms) ? null : ms;
    }
  }

  // 3. String de data
  if (typeof value === "string") {
    const str = value.trim();
    if (!str) return null;

    // Formato brasileiro DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 12;
      const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
      const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      return isNaN(d.getTime()) ? null : d.getTime();
    }

    // Formato YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 12;
      const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
      const sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      return isNaN(d.getTime()) ? null : d.getTime();
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // 4. Timestamp numérico em ms
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  return null;
}

/**
 * Avalia se um texto corresponde ao filtro de texto.
 */
export function matchText(itemValue: any, filter: TextFilter): boolean {
  if (!filter.value || !filter.value.trim()) return true;
  const target = normalizeText(itemValue);
  const search = normalizeText(filter.value);

  if (!search) return true;

  switch (filter.mode) {
    case "exact":
      return target === search;
    case "starts_with":
      return target.startsWith(search);
    case "contains":
    default:
      return target.includes(search);
  }
}

/**
 * Avalia se uma data corresponde ao filtro de data (específica ou intervalo de/até).
 */
export function matchDate(itemDate: any, filter: DateFilter): boolean {
  const itemMillis = parseDateToMillis(itemDate);
  if (itemMillis === null) return false;

  const itemD = new Date(itemMillis);
  // Normaliza o item para início do dia local para comparação segura de datas
  const itemDayStart = new Date(itemD.getFullYear(), itemD.getMonth(), itemD.getDate(), 0, 0, 0, 0).getTime();

  if (filter.mode === "exact") {
    if (!filter.exactDate) return true;
    const exactMillis = parseDateToMillis(filter.exactDate);
    if (exactMillis === null) return true;
    const exactD = new Date(exactMillis);
    const exactDayStart = new Date(exactD.getFullYear(), exactD.getMonth(), exactD.getDate(), 0, 0, 0, 0).getTime();
    return itemDayStart === exactDayStart;
  }

  if (filter.mode === "range") {
    const hasStart = Boolean(filter.startDate);
    const hasEnd = Boolean(filter.endDate);

    if (!hasStart && !hasEnd) return true;

    if (hasStart) {
      const startMillis = parseDateToMillis(filter.startDate);
      if (startMillis !== null) {
        const startD = new Date(startMillis);
        const startDayStart = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 0, 0, 0, 0).getTime();
        if (itemDayStart < startDayStart) return false;
      }
    }

    if (hasEnd) {
      const endMillis = parseDateToMillis(filter.endDate);
      if (endMillis !== null) {
        const endD = new Date(endMillis);
        const endDayStart = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 0, 0, 0, 0).getTime();
        if (itemDayStart > endDayStart) return false;
      }
    }

    return true;
  }

  return true;
}

/**
 * Avalia se um valor numérico / moeda atende à condição configurada.
 */
export function matchCurrency(amount: any, filter: CurrencyFilter): boolean {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0).replace(",", "."));
  if (isNaN(num)) return false;

  const target = filter.value;
  if (target === undefined || target === null || isNaN(target)) {
    // Se não informou valor, não restringe
    return true;
  }

  switch (filter.operator) {
    case "eq":
      return Math.abs(num - target) < 0.001;
    case "gt":
      return num > target;
    case "gte":
      return num >= target;
    case "lt":
      return num < target;
    case "lte":
      return num <= target;
    case "between": {
      const second = filter.secondValue;
      if (second === undefined || second === null || isNaN(second)) {
        return num >= target;
      }
      const min = Math.min(target, second);
      const max = Math.max(target, second);
      return num >= min && num <= max;
    }
    default:
      return true;
  }
}

/**
 * Avalia se o valor do item está contido na lista de valores selecionados.
 */
export function matchSelect(itemValue: any, filter: SelectFilter): boolean {
  if (!filter.selectedValues || filter.selectedValues.length === 0) return true;
  const str = String(itemValue || "").trim();
  return filter.selectedValues.includes(str);
}
