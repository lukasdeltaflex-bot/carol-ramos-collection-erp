"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  BookOpen,
  Palette,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { role, logout, profile } = useAuth();

  const menuItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Produtos & Estoque",
      href: "/products",
      icon: Package,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Clientes",
      href: "/contacts",
      icon: Users,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Venda Rápida / PDV",
      href: "/sales",
      icon: ShoppingCart,
      roles: ["owner", "admin", "operator"],
    },
    {
      name: "Financeiro",
      href: "/finance",
      icon: DollarSign,
      roles: ["owner", "admin", "viewer"], // Operator doesn't see financial reports
    },
    {
      name: "Contas a Receber",
      href: "/receivable",
      icon: TrendingUp,
      roles: ["owner", "admin", "viewer"],
    },
    {
      name: "Contas a Pagar",
      href: "/payable",
      icon: TrendingDown,
      roles: ["owner", "admin", "viewer"],
    },
    {
      name: "Agenda & Serviços",
      href: "/schedule",
      icon: Calendar,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Assistente IA",
      href: "/ai",
      icon: Sparkles,
      roles: ["owner", "admin", "operator", "viewer"],
      badge: "Gemini",
    },
    {
      name: "Fornecedores",
      href: "/suppliers",
      icon: Truck,
      roles: ["owner", "admin", "operator"],
    },
    {
      name: "Configurações",
      href: "/settings",
      icon: Settings,
      roles: ["owner", "admin"],
    },
    {
      name: "Aparência",
      href: "/appearance",
      icon: Palette,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Tutorial",
      href: "/tutorial",
      icon: BookOpen,
      roles: ["owner", "admin", "operator", "viewer"],
    },
  ];

  // Filtra itens de acordo com a role do usuário
  const filteredMenuItems = menuItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      await logout();
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl border-r border-border text-foreground transition-all duration-300">
      {/* Cabeçalho do Sidebar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-rosegold-600 to-rosegold-400 flex items-center justify-center shadow-md shadow-rosegold-500/20">
            <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
          </div>
          {(isOpen || isMobileOpen) && (
            <div className="flex flex-col">
              <span className="font-display font-medium text-sm tracking-wide bg-gradient-to-r from-rosegold-600 to-foreground bg-clip-text text-transparent dark:from-rosegold-400 whitespace-nowrap">
                Carol Ramos
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5 tracking-wider uppercase font-semibold">
                Collection ERP
              </span>
            </div>
          )}
        </div>

        {/* Botão de colapsar (apenas desktop) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:flex h-6 w-6 rounded-md border border-border items-center justify-center bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Menu Principal */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              {(isOpen || isMobileOpen) && (
                <span className="truncate flex-1">{item.name}</span>
              )}
              
              {/* Badge de IA */}
              {item.badge && (isOpen || isMobileOpen) && (
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full tracking-wider uppercase",
                  isActive 
                    ? "bg-white/20 text-white" 
                    : "bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-900/30 dark:text-rosegold-300 border border-rosegold-200/30 dark:border-rosegold-800/30"
                )}>
                  {item.badge}
                </span>
              )}

              {/* Tooltip quando colapsado */}
              {!isOpen && !isMobileOpen && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold invisible opacity-0 -translate-x-2 group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 shadow-md pointer-events-none whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Info do Usuário e Logout */}
      <div className="p-3 border-t border-border bg-muted/20">
        {/* Widget de Perfil Curto */}
        {(isOpen || isMobileOpen) && profile && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-card/40 mb-3">
            <div className="h-8 w-8 rounded-lg bg-rosegold-100 dark:bg-rosegold-900/50 flex items-center justify-center font-semibold text-rosegold-600 dark:text-rosegold-300 text-sm">
              {profile.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold truncate leading-none">
                {profile.displayName}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize mt-0.5 flex items-center gap-0.5">
                <ShieldCheck className="h-3 w-3 text-rosegold-500" />
                {role}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 relative"
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          {(isOpen || isMobileOpen) && <span className="truncate">Sair da Conta</span>}
          
          {!isOpen && !isMobileOpen && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold invisible opacity-0 -translate-x-2 group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50 shadow-md pointer-events-none whitespace-nowrap">
              Sair da Conta
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "hidden md:block h-screen fixed top-0 left-0 z-40 transition-all duration-300",
          isOpen ? "w-64" : "w-16"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar Mobile Drawer Panel */}
      <aside
        className={cn(
          "md:hidden fixed top-0 bottom-0 left-0 w-64 z-50 transition-transform duration-300 ease-in-out transform",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
