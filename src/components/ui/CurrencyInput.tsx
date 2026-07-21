"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  prefix?: string;
}

/**
 * Professional Brazilian Currency Input (R$ 0,00)
 * Allows clearing completely without keeping a persistent leading zero bug.
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  disabled = false,
  required = false,
  prefix = "R$"
}: CurrencyInputProps) {
  // Format numeric float value to formatted BR string (e.g. 10.5 -> "10,50")
  const formatValue = (num: number): string => {
    if (isNaN(num) || num === 0) return "";
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const [inputValue, setInputValue] = useState<string>(() => (value > 0 ? formatValue(value) : ""));

  useEffect(() => {
    // Sync when external value changes
    if (value > 0) {
      setInputValue(formatValue(value));
    } else if (value === 0 && inputValue !== "") {
      const parsedCurrent = parseToNumber(inputValue);
      if (parsedCurrent !== 0) {
        setInputValue("");
      }
    }
  }, [value]);

  const parseToNumber = (str: string): number => {
    if (!str) return 0;
    // Remove non-digit characters
    const cleanDigits = str.replace(/\D/g, "");
    if (!cleanDigits) return 0;
    const num = parseInt(cleanDigits, 10) / 100;
    return isNaN(num) ? 0 : num;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal) {
      setInputValue("");
      onChange(0);
      return;
    }

    const cleanDigits = rawVal.replace(/\D/g, "");
    if (!cleanDigits) {
      setInputValue("");
      onChange(0);
      return;
    }

    const numericValue = parseInt(cleanDigits, 10) / 100;
    const formatted = numericValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    setInputValue(formatted);
    onChange(numericValue);
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        required={required}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full py-2 rounded-xl border border-border bg-background font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all",
          prefix ? "pl-9 pr-3" : "px-3",
          className
        )}
      />
    </div>
  );
}
