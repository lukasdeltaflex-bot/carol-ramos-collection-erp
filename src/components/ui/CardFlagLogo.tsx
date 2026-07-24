"use client";

import React, { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCardFlagLogoUrl } from "@/lib/cardFlags";

interface CardFlagLogoProps {
  card?: {
    flagLogo?: string;
    flag?: string;
  };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function CardFlagLogo({ card, size = "md", className }: CardFlagLogoProps) {
  const [imgError, setImgError] = useState(false);

  const { url, knownFlag } = resolveCardFlagLogoUrl(card);

  useEffect(() => {
    setImgError(false);
  }, [card?.flagLogo, card?.flag]);

  const sizeClasses = {
    sm: "h-6 w-8 text-[8px] rounded-md",
    md: "h-8 w-11 text-[9px] rounded-lg",
    lg: "h-10 w-14 text-[10px] rounded-xl",
    xl: "h-12 w-16 text-xs rounded-xl",
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
          alt={card?.flag || "Bandeira"}
          className="h-full w-full object-contain rounded"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (knownFlag) {
    return (
      <div
        className={cn(
          "shrink-0 flex items-center justify-center font-bold shadow-xs border select-none tracking-wider",
          knownFlag.color,
          sizeClasses,
          className
        )}
      >
        {knownFlag.brand}
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
      <CreditCard className={iconSizes} />
    </div>
  );
}

export default CardFlagLogo;
