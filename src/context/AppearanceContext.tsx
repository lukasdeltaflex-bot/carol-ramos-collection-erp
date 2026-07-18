"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type PrimaryColor = "rose" | "violet" | "blue" | "emerald" | "amber" | "teal" | "pink" | "indigo";
export type FontFamily = "inter" | "outfit" | "roboto" | "poppins";
export type FontSize = "sm" | "md" | "lg";
export type BorderRadius = "none" | "sm" | "md" | "lg" | "full";
export type Spacing = "compact" | "normal" | "relaxed";
export type ShadowLevel = "none" | "sm" | "md" | "lg";

export interface AppearanceSettings {
  primaryColor: PrimaryColor;
  fontFamily: FontFamily;
  fontSize: FontSize;
  borderRadius: BorderRadius;
  spacing: Spacing;
  shadowLevel: ShadowLevel;
  sidebarCollapsedByDefault: boolean;
  animationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  primaryColor: "rose",
  fontFamily: "inter",
  fontSize: "md",
  borderRadius: "lg",
  spacing: "normal",
  shadowLevel: "md",
  sidebarCollapsedByDefault: false,
  animationsEnabled: true,
};

export const COLOR_MAP: Record<PrimaryColor, { primary: string; label: string; hex: string }> = {
  rose:    { primary: "351 34% 57%", label: "Rose Gold",   hex: "#B76E79" },
  violet:  { primary: "262 83% 58%", label: "Violeta",     hex: "#7C3AED" },
  blue:    { primary: "217 91% 60%", label: "Azul Royal",  hex: "#3B82F6" },
  emerald: { primary: "160 84% 39%", label: "Esmeralda",   hex: "#10B981" },
  amber:   { primary: "45 93% 47%",  label: "Âmbar",       hex: "#F59E0B" },
  teal:    { primary: "186 64% 40%", label: "Turquesa",    hex: "#0D9488" },
  pink:    { primary: "330 80% 62%", label: "Rosa",        hex: "#EC4899" },
  indigo:  { primary: "239 84% 67%", label: "Índigo",      hex: "#6366F1" },
};

export const FONT_MAP: Record<FontFamily, { label: string; value: string }> = {
  inter:   { label: "Inter (Padrão)",  value: "var(--font-sans)" },
  outfit:  { label: "Outfit (Display)", value: "var(--font-display)" },
  roboto:  { label: "Roboto",          value: "'Roboto', sans-serif" },
  poppins: { label: "Poppins",         value: "'Poppins', sans-serif" },
};

export const RADIUS_MAP: Record<BorderRadius, { label: string; value: string }> = {
  none: { label: "Sem arredondamento", value: "0" },
  sm:   { label: "Pequeno",            value: "0.375rem" },
  md:   { label: "Médio",              value: "0.5rem" },
  lg:   { label: "Grande (Padrão)",    value: "0.75rem" },
  full: { label: "Máximo",             value: "1rem" },
};

interface AppearanceContextType {
  settings: AppearanceSettings;
  updateSetting: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void;
  resetToDefaults: () => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_SETTINGS);

  const storageKey = userId ? `appearance_${userId}` : "appearance_default";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppearanceSettings>;
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Apply CSS variables whenever settings change
  useEffect(() => {
    const root = document.documentElement;
    const colorConf = COLOR_MAP[settings.primaryColor];
    
    root.style.setProperty("--primary", colorConf.primary);
    // ring follows primary
    root.style.setProperty("--ring", colorConf.primary);
    
    // Border radius
    root.style.setProperty("--radius", RADIUS_MAP[settings.borderRadius].value);
    
    // Font family
    if (settings.fontFamily !== "inter") {
      root.style.setProperty("--active-font", FONT_MAP[settings.fontFamily].value);
      root.style.fontFamily = FONT_MAP[settings.fontFamily].value;
    } else {
      root.style.fontFamily = "";
    }

    // Font size base
    const fontSizeMap = { sm: "13px", md: "14px", lg: "16px" };
    root.style.fontSize = fontSizeMap[settings.fontSize];
    
    // Animations
    if (!settings.animationsEnabled) {
      root.style.setProperty("--animation-duration", "0ms");
    } else {
      root.style.removeProperty("--animation-duration");
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }, [storageKey]);

  return (
    <AppearanceContext.Provider value={{ settings, updateSetting, resetToDefaults }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside AppearanceProvider");
  return ctx;
}
