"use client";

import React, { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveBankLogoUrl } from "@/lib/bankLogos";

interface BankLogoProps {
  account?: {
    logo?: string;
    bankName?: string;
    bankCode?: string;
    name?: string;
  };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function BankLogo({ account, size = "md", className }: BankLogoProps) {
  const [imgError, setImgError] = useState(false);

  const { url, knownBank } = resolveBankLogoUrl(account);

  // Reset error status if account or logo changes
  useEffect(() => {
    setImgError(false);
  }, [account?.logo, account?.bankCode, account?.bankName, account?.name]);

  const sizeClasses = {
    sm: "h-6 w-6 text-[8px] rounded-md",
    md: "h-8 w-8 text-[10px] rounded-lg",
    lg: "h-10 w-10 text-xs rounded-xl",
    xl: "h-12 w-12 text-sm rounded-xl",
  }[size];

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  }[size];

  if (url && !imgError) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-white dark:bg-card border border-border shadow-xs flex items-center justify-center p-0.5",
          sizeClasses,
          className
        )}
      >
        <img
          src={url}
          alt={account?.name || "Banco"}
          className="h-full w-full object-contain rounded"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback badge if image fails to load or no logo URL
  if (knownBank) {
    return (
      <div
        className={cn(
          "shrink-0 flex items-center justify-center font-bold shadow-xs border select-none",
          knownBank.color,
          sizeClasses,
          className
        )}
      >
        {knownBank.brand}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 bg-primary/10 text-primary flex items-center justify-center border border-primary/20 select-none",
        sizeClasses,
        className
      )}
    >
      <Building2 className={iconSizes} />
    </div>
  );
}

export default BankLogo;
