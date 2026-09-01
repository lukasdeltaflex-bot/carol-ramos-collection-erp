/**
 * Utilitário Central de Normalização de Datas
 * 
 * Garante compatibilidade arquitetural e retrocompatibilidade com:
 * - Firestore Timestamp (instâncias nativas e objetos serializados com toDate, seconds, _seconds)
 * - Strings ISO 8601 ("2026-08-31T10:30:00.000Z", "2026-08-31")
 * - Strings formato brasileiro ("31/08/2026", "31/08/2026 22:30", "31/08/2026 22:30:00")
 * - Instâncias nativas JavaScript Date
 * - Números (timestamps em segundos ou milissegundos)
 * - Valores nulos, indefinidos ou objetos corrompidos (retorna null de forma segura sem lançar exceções)
 */

/**
 * Normaliza qualquer formato de data para um objeto JavaScript Date válido,
 * ou retorna null de forma segura sem lançar exceções.
 */
export function normalizeDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  // 1. Instância nativa de Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // 2. String
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Formato brasileiro explícito: DD/MM/AAAA [HH:mm[:ss]]
    const brMatch = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10);
      const year = parseInt(brMatch[3], 10);
      const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
      const minute = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
      const second = brMatch[6] ? parseInt(brMatch[6], 10) : 0;

      if (
        month >= 1 && month <= 12 &&
        day >= 1 && day <= 31 &&
        hour >= 0 && hour <= 23 &&
        minute >= 0 && minute <= 59 &&
        second >= 0 && second <= 59
      ) {
        const date = new Date(year, month - 1, day, hour, minute, second);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    }

    // Formato ISO 8601 ou YYYY-MM-DD
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  // 3. Número (timestamp numérico)
  if (typeof value === "number") {
    if (isNaN(value)) return null;
    // Se timestamp em segundos (< 1e11), converter para milissegundos
    const ms = value < 10000000000 ? value * 1000 : value;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date;
  }

  // 4. Objetos (Firestore Timestamp e derivados estruturados)
  if (typeof value === "object") {
    // 4a. Instância ou objeto com método toDate()
    if ("toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
      try {
        const date = (value as { toDate: () => unknown }).toDate();
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date;
        }
      } catch {
        return null;
      }
    }

    // 4b. Objeto serializado compatível com Firestore Timestamp { seconds: number }
    if (
      "seconds" in value &&
      typeof (value as { seconds?: unknown }).seconds === "number" &&
      !isNaN((value as { seconds: number }).seconds)
    ) {
      const sec = (value as { seconds: number }).seconds;
      const date = new Date(sec * 1000);
      return isNaN(date.getTime()) ? null : date;
    }

    // 4c. Objeto serializado compatível com Firestore Timestamp { _seconds: number }
    if (
      "_seconds" in value &&
      typeof (value as { _seconds?: unknown })._seconds === "number" &&
      !isNaN((value as { _seconds: number })._seconds)
    ) {
      const sec = (value as { _seconds: number })._seconds;
      const date = new Date(sec * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/**
 * Compara se duas datas correspondem ao mesmo dia civil (Ano, Mês, Dia no fuso local).
 * Evita desvios provocados por fuso horário UTC.
 */
export function isSameDay(date1: unknown, date2: unknown): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  if (!d1 || !d2) return false;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Verifica de forma segura se uma data corresponde ao dia de hoje (no fuso local).
 */
export function isToday(value: unknown): boolean {
  return isSameDay(value, new Date());
}

/**
 * Converte qualquer valor de data para uma string no formato "YYYY-MM-DD" no fuso local.
 * Retorna null caso a data seja nula ou inválida.
 */
export function toISODateString(value: unknown): string | null {
  const d = normalizeDate(value);
  if (!d) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converte qualquer valor de data para uma string ISO 8601 completa (UTC),
 * ou retorna string vazia caso a data seja inválida.
 */
export function toSafeISOString(value: unknown): string {
  const d = normalizeDate(value);
  if (!d) return "";
  try {
    return d.toISOString();
  } catch {
    return "";
  }
}

/**
 * Formata qualquer data de entrada para o padrão brasileiro DD/MM/AAAA.
 */
export function formatSafeDate(value: unknown, fallback: string = ""): string {
  const d = normalizeDate(value);
  if (!d) return fallback;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
