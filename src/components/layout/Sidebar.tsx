"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ShoppingBag,
  Globe,
  Truck,
  BookOpen,
  Palette,
  TrendingUp,
  TrendingDown,
  Calculator,
  Lightbulb,
  Bell,
  Trash2,
  BarChart2,
  LineChart,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  X,
  Check
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
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  const defaultMenuItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Business Intelligence (BI)",
      href: "/bi",
      icon: LineChart,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Produtos & Estoque",
      href: "/products",
      icon: Package,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Simulador & Precificação",
      href: "/pricing",
      icon: Calculator,
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
      roles: ["owner", "admin", "viewer"],
    },
    {
      name: "Lembretes & Ideias",
      href: "/reminders",
      icon: Lightbulb,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Notificações & E-mails",
      href: "/notifications",
      icon: Bell,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Central de Relatórios",
      href: "/reports",
      icon: BarChart2,
      roles: ["owner", "admin", "operator", "viewer"],
    },
    {
      name: "Lixeira",
      href: "/recycle-bin",
      icon: Trash2,
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
      name: "Marketplaces",
      href: "/marketplaces",
      icon: Globe,
      roles: ["owner", "admin", "operator"],
    },
    {
      name: "Configurações",
      href: "/settings",
      icon: Settings,
      roles: ["owner", "admin", "operator", "viewer"],
    },
  ];

  // Carrega ordem salva no localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedOrder = localStorage.getItem("sidebar_custom_order");
      if (savedOrder) {
        try {
          const parsed = JSON.parse(savedOrder);
          if (Array.isArray(parsed)) {
            // Filter out removed items like /receivable, /payable, /appearance, /schedule, /tutorial
            const cleaned = parsed.filter((href: string) => !["/receivable", "/payable", "/appearance", "/schedule", "/tutorial"].includes(href));
            setCustomOrder(cleaned);
          }
        } catch (e) {
          console.error("Erro ao carregar ordem do menu:", e);
        }
      }
    }
  }, []);

  // Filtra itens de acordo com a role do usuário
  const filteredMenuItems = defaultMenuItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  // Ordena os itens de acordo com a preferência do usuário (se configurada)
  const orderedMenuItems = [...filteredMenuItems].sort((a, b) => {
    if (customOrder.length === 0) return 0;
    const indexA = customOrder.indexOf(a.href);
    const indexB = customOrder.indexOf(b.href);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Reordenação local para o modal de personalização
  const [editingOrderList, setEditingOrderList] = useState<typeof defaultMenuItems>([]);

  useEffect(() => {
    setEditingOrderList(orderedMenuItems);
  }, [reorderModalOpen]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...editingOrderList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setEditingOrderList(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === editingOrderList.length - 1) return;
    const updated = [...editingOrderList];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setEditingOrderList(updated);
  };

  const handleSaveCustomOrder = () => {
    const newOrderHrefs = editingOrderList.map(item => item.href);
    setCustomOrder(newOrderHrefs);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_custom_order", JSON.stringify(newOrderHrefs));
    }
    setReorderModalOpen(false);
  };

  const handleResetDefaultOrder = () => {
    setCustomOrder([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sidebar_custom_order");
    }
    setEditingOrderList(filteredMenuItems);
    setReorderModalOpen(false);
  };

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      await logout();
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl border-r border-border text-foreground select-none overflow-hidden">
      {/* Cabeçalho do Sidebar */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-border overflow-hidden shrink-0 relative">
        <div className="flex items-center overflow-hidden">
          {/* Collapsed: small logo icon */}
          <div className={cn(
            "shrink-0 rounded-xl overflow-hidden transition-all duration-300",
            isOpen || isMobileOpen ? "h-9 w-9" : "h-9 w-9"
          )}>
            <Image
              src="/logo.png"
              alt="Carol Ramos Collection"
              width={36}
              height={36}
              className="h-9 w-9 object-cover rounded-xl"
              priority
            />
          </div>
          {/* Expanded: full logo */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
              isOpen || isMobileOpen
                ? "opacity-100 max-w-[160px] ml-2.5"
                : "opacity-0 max-w-0 ml-0 pointer-events-none"
            )}
          >
            <span className="font-display font-medium text-sm tracking-wide bg-gradient-to-r from-rosegold-600 to-foreground bg-clip-text text-transparent dark:from-rosegold-400">
              Carol Ramos
            </span>
            <span className="block text-[10px] text-muted-foreground -mt-0.5 tracking-wider uppercase font-semibold">
              Collection ERP
            </span>
          </div>
        </div>

        {/* Botão de colapsar (apenas desktop) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Recolher menu" : "Expandir menu"}
          className={cn(
            "hidden md:flex h-6 w-6 shrink-0 rounded-md border border-border items-center justify-center bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm",
            !isOpen && "absolute right-2 top-5 z-10"
          )}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Menu Principal */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {orderedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "group flex items-center h-10 px-3.5 rounded-xl text-sm font-medium transition-colors duration-200 relative select-none overflow-hidden",
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

              <span
                className={cn(
                  "truncate ml-3 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden font-medium",
                  isOpen || isMobileOpen
                    ? "opacity-100 max-w-[160px]"
                    : "opacity-0 max-w-0 pointer-events-none"
                )}
              >
                {item.name}
              </span>

              {/* Badge de IA */}
              {item.badge && (
                <span
                  className={cn(
                    "ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full tracking-wider uppercase transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden shrink-0",
                    isOpen || isMobileOpen
                      ? "opacity-100 max-w-[60px]"
                      : "opacity-0 max-w-0 pointer-events-none",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-900/30 dark:text-rosegold-300 border border-rosegold-200/30 dark:border-rosegold-800/30"
                  )}
                >
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

      {/* Botão de Personalizar Menu & Logout */}
      <div className="p-2 border-t border-border bg-muted/20 overflow-hidden shrink-0 space-y-1.5">
        
        {/* Botão Personalizar Menu */}
        <button
          onClick={() => setReorderModalOpen(true)}
          className={cn(
            "w-full flex items-center h-8 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200 overflow-hidden",
            !isOpen && !isMobileOpen && "justify-center px-0"
          )}
          title="Personalizar Ordem do Menu"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" />
          <span
            className={cn(
              "truncate ml-2.5 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden",
              isOpen || isMobileOpen
                ? "opacity-100 max-w-[160px]"
                : "opacity-0 max-w-0 pointer-events-none"
            )}
          >
            Personalizar Menu
          </span>
        </button>

        {/* Widget de Perfil Curto */}
        {profile && (
          <div
            className={cn(
              "flex items-center p-2 rounded-xl border border-border bg-card/40 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
              isOpen || isMobileOpen
                ? "opacity-100 max-h-16"
                : "opacity-0 max-h-0 border-none p-0 mb-0 pointer-events-none"
            )}
          >
            <div className="h-8 w-8 shrink-0 rounded-lg bg-rosegold-100 dark:bg-rosegold-900/50 flex items-center justify-center font-semibold text-rosegold-600 dark:text-rosegold-300 text-sm">
              {profile.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1 ml-2.5">
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
          className="group w-full flex items-center h-9 px-3.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 relative overflow-hidden"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          <span
            className={cn(
              "truncate ml-3 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden font-medium",
              isOpen || isMobileOpen
                ? "opacity-100 max-w-[160px]"
                : "opacity-0 max-w-0 pointer-events-none"
            )}
          >
            Sair da Conta
          </span>

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
          "hidden md:block h-screen fixed top-0 left-0 z-40 transition-[width] duration-300 ease-in-out will-change-[width] overflow-hidden",
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

      {/* MODAL: Personalizar Ordem do Menu */}
      {reorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Personalizar Ordem do Menu</h3>
              </div>
              <button
                onClick={() => setReorderModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Utilize as setas para reorganizar a ordem de exibição das abas do sistema no seu menu lateral.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-80">
              {editingOrderList.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card/60 hover:bg-card text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span>{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === editingOrderList.length - 1}
                        className="p-1 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <button
                type="button"
                onClick={handleResetDefaultOrder}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Padrão</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReorderModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomOrder}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 shadow"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Salvar Ordem</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
