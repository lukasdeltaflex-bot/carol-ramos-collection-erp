"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/providers";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Building2,
  User,
  LogOut,
  Sparkles,
  Check,
  Settings,
  Key,
  Palette,
  BookOpen,
  Info,
  CreditCard,
  AlertTriangle,
  Package,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  sidebarOpen: boolean;
}

export default function Header({
  isMobileOpen,
  setIsMobileOpen,
  sidebarOpen,
}: HeaderProps) {
  const { profile, tenantId, switchTenant, logout, activeCompany } = useAuth();
  const { theme, setTheme } = useTheme();

  // Dropdown States
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Refs for clicking outside to close
  const tenantRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(event.target as Node)) {
        setTenantDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTenantSwitch = async (id: string) => {
    try {
      await switchTenant(id);
      setTenantDropdownOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao trocar de empresa.";
      alert(msg);
    }
  };

  // Mock Notifications
  const mockNotifications = [
    { id: 1, title: "Estoque Baixo", desc: "Body Splash Carol Ramos Collection com menos de 5 un.", type: "warning", time: "10 min atrás", icon: Package },
    { id: 2, title: "Fatura Pendente", desc: "Fornecedor Natura vence amanhã: R$ 850,00", type: "alert", time: "2 horas atrás", icon: DollarSign },
    { id: 3, title: "Nova Integração", desc: "Shopee conectada com sucesso", type: "info", time: "1 dia atrás", icon: Sparkles },
  ];

  // Map tenant keys to display names
  const tenantNameMap: Record<string, string> = {
    "carol-ramos-collection": "Carol Ramos Collection",
    "beleza-saas-demo": "Beleza SaaS Demo",
  };

  const activeTenantName = activeCompany?.name || tenantId || "Selecione uma Empresa";

  const userInitials = profile?.displayName
    ? profile.displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "CR";

  // Profile dropdown menu items
  const profileMenuGroups = [
    {
      label: "Conta",
      items: [
        { label: "Seu Perfil", href: "/settings?tab=profile", icon: User },
        { label: "Minha Conta", href: "/settings?tab=account", icon: CreditCard },
        { label: "Empresa", href: "/settings?tab=company", icon: Building2 },
        { label: "Alterar Senha", href: "/settings?tab=password", icon: Key },
      ],
    },
    {
      label: "Preferências",
      items: [
        { label: "Aparência", href: "/appearance", icon: Palette },
        { label: "Tutorial", href: "/tutorial", icon: BookOpen },
        { label: "Sobre", href: "/settings?tab=about", icon: Info },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-background/60 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 md:px-6">
      {/* Esquerda: Hamburguer Mobile & Tenant Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
          aria-label="Abrir Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tenant Selector */}
        <div className="relative" ref={tenantRef}>
          <button
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card/50 hover:bg-muted text-sm font-medium transition-all focus:outline-none"
          >
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="max-w-[120px] md:max-w-[200px] truncate">{activeTenantName}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", tenantDropdownOpen && "rotate-180")} />
          </button>

          {/* Tenant Dropdown */}
          {tenantDropdownOpen && profile && (
            <div className="absolute left-0 mt-2 w-60 rounded-xl border border-border bg-card shadow-xl p-1.5 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Suas Empresas / Lojas
              </div>
              <div className="space-y-0.5">
                {Object.keys(profile.tenants).map((id) => {
                  const isActive = id === tenantId;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTenantSwitch(id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left gap-2",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {(tenantNameMap[id] || id)[0].toUpperCase()}
                        </div>
                        <span className="truncate">{tenantNameMap[id] || id}</span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 pt-1 border-t border-border">
                <Link
                  href="/settings"
                  onClick={() => setTenantDropdownOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Gerenciar Empresas</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Tema, Notificações, Perfil */}
      <div className="flex items-center gap-2">

        {/* Toggle de Tema */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
          aria-label="Alternar Tema"
          title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </button>

        {/* Notificações */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all relative focus:outline-none"
            aria-label="Notificações"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          </button>

          {/* Notifications Panel */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl p-0 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-xs font-semibold text-foreground">Notificações</span>
                <button className="text-[10px] text-primary font-semibold hover:underline">
                  Marcar todas como lidas
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {mockNotifications.map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div key={notif.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        notif.type === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        notif.type === "alert" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        notif.type === "info" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{notif.title}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{notif.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{notif.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                <button className="w-full text-[11px] text-center text-muted-foreground hover:text-foreground transition-colors">
                  Ver todas as notificações
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border hidden sm:block mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl border border-border hover:bg-muted transition-all focus:outline-none"
          >
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center font-semibold text-primary-foreground text-[11px] shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-semibold text-foreground leading-none">
                {profile?.displayName?.split(" ")[0] || "Carol Ramos"}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize mt-0.5">
                {profile?.tenants?.[tenantId || ""]?.role || "owner"}
              </span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground hidden sm:block transition-transform duration-200", profileDropdownOpen && "rotate-180")} />
          </button>

          {/* User Panel */}
          {profileDropdownOpen && profile && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card shadow-xl p-1.5 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
              {/* User info header */}
              <div className="px-3 py-3 border-b border-border mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-none text-foreground">{profile.displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-1">{profile.email}</p>
                    <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wide">
                      {profile.tenants?.[tenantId || ""]?.role || "owner"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu groups */}
              {profileMenuGroups.map((group, gi) => (
                <div key={gi} className={cn("space-y-0.5", gi > 0 && "mt-1.5 pt-1.5 border-t border-border")}>
                  <div className="px-2 py-1 text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Logout */}
              <div className="mt-1.5 pt-1.5 border-t border-border">
                <button
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    if (confirm("Deseja realmente sair do sistema?")) {
                      await logout();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors text-left"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
