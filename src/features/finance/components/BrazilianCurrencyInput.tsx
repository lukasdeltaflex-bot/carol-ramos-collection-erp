"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export interface BrazilianCurrencyInputProps {
  value: number; // Valor numérico armazenado no ERP (ex: 1500.50)
  onChange: (value: number) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Formata um valor numérico para exibição em Real Brasileiro (R$).
 * Ex: 1.50 -> "R$ 1,50", 1500.50 -> "R$ 1.500,50"
 */
export function formatBRL(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Extrai o valor numérico a partir da sequência de dígitos digitados pelo usuário.
 * Ex: "150" -> 1.50
 *     "1500" -> 15.00
 *     "150050" -> 1500.50
 *     "1500000" -> 15000.00
 */
export function parseBRLDigits(digitsStr: string): number {
  const clean = digitsStr.replace(/\D/g, "");
  if (!clean) return 0;
  // Limita a 14 dígitos para evitar estouro de precisão do JS
  const trimmed = clean.slice(0, 14);
  const cents = parseInt(trimmed, 10);
  return cents / 100;
}

export const BrazilianCurrencyInput: React.FC<BrazilianCurrencyInputProps> = ({
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  placeholder = "R$ 0,00",
  className,
  autoFocus
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayString = formatBRL(value || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseBRLDigits(raw);
    onChange(numeric);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite Backspace, Delete, Tab, Escape, Enter, setas de navegação
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
      (e.ctrlKey || e.metaKey) // Permite Ctrl+A, Ctrl+C, Ctrl+V, etc.
    ) {
      return;
    }

    // Bloqueia qualquer caractere que não seja dígito numérico (0-9)
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={displayString}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full px-3.5 py-2 rounded-lg border border-border bg-card font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
};
