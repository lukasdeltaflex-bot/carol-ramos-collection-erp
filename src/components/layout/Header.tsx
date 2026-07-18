"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Check
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
  const { profile, tenantId, switchTenant, logout } = useAuth();
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
    } catch (e: any) {
      alert(e.message || "Erro ao trocar de empresa.");
    }
  };

  // Mock Notifications for high-fidelity representation
  const mockNotifications = [
    { id: 1, title: "Estoque Baixo", desc: "Body Splash Carol Ramos Collection com menos de 5 un.", type: "warning", time: "10 min atrás" },
    { id: 2, title: "Fatura Pendente", desc: "Fornecedor Natura vence amanhã: R$ 850,00", type: "alert", time: "2 horas atrás" },
    { id: 3, title: "Nova Integração", desc: "Shopee conectada com sucesso", type: "info", time: "1 dia atrás" }
  ];

  // Map tenant keys to display names
  const tenantNameMap: Record<string, string> = {
    "carol-ramos-collection": "Carol Ramos Collection",
    "beleza-saas-demo": "Beleza SaaS Demo"
  };

  const activeTenantName = tenantId ? (tenantNameMap[tenantId] || tenantId) : "Selecione uma Empresa";

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-background/60 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 md:px-6">
      {/* Esquerda: Hamburguer Mobile & Context Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
          aria-label="Abrir Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Nome do Tenant Ativo (Mobile ou Desktop) */}
        <div className="relative" ref={tenantRef}>
          <button
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card/50 hover:bg-muted text-sm font-medium transition-all focus:outline-none"
          >
            <Building2 className="h-4 w-4 text-rosegold-500" />
            <span className="max-w-[120px] md:max-w-none truncate">{activeTenantName}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", tenantDropdownOpen && "rotate-180")} />
          </button>

          {/* Dropdown de Inquilino */}
          {tenantDropdownOpen && profile && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-1.5 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Suas Empresas / Lojas
              </div>
              <div className="space-y-1">
                {Object.keys(profile.tenants).map((id) => {
                  const isActive = id === tenantId;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTenantSwitch(id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left",
                        isActive
                          ? "bg-rosegold-100 text-rosegold-800 dark:bg-rosegold-900/40 dark:text-rosegold-300"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="truncate">{tenantNameMap[id] || id}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-rosegold-600 dark:text-rosegold-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Ações Rápidas, Notificações, Tema, Perfil */}
      <div className="flex items-center gap-3">
        
        {/* Toggle de Tema */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
          aria-label="Alternar Tema"
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-rosegold-400" />
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
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rosegold-500 animate-pulse" />
          </button>

          {/* Painel de Notificações */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg p-2 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Notificações</span>
                <span className="text-[10px] text-rosegold-500 font-medium hover:underline cursor-pointer">Lidas</span>
              </div>
              <div className="py-1 max-h-72 overflow-y-auto space-y-1">
                {mockNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left text-xs"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-foreground">{notif.title}</span>
                      <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-snug">{notif.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Dropdown de Usuário */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl border border-border hover:bg-muted transition-all focus:outline-none"
          >
            <div className="h-7 w-7 rounded-lg bg-rosegold-500 flex items-center justify-center font-semibold text-white text-xs">
              {profile?.displayName?.substring(0, 2).toUpperCase() || "CR"}
            </div>
            <span className="text-xs font-medium hidden sm:block">{profile?.displayName || "Carol Ramos"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {/* Painel do Perfil */}
          {profileDropdownOpen && profile && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-1.5 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
              <div className="px-3 py-2.5 border-b border-border mb-1.5">
                <p className="text-xs font-semibold truncate leading-none text-foreground">{profile.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-1">{profile.email}</p>
              </div>
              <div className="space-y-0.5">
                <a
                  href="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Seu Perfil</span>
                </a>
                <button
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    if (confirm("Deseja realmente sair?")) {
                      await logout();
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
