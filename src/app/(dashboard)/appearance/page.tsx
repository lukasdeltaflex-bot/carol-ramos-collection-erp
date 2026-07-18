"use client";

import React from "react";
import { useAppearance, COLOR_MAP, FONT_MAP, RADIUS_MAP, PrimaryColor, FontFamily, FontSize, BorderRadius, Spacing, ShadowLevel } from "@/context/AppearanceContext";
import { useToast } from "@/context/ToastContext";
import { Palette, Type, LayoutTemplate, Sliders, RotateCcw, Save, Monitor, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppearancePage() {
  const { settings, updateSetting, resetToDefaults } = useAppearance();
  const { success } = useToast();

  const handleSave = () => {
    success("Aparência salva!", "Suas preferências visuais foram aplicadas.");
  };

  const handleReset = () => {
    resetToDefaults();
    success("Padrões restaurados", "A aparência foi redefinida para os valores padrão.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Aparência
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Personalize o visual do sistema de acordo com sua preferência.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrão
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/95 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Salvar Aparência
          </button>
        </div>
      </div>

      {/* Preview Banner */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-3">
        <Monitor className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Pré-visualização em Tempo Real</p>
          <p className="text-[11px] text-muted-foreground">As alterações são aplicadas instantaneamente no sistema.</p>
        </div>
      </div>

      {/* === Cor Principal === */}
      <Section icon={<Palette className="h-4 w-4 text-primary" />} title="Cor Principal">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {(Object.entries(COLOR_MAP) as [PrimaryColor, typeof COLOR_MAP[PrimaryColor]][]).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => updateSetting("primaryColor", key)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                settings.primaryColor === key
                  ? "border-foreground scale-105 shadow-md"
                  : "border-transparent hover:border-border hover:scale-105"
              )}
              title={conf.label}
            >
              <div
                className="h-8 w-8 rounded-xl shadow-sm"
                style={{ backgroundColor: conf.hex }}
              />
              <span className="text-[9px] text-muted-foreground font-medium truncate w-full text-center">{conf.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* === Tipografia === */}
      <Section icon={<Type className="h-4 w-4 text-primary" />} title="Tipografia">
        <div className="space-y-4">
          {/* Font Family */}
          <div>
            <Label>Família de Fonte</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {(Object.entries(FONT_MAP) as [FontFamily, typeof FONT_MAP[FontFamily]][]).map(([key, conf]) => (
                <button
                  key={key}
                  onClick={() => updateSetting("fontFamily", key)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left",
                    settings.fontFamily === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                  style={{ fontFamily: conf.value }}
                >
                  <span className="block font-semibold text-sm mb-0.5">Aa</span>
                  <span className="text-[10px]">{conf.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <Label>Tamanho da Fonte</Label>
            <div className="flex gap-2 mt-1.5">
              {([
                { key: "sm" as FontSize, label: "Pequeno", size: "text-xs" },
                { key: "md" as FontSize, label: "Médio (Padrão)", size: "text-sm" },
                { key: "lg" as FontSize, label: "Grande", size: "text-base" },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => updateSetting("fontSize", opt.key)}
                  className={cn(
                    "flex-1 px-3 py-2.5 rounded-xl border text-center transition-all",
                    settings.fontSize === opt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={cn("block font-semibold", opt.size)}>Aa</span>
                  <span className="text-[10px] mt-0.5 block">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* === Layout e Bordas === */}
      <Section icon={<LayoutTemplate className="h-4 w-4 text-primary" />} title="Layout e Bordas">
        <div className="space-y-4">
          {/* Border Radius */}
          <div>
            <Label>Arredondamento das Bordas</Label>
            <div className="grid grid-cols-5 gap-2 mt-1.5">
              {(Object.entries(RADIUS_MAP) as [BorderRadius, typeof RADIUS_MAP[BorderRadius]][]).map(([key, conf]) => (
                <button
                  key={key}
                  onClick={() => updateSetting("borderRadius", key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 border transition-all",
                    "rounded-xl",
                    settings.borderRadius === key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div
                    className="h-8 w-8 bg-primary/30 border-2 border-primary/50"
                    style={{ borderRadius: conf.value }}
                  />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight">{conf.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <Label>Espaçamento do Layout</Label>
            <div className="flex gap-2 mt-1.5">
              {([
                { key: "compact" as Spacing, label: "Compacto", desc: "Mais conteúdo" },
                { key: "normal" as Spacing, label: "Normal (Padrão)", desc: "Equilibrado" },
                { key: "relaxed" as Spacing, label: "Espaçado", desc: "Mais respiro" },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => updateSetting("spacing", opt.key)}
                  className={cn(
                    "flex-1 px-3 py-2.5 rounded-xl border text-center transition-all",
                    settings.spacing === opt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="block text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] mt-0.5 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* === Comportamento === */}
      <Section icon={<Sliders className="h-4 w-4 text-primary" />} title="Comportamento e Efeitos">
        <div className="space-y-4">
          {/* Shadows */}
          <div>
            <Label>Nível de Sombras</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {([
                { key: "none" as ShadowLevel, label: "Sem sombra" },
                { key: "sm" as ShadowLevel, label: "Suave" },
                { key: "md" as ShadowLevel, label: "Médio (Padrão)" },
                { key: "lg" as ShadowLevel, label: "Pronunciado" },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => updateSetting("shadowLevel", opt.key)}
                  className={cn(
                    "px-3 py-3 rounded-xl border text-center transition-all",
                    settings.shadowLevel === opt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 mx-auto mb-1.5 rounded-lg bg-card border border-border",
                    opt.key === "sm" && "shadow-sm",
                    opt.key === "md" && "shadow-md",
                    opt.key === "lg" && "shadow-xl",
                  )} />
                  <span className="text-[10px] font-medium block">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <ToggleRow
              label="Sidebar colapsada por padrão"
              description="O menu lateral inicia minimizado ao carregar o sistema."
              value={settings.sidebarCollapsedByDefault}
              onChange={v => updateSetting("sidebarCollapsedByDefault", v)}
            />
            <ToggleRow
              label="Animações habilitadas"
              description="Transições e micro-animações em todo o sistema."
              value={settings.animationsEnabled}
              onChange={v => updateSetting("animationsEnabled", v)}
              icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ——— Sub-components ———

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-card/30">
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-primary" : "bg-muted-foreground/30"
        )}
        role="switch"
        aria-checked={value}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
            value ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}
