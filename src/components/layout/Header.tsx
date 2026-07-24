"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/providers";
import { useToast } from "@/context/ToastContext";
import { useDb } from "@/hooks/useDb";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { processImageUpload, MAX_IMAGE_SIZE_MB } from "@/lib/imageUpload";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
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
  Upload,
  Phone,
  Mail,
  Lock,
  Clock,
  Laptop,
  Download
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
  const { user, profile, tenantId, switchTenant, logout, activeCompany, isMock, updateProfileMock } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError, info } = useToast();
  const { getDocs, createDoc, updateDoc, invalidateCache } = useDb();

  // Dropdown States
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Modals States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // profile form fields
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profilePreferences, setProfilePreferences] = useState({
    language: "pt-BR",
    notifications: true
  });

  // password form fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (profile) {
      setProfileName(profile.displayName || "");
      setProfileEmail(profile.email || "");
      setProfilePhone(profile.phone || "");
      setProfilePhoto(profile.photo || "");
      if (profile.preferences) {
        setProfilePreferences({
          language: profile.preferences.language ?? "pt-BR",
          notifications: profile.preferences.notifications ?? true
        });
      }
    }
  }, [profile, profileModalOpen]);

  const [photoUploadProgress, setPhotoUploadProgress] = useState<number | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploadError(null);
    setPhotoUploadProgress(0);

    const res = await processImageUpload(file, {
      maxWidth: 600,
      maxHeight: 600,
      onProgress: (pct) => setPhotoUploadProgress(pct)
    });

    if (res.success && res.dataUrl) {
      setProfilePhoto(res.dataUrl);
      setTimeout(() => setPhotoUploadProgress(null), 1000);
    } else {
      setPhotoUploadError(res.errorMessage || "Erro ao carregar foto.");
      setPhotoUploadProgress(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedData = {
        displayName: profileName,
        email: profileEmail,
        phone: profilePhone,
        photo: profilePhoto,
        preferences: profilePreferences
      };

      if (isMock) {
        const newProfile = {
          ...profile,
          ...updatedData
        } as any;
        updateProfileMock(newProfile);
        success("Perfil atualizado", "Suas alterações de perfil foram salvas localmente!");
      } else {
        if (user) {
          await updateDoc("users", user.uid, updatedData);
          success("Perfil atualizado", "Suas alterações de perfil foram salvas no Firestore!");
        }
      }
      setProfileModalOpen(false);
    } catch (err: any) {
      toastError("Erro ao salvar", err.message || "Erro ao atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError("Senhas não conferem", "A nova senha e a confirmação devem ser iguais.");
      return;
    }
    if (newPassword.length < 6) {
      toastError("Senha muito curta", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    setSaving(true);
    try {
      if (isMock) {
        success("Senha alterada", "Sua senha de simulação foi atualizada com sucesso!");
        setPasswordModalOpen(false);
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const isGoogleUser = currentUser.providerData.some(p => p.providerId === "google.com");
          if (isGoogleUser) {
            toastError("Ação não permitida", "Como você está conectado via Google, sua senha deve ser alterada nas configurações da sua conta Google.");
            setSaving(false);
            return;
          }
          
          await updatePassword(currentUser, newPassword);
          success("Senha alterada", "Sua senha foi alterada com sucesso!");
          setPasswordModalOpen(false);
        } else {
          throw new Error("Usuário não autenticado.");
        }
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toastError("Reautenticação necessária", "Esta operação é sensível e requer login recente. Por favor, faça logout e login novamente para alterar sua senha.");
      } else {
        toastError("Erro ao alterar senha", err.message || "Erro desconhecido.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTenantSwitch = async (id: string) => {
    try {
      await switchTenant(id);
      setTenantDropdownOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao trocar de empresa.";
      alert(msg);
    }
  };

  // System Notifications Real State & Handler
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const loadHeaderNotifications = async () => {
    console.log("[Header Notifications] Iniciando busca de notificações...");
    try {
      let notifs = await getDocs("system_notifications");
      console.log("[Header Notifications] getDocs('system_notifications') retornou:", notifs);
      let list = (notifs as any[]) || [];
      if (list.length === 0) {
        console.log("[Header Notifications] Nenhuma notificação. Inicializando dados...");
        const initial = [
          { title: "Estoque Baixo", message: "Body Splash Carol Ramos Collection com menos de 5 un.", description: "Body Splash Carol Ramos Collection com menos de 5 un.", type: "stock", category: "stock", read: false, createdAt: new Date().toISOString() },
          { title: "Fatura Pendente", message: "Fornecedor Natura vence amanhã: R$ 850,00", description: "Fornecedor Natura vence amanhã: R$ 850,00", type: "financial", category: "financial", read: false, createdAt: new Date().toISOString() },
          { title: "Nova Integração", message: "Shopee conectada com sucesso", description: "Shopee conectada com sucesso", type: "system", category: "system", read: false, createdAt: new Date().toISOString() }
        ];
        for (const item of initial) {
          await createDoc("system_notifications", item);
        }
        notifs = await getDocs("system_notifications");
        list = (notifs as any[]) || [];
      }
      const cleanList = (Array.isArray(list) ? list : []).filter(Boolean).map((n, idx) => ({
        ...n,
        id: n.id || `notif-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        title: typeof n.title === "string" ? n.title : "Notificação",
        message: typeof n.message === "string" ? n.message : (typeof n.description === "string" ? n.description : (typeof n.desc === "string" ? n.desc : "")),
        description: typeof n.description === "string" ? n.description : (typeof n.message === "string" ? n.message : (typeof n.desc === "string" ? n.desc : "")),
        category: n.category || n.type || "system",
        type: n.type || n.category || "system",
        read: Boolean(n.read)
      }));
      console.log("[Header Notifications] Lista sanitizada final:", cleanList);
      setNotificationsList(cleanList);
    } catch (e) {
      console.error("[Header Notifications] EXCEÇÃO AO CARREGAR NOTIFICAÇÕES:", e);
    }
  };

  useEffect(() => {
    loadHeaderNotifications();
  }, [tenantId, notificationsOpen]);

  const handleHeaderMarkAllRead = async () => {
    try {
      const list = Array.isArray(notificationsList) ? notificationsList : [];
      const unread = list.filter(n => n && n.id && !n.read);
      if (unread.length === 0) {
        success("Tudo em dia!", "Todas as notificações já estão marcadas como lidas.");
        return;
      }
      await Promise.all(unread.map(n => updateDoc("system_notifications", n.id, { read: true, readAt: new Date().toISOString() })));
      invalidateCache("system_notifications");
      setNotificationsList(prev => (Array.isArray(prev) ? prev : []).map(n => n && n.id ? ({ ...n, read: true, readAt: new Date().toISOString() }) : n));
      success("Notificações Atualizadas", "Todas as notificações foram marcadas como lidas.");
    } catch (err: any) {
      toastError("Erro ao atualizar", err?.message || "Erro ao marcar notificações como lidas.");
    }
  };

  const unreadHeaderCount = (Array.isArray(notificationsList) ? notificationsList : []).filter(n => n && !n.read).length;

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

      {/* Direita: PWA Install, Tema, Notificações, Perfil */}
      <div className="flex items-center gap-2">

        {/* PWA Install Button */}
        <button
          data-pwa-install="true"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-all shadow-xs"
          title="Instalar Carol Ramos Collection ERP no seu dispositivo"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>

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
            {unreadHeaderCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold text-primary-foreground shadow-xs animate-pulse">
                {unreadHeaderCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl p-0 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">Notificações</span>
                  {unreadHeaderCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {unreadHeaderCount} não lida(s)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleHeaderMarkAllRead}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Marcar todas como lidas
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {(Array.isArray(notificationsList) ? notificationsList : []).map((notif, index) => {
                  if (!notif) return null;
                  const notifId = notif.id || `notif-${index}`;
                  const isUnread = Boolean(!notif.read);
                  const title = notif.title || "Notificação";
                  const msg = notif.message || notif.description || notif.desc || "";
                  const type = notif.type || notif.category || "system";
                  return (
                    <div
                      key={notifId}
                      onClick={async () => {
                        if (isUnread && notif.id) {
                          try {
                            await updateDoc("system_notifications", notif.id, { read: true, readAt: new Date().toISOString() });
                            invalidateCache("system_notifications");
                            setNotificationsList(prev => (Array.isArray(prev) ? prev : []).map(n => n && n.id === notif.id ? { ...n, read: true } : n));
                          } catch (e) {
                            console.error("Erro ao marcar notificação no header:", e);
                          }
                        }
                      }}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors border-b border-border/50 last:border-0 cursor-pointer",
                        isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30 opacity-75"
                      )}
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        type === "stock" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        type === "financial" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}>
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-xs font-semibold truncate", isUnread ? "text-foreground font-bold" : "text-muted-foreground")}>
                            {title}
                          </span>
                          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          {msg}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!Array.isArray(notificationsList) || notificationsList.length === 0) && (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    Nenhuma notificação no momento.
                  </div>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="block w-full text-[11px] text-center font-semibold text-primary hover:underline transition-colors"
                >
                  Central de Notificações
                </Link>
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
                    const isModalAction = item.label === "Seu Perfil" || item.label === "Minha Conta" || item.label === "Alterar Senha";

                    if (isModalAction) {
                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            if (item.label === "Seu Perfil") setProfileModalOpen(true);
                            if (item.label === "Minha Conta") setAccountModalOpen(true);
                            if (item.label === "Alterar Senha") setPasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left font-medium"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>{item.label}</span>
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.label === "Empresa" ? "/settings" : item.href}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
      {/* 1. Modal: Seu Perfil */}
      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Seu Perfil de Usuário"
        description="Atualize suas informações pessoais, foto de perfil e preferências."
        size="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {/* Foto de Perfil */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
            <div className="relative h-16 w-16 rounded-2xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl overflow-hidden shrink-0 border border-border">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div className="space-y-1.5 flex-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Foto do Perfil</span>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold transition-all">
                <Upload className="h-3.5 w-3.5" />
                <span>Escolher Imagem</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {photoUploadProgress !== null && (
                <div className="w-full space-y-1 my-1">
                  <div className="flex items-center justify-between text-[10px] text-primary font-bold">
                    <span>Enviando...</span>
                    <span>{photoUploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-200" style={{ width: `${photoUploadProgress}%` }} />
                  </div>
                </div>
              )}
              {photoUploadError && (
                <p className="text-[10px] text-destructive font-semibold">{photoUploadError}</p>
              )}
              <p className="text-[10px] text-muted-foreground">JPG, PNG ou WebP (Máx {MAX_IMAGE_SIZE_MB}MB)</p>
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Completo *</label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">E-mail de Contato *</label>
            <input
              type="email"
              required
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Telefone / WhatsApp</label>
            <input
              type="text"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Preferências */}
          <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-3">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Preferências de Conta</span>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">Idioma Principal</span>
              <select
                value={profilePreferences.language}
                onChange={(e) => setProfilePreferences(prev => ({ ...prev, language: e.target.value }))}
                className="px-2 py-1 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">Notificações por E-mail</span>
              <input
                type="checkbox"
                checked={profilePreferences.notifications}
                onChange={(e) => setProfilePreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* 2. Modal: Minha Conta */}
      <Modal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title="Detalhes da Sua Conta"
        description="Informações sobre o plano, credenciais e sessões operacionais ativas."
        size="md"
      >
        <div className="space-y-4 text-xs">
          {/* Informações Gerais */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Plano Ativo</span>
              <span className="px-2 py-0.5 rounded-full bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-950/40 dark:text-rosegold-300 border border-rosegold-200/50 text-[10px] font-bold">
                Plano Premium Pro
              </span>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Nível de Permissão</span>
              <span className="text-xs font-bold text-foreground capitalize">
                {profile?.tenants?.[tenantId || ""]?.role || "owner"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Data de Criação</span>
              <span className="text-xs text-foreground font-medium">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Não disponível"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Último Acesso</span>
              <span className="text-xs text-foreground font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Sessões Ativas */}
          <div className="space-y-2">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Sessões Ativas</span>
            <div className="p-3.5 rounded-xl border border-border bg-card/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5 text-primary shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground block">Navegador da Web</span>
                  <span className="text-[10px] text-muted-foreground block">São Paulo, BR • IP: 186.221.X.X</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[8px] font-bold tracking-widest uppercase">
                Esta Sessão
              </span>
            </div>
          </div>

          <ModalFooter>
            <button
              onClick={() => setAccountModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold"
            >
              Fechar
            </button>
          </ModalFooter>
        </div>
      </Modal>

      {/* 3. Modal: Alterar Senha */}
      <Modal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Alterar Sua Senha"
        description="Defina uma nova senha para acessar o sistema com segurança."
        size="md"
      >
        <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
          {/* Senha Atual */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Senha Atual</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nova Senha</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Key className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Confirmar Nova Senha</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Key className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Alterar Senha"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

    </header>
  );
}
