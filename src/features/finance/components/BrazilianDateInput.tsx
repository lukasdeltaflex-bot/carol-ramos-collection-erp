"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface BrazilianDateInputProps {
  value: string; // Formato armazenado no ERP (YYYY-MM-DD) ou string vazia
  onChange: (isoValue: string, isValid: boolean) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  errorMessage?: string;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
export function isoToBrDate(isoDate: string): string {
  if (!isoDate || typeof isoDate !== "string") return "";
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Converte formato brasileiro (DD/MM/AAAA) para formato ISO (YYYY-MM-DD)
 */
export function brDateToIso(brDate: string): string {
  if (!brDate || typeof brDate !== "string") return "";
  const clean = brDate.replace(/\D/g, "");
  if (clean.length !== 8) return "";
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Validação rigorosa de calendário para datas no formato brasileiro (DD/MM/AAAA).
 * Detecta anos bissextos, meses com 30 ou 31 dias, e datas impossíveis como 31/02/2026 ou 32/01/2026.
 */
export function validateBrazilianDate(dateStr: string): {
  isValid: boolean;
  isoDate: string;
  error?: string;
} {
  const clean = dateStr.replace(/\D/g, "");

  if (clean.length === 0) {
    return { isValid: false, isoDate: "", error: "Data é obrigatória" };
  }

  if (clean.length < 8) {
    return { isValid: false, isoDate: "", error: "Data incompleta (digite DD/MM/AAAA)" };
  }

  const day = parseInt(clean.slice(0, 2), 10);
  const month = parseInt(clean.slice(2, 4), 10);
  const year = parseInt(clean.slice(4, 8), 10);

  if (year < 1900 || year > 2100) {
    return { isValid: false, isoDate: "", error: "Ano inválido (deve ser entre 1900 e 2100)" };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, isoDate: "", error: "Mês inválido (deve ser entre 01 e 12)" };
  }

  // Validação real de dias no mês utilizando o motor de calendário do JavaScript
  const testDate = new Date(year, month - 1, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return {
      isValid: false,
      isoDate: "",
      error: `Data inexistente no calendário (${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year})`
    };
  }

  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { isValid: true, isoDate };
}

/**
 * Insere as barras automáticas conforme a digitação de números:
 * Digitando 18112026 -> 18/11/2026
 */
export function maskBrazilianDate(rawDigits: string): string {
  const clean = rawDigits.replace(/\D/g, "").slice(0, 8);
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
}

export const BrazilianDateInput: React.FC<BrazilianDateInputProps> = ({
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  placeholder = "DD/MM/AAAA",
  className,
  errorMessage: externalError
}) => {
  // Estado local com a string formatada em DD/MM/AAAA
  const [displayValue, setDisplayValue] = useState<string>(() => isoToBrDate(value));
  const [internalError, setInternalError] = useState<string | null>(null);

  // Sincroniza quando o valor externo mudar
  useEffect(() => {
    const formatted = isoToBrDate(value);
    setDisplayValue(formatted);
    if (!formatted) {
      setInternalError(null);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskBrazilianDate(raw);
    setDisplayValue(masked);

    const clean = masked.replace(/\D/g, "");

    if (clean.length === 0) {
      setInternalError(required ? "Data é obrigatória" : null);
      onChange("", !required);
      return;
    }

    if (clean.length < 8) {
      setInternalError("Data incompleta (digite DD/MM/AAAA)");
      onChange("", false);
      return;
    }

    // 8 dígitos completos -> validação de calendário
    const validation = validateBrazilianDate(masked);
    if (!validation.isValid) {
      setInternalError(validation.error || "Data inválida");
      onChange("", false);
    } else {
      setInternalError(null);
      onChange(validation.isoDate, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }

    // Bloqueia qualquer caractere que não seja dígito numérico (0-9)
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const currentError = externalError || internalError;

  return (
    <div className="space-y-1 w-full">
      <input
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full px-3.5 py-2 rounded-lg border bg-card font-mono text-foreground focus:outline-none transition-all",
          currentError
            ? "border-destructive focus:ring-2 focus:ring-destructive/30"
            : "border-border focus:ring-2 focus:ring-primary/40",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      />
      {currentError && (
        <p className="text-[10px] text-destructive font-medium flex items-center gap-1">
          <span>⚠️</span>
          <span>{currentError}</span>
        </p>
      )}
    </div>
  );
};
