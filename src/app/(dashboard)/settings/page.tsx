"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { IntegrationConfig, IntegrationLog, Automation } from "@/features/integrations/types";
import { IntegrationConfigSchema, AutomationSchema } from "@/features/integrations/schemas";
import { Product } from "@/features/products/types";
import { processImageUpload, MAX_IMAGE_SIZE_MB, safeLocalStorageSetItem } from "@/lib/imageUpload";
import {
  Building2,
  Shield,
  Sliders,
  CheckCircle2,
  Globe,
  RefreshCw,
  Plus,
  X,
  Trash2,
  Activity,
  Check,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Sparkles,
  Zap,
  ShoppingBag,
  Code,
  Upload,
  Save,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  Clock,
  PlusCircle,
  MoreVertical,
  Edit3,
  Power,
  Palette,
  Type,
  LayoutTemplate,
  RotateCcw,
  Monitor
} from "lucide-react";
import { useAppearance, COLOR_MAP, FONT_MAP, RADIUS_MAP, PrimaryColor, FontFamily, FontSize, BorderRadius, Spacing, ShadowLevel } from "@/context/AppearanceContext";

// Custom SVG Icons for socials (Req 1)
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
import { cn, maskCep, maskPhone, maskCnpj } from "@/lib/utils";

// Custom SVG Icons for integrations
const ShopeeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.36 14.3H8.64l-.56-2.5h7.84l-.56 2.5zm.9-4H7.74l-.56-2.5h9.64l-.56 2.5z" />
  </svg>
);

const MeliIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// Initial Mock Automations
const INITIAL_AUTOMATIONS = [
  { name: "Boas-vindas ao Cliente", trigger: "customer_created" as const, actionType: "whatsapp_message" as const, template: "Olá {name}, seja muito bem-vinda à Carol Ramos Collection! ✨ Use o cupom CR10 para obter 10% de desconto na sua primeira compra. Aproveite! 💖", status: "active" as const },
  { name: "Confirmação de Venda", trigger: "sale_completed" as const, actionType: "whatsapp_message" as const, template: "Olá {name}! Seu pedido de R$ {total} foi confirmado e já está na esteira de separação. Código do pedido: #{id}. Agradecemos a preferência! 🛍️", status: "active" as const },
  { name: "Lembrete de Atendimento", trigger: "appointment_confirmed" as const, actionType: "whatsapp_message" as const, template: "Olá {name}! Confirmamos seu agendamento de {service} para o dia {date} às {time}. Profissional: {professional}. Esperamos você! ✨", status: "inactive" as const }
];

interface TimePeriod {
  open: string;
  close: string;
}

interface DaySchedule {
  isOpen: boolean;
  periods: TimePeriod[];
}

type WeekSchedule = Record<string, DaySchedule>;

const DAYS_TRANSLATIONS: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  monday: { isOpen: true, periods: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }] },
  tuesday: { isOpen: true, periods: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }] },
  wednesday: { isOpen: true, periods: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }] },
  thursday: { isOpen: true, periods: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }] },
  friday: { isOpen: true, periods: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }] },
  saturday: { isOpen: true, periods: [{ open: "09:00", close: "13:00" }] },
  sunday: { isOpen: false, periods: [] }
};

export default function SettingsPage() {
  const { user, profile, role, tenantId, activeCompany, createCompany, switchTenant, isMock, updateProfileMock } = useAuth();
  const { createDoc, getDocs, updateDoc, deleteDoc, getDocById, invalidateCache } = useDb();
  const { settings: appSettings, updateSetting: updateAppSetting, resetToDefaults: resetAppDefaults } = useAppearance();

  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "rbac" | "params" | "integrations" | "logs" | "backup">("profile");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["profile", "appearance", "rbac", "params", "integrations", "logs", "backup"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Lists
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"audit" | "ai">("audit");


  // Config Form Drawer
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'shopee' | 'mercado_libre' | 'whatsapp'>("shopee");
  
  // Credentials Inputs
  const [shopId, setShopId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");

  // Automation Form
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [autoEditingId, setAutoEditingId] = useState<string | null>(null);
  const [autoName, setAutoName] = useState("");
  const [autoTrigger, setAutoTrigger] = useState<'sale_completed' | 'customer_created' | 'appointment_confirmed'>("sale_completed");
  const [autoAction, setAutoAction] = useState<'whatsapp_message' | 'email_message' | 'discount_coupon'>("whatsapp_message");
  const [autoTemplate, setAutoTemplate] = useState("");
  const [autoStatus, setAutoStatus] = useState<'active' | 'inactive'>("active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parameters state (Req 13 - CPF/CNPJ fix)
  const [requireCpf, setRequireCpf] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('param_requireCpf') === 'true';
    }
    return false;
  });
  const [requireStockAlert, setRequireStockAlert] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('param_requireStockAlert') !== 'false';
    }
    return true;
  });

  const handleToggleParam = (key: 'requireCpf' | 'requireStockAlert', value: boolean) => {
    if (key === 'requireCpf') {
      setRequireCpf(value);
      localStorage.setItem('param_requireCpf', String(value));
    } else {
      setRequireStockAlert(value);
      localStorage.setItem('param_requireStockAlert', String(value));
    }
  };

  // Company Profile Form state (Req 1)
  const [compName, setCompName] = useState("");
  const [compTradeName, setCompTradeName] = useState("");
  const [compCnpj, setCompCnpj] = useState("");
  const [compIe, setCompIe] = useState("");
  const [compIm, setCompIm] = useState("");
  const [compCnae, setCompCnae] = useState("");
  const [compCep, setCompCep] = useState("");
  const [compStreet, setCompStreet] = useState("");
  const [compNumber, setCompNumber] = useState("");
  const [compComplement, setCompComplement] = useState("");
  const [compNeighborhood, setCompNeighborhood] = useState("");
  const [compCity, setCompCity] = useState("");
  const [compState, setCompState] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compWhatsapp, setCompWhatsapp] = useState("");
  const [compEmail, setCompEmail] = useState("");
  const [compSite, setCompSite] = useState("");
  const [compInstagram, setCompInstagram] = useState("");
  const [compFacebook, setCompFacebook] = useState("");
  const [compTiktok, setCompTiktok] = useState("");
  const [compLogo, setCompLogo] = useState("");
  const [compOpeningHours, setCompOpeningHours] = useState("");
  const [compNotes, setCompNotes] = useState("");
  const [compHours, setCompHours] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE);

  // Sub-tabs inside profile edit form
  const [profileFormTab, setProfileFormTab] = useState<"ident" | "addr" | "contacts" | "extra">("ident");

  // Multi-company form modal (Req 2)
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");

  // Multi-Company List and Operations States
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Edit Company Modal state
  const [editCompanyModalOpen, setEditCompanyModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyTradeName, setEditCompanyTradeName] = useState("");
  const [editCompanyCnpj, setEditCompanyCnpj] = useState("");
  const [editCompanyStatus, setEditCompanyStatus] = useState<"active" | "inactive">("active");

  const loadCompanies = useCallback(async () => {
    if (!profile || !profile.tenants) return;
    setLoadingCompanies(true);
    try {
      const list = await Promise.all(
        Object.keys(profile.tenants).map(async (id) => {
          let companyData = null;
          if (isMock) {
            const saved = localStorage.getItem(`company_profile_${id}`);
            companyData = saved ? JSON.parse(saved) : null;
          } else {
            companyData = await getDocById("companies", id);
          }
          return companyData || {
            id,
            name: id === "carol-ramos-collection" ? "Carol Ramos Collection" : "Beleza SaaS Demo",
            tradeName: id === "carol-ramos-collection" ? "Carol Ramos Collection" : "Beleza SaaS Demo",
            status: "active",
            cnpj: "12.345.678/0001-99",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        })
      );
      setCompaniesList(list);
    } catch (err: any) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoadingCompanies(false);
    }
  }, [profile, isMock, getDocById]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleSwitchCompanyNoReload = async (id: string, status: string) => {
    if (status === "inactive") {
      toastError("Ação inválida", "Esta empresa está desativada e não pode ser selecionada.");
      return;
    }
    setLoading(true);
    try {
      await switchTenant(id);
      success("Empresa alternada", "O contexto operacional foi atualizado com sucesso!");
    } catch (e: any) {
      toastError("Erro ao alternar", e.message || "Erro ao trocar a empresa ativa.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompanyStatus = async (id: string, currentStatus: "active" | "inactive") => {
    if (id === tenantId && currentStatus === "active") {
      toastError("Ação inválida", "Você não pode desativar a empresa que está atualmente ativa. Selecione outra empresa como ativa primeiro.");
      return;
    }

    setLoading(true);
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      if (isMock) {
        const saved = localStorage.getItem(`company_profile_${id}`);
        const parsed = saved ? JSON.parse(saved) : { id };
        parsed.status = newStatus;
        parsed.updatedAt = new Date().toISOString();
        safeLocalStorageSetItem(`company_profile_${id}`, JSON.stringify(parsed));
        success("Status atualizado", `Empresa ${newStatus === "active" ? "ativada" : "desativada"} com sucesso!`);
      } else {
        await updateDoc("companies", id, { status: newStatus, updatedAt: new Date().toISOString() });
        success("Status atualizado", `Empresa ${newStatus === "active" ? "ativada" : "desativada"} no Firestore com sucesso!`);
      }
      await loadCompanies();
    } catch (e: any) {
      toastError("Erro ao alterar status", e.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
      setOpenActionMenuId(null);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (id === tenantId) {
      toastError("Ação inválida", "Você não pode excluir a empresa que está atualmente ativa. Selecione outra empresa como ativa primeiro.");
      return;
    }

    if (!confirm(`Deseja realmente excluir a empresa "${name}"? Esta ação removerá seu acesso a todos os dados dessa loja e é irreversível.`)) {
      return;
    }

    setLoading(true);
    try {
      if (profile && profile.tenants) {
        const updatedTenants = { ...profile.tenants };
        delete updatedTenants[id];
        
        if (isMock) {
          const newProfile = {
            ...profile,
            tenants: updatedTenants
          } as any;
          updateProfileMock(newProfile);
          localStorage.removeItem(`company_profile_${id}`);
        } else {
          if (user) {
            await updateDoc("users", user.uid, { tenants: updatedTenants });
            await deleteDoc("companies", id);
            localStorage.removeItem(`company_profile_${id}`);
          }
        }
        
        invalidateCache("companies");
        success("Empresa excluída", "A empresa foi removida da sua conta com sucesso!");
      }
      await loadCompanies();
    } catch (e: any) {
      toastError("Erro ao excluir", e.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
      setOpenActionMenuId(null);
    }
  };

  const handleOpenEditCompany = (company: any) => {
    setEditingCompanyId(company.id);
    setEditCompanyName(company.name || "");
    setEditCompanyTradeName(company.tradeName || "");
    setEditCompanyCnpj(company.cnpj || "");
    setEditCompanyStatus(company.status || "active");
    setEditCompanyModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleSaveEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyId) return;

    if (editingCompanyId === tenantId && editCompanyStatus === "inactive") {
      toastError("Ação inválida", "Você não pode desativar a empresa atualmente ativa. Selecione outra empresa como ativa primeiro.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: editCompanyName,
        tradeName: editCompanyTradeName,
        cnpj: editCompanyCnpj,
        status: editCompanyStatus,
        updatedAt: new Date().toISOString()
      };

      if (isMock) {
        const saved = localStorage.getItem(`company_profile_${editingCompanyId}`);
        const parsed = saved ? JSON.parse(saved) : { id: editingCompanyId };
        const updatedCompany = { ...parsed, ...payload };
        safeLocalStorageSetItem(`company_profile_${editingCompanyId}`, JSON.stringify(updatedCompany));
        
        if (editingCompanyId === tenantId) {
          // Trigger settings state update
          setCompName(editCompanyName);
          setCompTradeName(editCompanyTradeName);
          setCompCnpj(editCompanyCnpj);
        }
        success("Empresa atualizada", "Dados da empresa salvos localmente com sucesso!");
      } else {
        await updateDoc("companies", editingCompanyId, payload);
        success("Empresa atualizada", "Dados da empresa atualizados no Firestore com sucesso!");
      }
      setEditCompanyModalOpen(false);
      await loadCompanies();
    } catch (e: any) {
      toastError("Erro ao salvar", e.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCompanyLogo = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Logo = reader.result as string;
        if (isMock) {
          const saved = localStorage.getItem(`company_profile_${id}`);
          const parsed = saved ? JSON.parse(saved) : { id };
          parsed.logo = base64Logo;
          safeLocalStorageSetItem(`company_profile_${id}`, JSON.stringify(parsed));
          success("Logo atualizado", "Logo da empresa atualizado localmente!");
        } else {
          await updateDoc("companies", id, { logo: base64Logo, updatedAt: new Date().toISOString() });
          success("Logo updated", "Logo da empresa atualizado no Firestore!");
        }
        await loadCompanies();
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toastError("Erro ao enviar logo", err.message || "Falha ao ler arquivo.");
      setLoading(false);
    }
  };

  // Synchronize company profile states when activeCompany changes
  useEffect(() => {
    if (activeCompany) {
      setCompName(activeCompany.name || "");
      setCompTradeName(activeCompany.tradeName || "");
      setCompCnpj(activeCompany.cnpj || "");
      setCompIe(activeCompany.ie || "");
      setCompIm(activeCompany.im || "");
      setCompCnae(activeCompany.cnae || "");
      setCompCep(activeCompany.address?.cep || "");
      setCompStreet(activeCompany.address?.street || "");
      setCompNumber(activeCompany.address?.number || "");
      setCompComplement(activeCompany.address?.complement || "");
      setCompNeighborhood(activeCompany.address?.neighborhood || "");
      setCompCity(activeCompany.address?.city || "");
      setCompState(activeCompany.address?.state || "");
      setCompPhone(activeCompany.phone || "");
      setCompWhatsapp(activeCompany.whatsapp || "");
      setCompEmail(activeCompany.email || "");
      setCompSite(activeCompany.website || "");
      setCompInstagram(activeCompany.socials?.instagram || "");
      setCompFacebook(activeCompany.socials?.facebook || "");
      setCompTiktok(activeCompany.socials?.tiktok || "");
      setCompLogo(activeCompany.logo || "");
      setCompOpeningHours(activeCompany.openingHours || "");
      setCompNotes(activeCompany.notes || "");
      if (activeCompany.hours) {
        setCompHours(activeCompany.hours);
      } else {
        setCompHours(DEFAULT_WEEK_SCHEDULE);
      }
    }
  }, [activeCompany]);

  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    let masked = raw;
    if (raw.length > 2) masked = `${raw.substring(0, 2)}.${raw.substring(2)}`;
    if (raw.length > 5) masked = `${raw.substring(0, 2)}.${raw.substring(2, 5)}.${raw.substring(5)}`;
    if (raw.length > 8) masked = `${raw.substring(0, 2)}.${raw.substring(2, 5)}.${raw.substring(5, 8)}/${raw.substring(8)}`;
    if (raw.length > 12) masked = `${raw.substring(0, 2)}.${raw.substring(2, 5)}.${raw.substring(5, 8)}/${raw.substring(8, 12)}-${raw.substring(12, 14)}`;
    setCompCnpj(masked.substring(0, 18));
  };

  const handleCepBlur = async () => {
    const cleanCep = compCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setCompStreet(data.logradouro || "");
        setCompNeighborhood(data.bairro || "");
        setCompCity(data.localidade || "");
        setCompState(data.uf || "");
      }
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
    }
  };

  const handleToggleDay = (day: string) => {
    setCompHours((prev) => {
      const current = prev[day] || { isOpen: false, periods: [] };
      const updated = {
        ...current,
        isOpen: !current.isOpen,
        periods: !current.isOpen && current.periods.length === 0 ? [{ open: "08:00", close: "18:00" }] : current.periods
      };
      return { ...prev, [day]: updated };
    });
  };

  const handleAddPeriod = (day: string) => {
    setCompHours((prev) => {
      const current = prev[day] || { isOpen: true, periods: [] };
      const newPeriods = [...current.periods, { open: "13:00", close: "18:00" }];
      return {
        ...prev,
        [day]: { ...current, periods: newPeriods }
      };
    });
  };

  const handleRemovePeriod = (day: string, idx: number) => {
    setCompHours((prev) => {
      const current = prev[day] || { isOpen: true, periods: [] };
      const newPeriods = current.periods.filter((_, i) => i !== idx);
      return {
        ...prev,
        [day]: { ...current, periods: newPeriods }
      };
    });
  };

  const handleUpdatePeriodTime = (day: string, idx: number, field: "open" | "close", val: string) => {
    setCompHours((prev) => {
      const current = prev[day] || { isOpen: true, periods: [] };
      const newPeriods = [...current.periods];
      newPeriods[idx] = { ...newPeriods[idx], [field]: val };
      return {
        ...prev,
        [day]: { ...current, periods: newPeriods }
      };
    });
  };

  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploadError(null);
    setLogoUploadProgress(0);

    const res = await processImageUpload(file, {
      maxWidth: 800,
      maxHeight: 800,
      onProgress: (percent) => setLogoUploadProgress(percent)
    });

    if (res.success && res.dataUrl) {
      setCompLogo(res.dataUrl);
      success("Logo Carregada", "Foto da logo processada e anexada com sucesso.");
      setTimeout(() => setLogoUploadProgress(null), 1000);
    } else {
      setLogoUploadError(res.errorMessage || "Erro ao carregar logo.");
      toastError("Erro de Upload", res.errorMessage || "Falha no upload da logo.");
      setLogoUploadProgress(null);
    }
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setLoading(true);
    const payload = {
      name: compName,
      tradeName: compTradeName,
      cnpj: compCnpj,
      ie: compIe,
      im: compIm,
      cnae: compCnae,
      phone: compPhone,
      whatsapp: compWhatsapp,
      email: compEmail,
      website: compSite,
      openingHours: compOpeningHours,
      notes: compNotes,
      logo: compLogo,
      address: {
        cep: compCep,
        street: compStreet,
        number: compNumber,
        complement: compComplement,
        neighborhood: compNeighborhood,
        city: compCity,
        state: compState
      },
      socials: {
        instagram: compInstagram,
        facebook: compFacebook,
        tiktok: compTiktok
      },
      hours: compHours,
      updatedAt: new Date().toISOString()
    };

    try {
      await updateDoc("companies", tenantId, payload);
      if (typeof window !== "undefined") {
        safeLocalStorageSetItem(`company_profile_${tenantId}`, JSON.stringify({ id: tenantId, ...payload }));
      }
      success("Sucesso", "Perfil da empresa atualizado com sucesso!");
    } catch (err: any) {
      toastError("Erro ao salvar", err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    setLoading(true);
    try {
      const newId = await createCompany(newCompanyName, newCompanyCnpj);
      setNewCompanyModalOpen(false);
      setNewCompanyName("");
      setNewCompanyCnpj("");
      success("Empresa criada!", `A empresa foi registrada. Alternando contexto para a nova empresa.`);
      await switchTenant(newId);
      await loadCompanies();
    } catch (err: any) {
      toastError("Erro ao criar empresa", err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };


  // Webhook Simulator State
  const [simChannel, setSimChannel] = useState<'shopee' | 'mercado_libre'>("shopee");
  const [simProductId, setSimProductId] = useState("");
  const [simQuantity, setSimQuantity] = useState(1);
  const [simCustomerName, setSimCustomerName] = useState("Juliana de Souza");
  const [simSuccessMsg, setSimSuccessMsg] = useState("");

  const tenantNameMap: Record<string, string> = {
    "carol-ramos-collection": "Carol Ramos Collection",
    "beleza-saas-demo": "Beleza SaaS Demo"
  };

  const activeTenantName = tenantId ? (tenantNameMap[tenantId] || tenantId) : "";

  // Load Integrations
  const loadIntegrationsData = async () => {
    setLoading(true);
    try {
      const [dbConfigs, dbLogs, dbAutos, dbProds, dbAudits, dbAis] = await Promise.all([
        getDocs("integration_configs"),
        getDocs("integration_logs"),
        getDocs("automations"),
        getDocs("products"),
        getDocs("audit_logs"),
        getDocs("ai_logs")
      ]);

      setProducts(dbProds as Product[]);
      setLogs(dbLogs as IntegrationLog[]);
      setAuditLogs(dbAudits || []);

      // Seed mock integrations if empty
      let currentConfigs = dbConfigs as IntegrationConfig[];
      if (currentConfigs.length === 0) {
        const shopeeSeed = {
          channel: "shopee" as const,
          status: "connected" as const,
          credentials: { shopId: "9912034", apiKey: "shopee_key_prod_abc123" },
          lastSyncAt: new Date().toISOString()
        };
        const mlSeed = {
          channel: "mercado_libre" as const,
          status: "disconnected" as const,
          credentials: {}
        };
        const waSeed = {
          channel: "whatsapp" as const,
          status: "connected" as const,
          credentials: { phoneId: "10920491823901", wabaId: "2094812049" },
          lastSyncAt: new Date().toISOString()
        };

        await createDoc("integration_configs", shopeeSeed);
        await createDoc("integration_configs", mlSeed);
        await createDoc("integration_configs", waSeed);

        const freshConfigs = await getDocs("integration_configs");
        setConfigs(freshConfigs as IntegrationConfig[]);
      } else {
        setConfigs(currentConfigs);
      }

      // Seed mock automations
      let currentAutos = dbAutos as Automation[];
      if (currentAutos.length === 0) {
        for (const aut of INITIAL_AUTOMATIONS) {
          await createDoc("automations", aut);
        }
        const freshAutos = await getDocs("automations");
        setAutomations(freshAutos as Automation[]);
      } else {
        setAutomations(currentAutos);
      }

      // Seed mock AI Logs
      let currentAis = dbAis as any[];
      if (currentAis.length === 0) {
        const seedAis = [
          { user: "admin@carolramos.com.br", prompt: "Qual foi o faturamento total da Shopee esta semana?", model: "gemini-2.5-flash", tokensUsed: 1240, responseSummary: "Faturamento gerado com sucesso.", createdAt: new Date().toISOString() },
          { user: "admin@carolramos.com.br", prompt: "Quais produtos estão com estoque crítico?", model: "gemini-2.5-flash", tokensUsed: 980, responseSummary: "Identificados 3 produtos críticos de estoque.", createdAt: new Date().toISOString() }
        ];
        for (const ai of seedAis) {
          await createDoc("ai_logs", ai);
        }
        currentAis = await getDocs("ai_logs");
      }
      setAiLogs(currentAis);

      if (dbProds.length > 0) {
        setSimProductId(dbProds[0].id);
      }
    } catch (e) {
      console.error("Erro ao sincronizar integrações:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "integrations" || activeTab === "logs") {
      loadIntegrationsData();
    }
  }, [activeTab]);

  // 1. Abrir Modal de Credenciais do Canal
  const handleOpenCredentials = (channel: typeof selectedChannel) => {
    const config = configs.find(c => c.channel === channel);
    setSelectedChannel(channel);
    setShopId(config?.credentials.shopId || "");
    setApiKey(config?.credentials.apiKey || "");
    setAccessToken(config?.credentials.accessToken || "");
    setPhoneId(config?.credentials.phoneId || "");
    setWabaId(config?.credentials.wabaId || "");
    setModalOpen(true);
  };

  // 2. Conectar Canal
  const handleConnectChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const config = configs.find(c => c.channel === selectedChannel);
      const payload = {
        channel: selectedChannel,
        status: "connected" as const,
        credentials: {
          shopId: shopId || undefined,
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          phoneId: phoneId || undefined,
          wabaId: wabaId || undefined,
        }
      };

      const result = IntegrationConfigSchema.safeParse(payload);
      if (!result.success) {
        alert(result.error.issues[0].message);
        return;
      }

      if (config) {
        await updateDoc("integration_configs", config.id, {
          ...payload,
          lastSyncAt: new Date().toISOString()
        });
      } else {
        await createDoc("integration_configs", payload);
      }

      // Log success event
      await createDoc("integration_logs", {
        channel: selectedChannel,
        type: "sync_stock",
        status: "success",
        message: `Canal ${selectedChannel.toUpperCase()} conectado e inventário sincronizado com sucesso!`
      });

      setModalOpen(false);
      await loadIntegrationsData();
    } catch (err: any) {
      alert(err.message || "Erro ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  // Desconectar canal
  const handleDisconnect = async (id: string, channel: string) => {
    if (confirm(`Deseja desconectar a integração com o ${channel.toUpperCase()}?`)) {
      try {
        await updateDoc("integration_configs", id, { status: "disconnected", credentials: {} });
        await loadIntegrationsData();
      } catch (e: any) {
        alert(e.message || "Erro ao desconectar.");
      }
    }
  };

  // 3. Simular Recebimento de Webhook (Venda de Marketplace)
  const handleSimulateWebhook = async () => {
    const prod = products.find(p => p.id === simProductId);
    if (!prod) return;

    if (prod.currentStock < simQuantity) {
      alert("Estoque insuficiente para esta simulação.");
      return;
    }

    setLoading(true);
    setSimSuccessMsg("");

    try {
      const saleVal = prod.sellPrice * simQuantity;

      // 1. Criar Venda correspondente
      const newSale = await createDoc("sales", {
        customerId: "marketplace-buyer",
        items: [{
          productId: prod.id,
          name: prod.name,
          quantity: simQuantity,
          unitPrice: prod.sellPrice,
          costPrice: prod.costPrice,
          discount: 0
        }],
        subtotal: saleVal,
        discount: 0,
        total: saleVal,
        paymentMethod: "pix" as const, // Marketplace repassa pix/dinheiro
        status: "completed" as const,
        channel: simChannel
      });

      // 2. Registrar Log da Integração
      await createDoc("integration_logs", {
        channel: simChannel,
        type: "webhook",
        status: "success",
        message: `Webhook recebido: Pedido #${newSale.id} importado com sucesso. Comprador: ${simCustomerName}`,
        payload: { buyer: simCustomerName, item: prod.name, quantity: simQuantity, total: saleVal }
      });

      // 3. Abater Estoque Físico
      await updateDoc("products", prod.id, {
        currentStock: prod.currentStock - simQuantity,
        availableStock: prod.availableStock - simQuantity,
        lastSaleDate: new Date().toISOString()
      });

      // Registrar transação de inventário
      await createDoc("inventory_transactions", {
        productId: prod.id,
        locationId: "deposito-central",
        type: "out" as const,
        quantity: simQuantity,
        costPriceAtTime: prod.costPrice,
        reason: `Venda via Webhook ${simChannel.toUpperCase()} - Pedido #${newSale.id}`
      });

      // 4. Criar Receita no Caixa/Banco PJ
      await createDoc("financial_transactions", {
        type: "revenue" as const,
        category: "sale" as const,
        amount: saleVal,
        description: `Importação: Venda ${simChannel.toUpperCase()} - Pedido #${newSale.id}`,
        paymentDate: new Date().toISOString().split("T")[0],
        status: "paid" as const,
        bankAccountId: "itau-pj", // Banco Itaú PJ
        referenceId: newSale.id
      });

      // 5. Executar automações se houver regra correspondente a venda
      const saleCompletedAutos = automations.filter(a => a.trigger === "sale_completed" && a.status === "active");
      for (const auto of saleCompletedAutos) {
        const formattedMsg = auto.template
          .replace("{name}", simCustomerName)
          .replace("{total}", saleVal.toFixed(2))
          .replace("{id}", newSale.id);

        await createDoc("notifications", {
          type: "automation_notification",
          customerId: "marketplace-buyer",
          message: `[WhatsApp Automático]: ${formattedMsg}`,
          sentAt: new Date().toISOString()
        });
      }

      setSimSuccessMsg(`WebHook Sucedido! Pedido faturado. R$ ${saleVal.toFixed(2)} inserido nas receitas bancárias, estoque do produto decrementado de ${prod.currentStock} para ${prod.currentStock - simQuantity}.`);
      await loadIntegrationsData();
    } catch (err: any) {
      alert(err.message || "Erro na simulação do webhook.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Automations CRUD
  const handleOpenAuto = (id?: string) => {
    setErrors({});
    if (id) {
      const auto = automations.find(a => a.id === id);
      if (auto) {
        setAutoEditingId(id);
        setAutoName(auto.name);
        setAutoTrigger(auto.trigger);
        setAutoAction(auto.actionType);
        setAutoTemplate(auto.template);
        setAutoStatus(auto.status);
      }
    } else {
      setAutoEditingId(null);
      setAutoName("");
      setAutoTrigger("sale_completed");
      setAutoAction("whatsapp_message");
      setAutoTemplate("");
      setAutoStatus("active");
    }
    setAutoModalOpen(true);
  };

  const handleSaveAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      name: autoName,
      trigger: autoTrigger,
      actionType: autoAction,
      template: autoTemplate,
      status: autoStatus
    };

    const result = AutomationSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => errs[i.path.join(".")] = i.message);
      setErrors(errs);
      return;
    }

    try {
      if (autoEditingId) {
        await updateDoc("automations", autoEditingId, payload);
      } else {
        await createDoc("automations", payload);
      }
      setAutoModalOpen(false);
      await loadIntegrationsData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar automação.");
    }
  };

  // Backup State & Handlers
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastAutoBackupDate, setLastAutoBackupDate] = useState<string | null>(null);

  const loadBackupsHistory = useCallback(async () => {
    try {
      const history = await getDocs("backups");
      setBackupsList((history as any[]) || []);
      const savedLastDate = typeof window !== "undefined" ? localStorage.getItem("last_auto_backup_date") : null;
      if (savedLastDate) setLastAutoBackupDate(savedLastDate);
    } catch (err) {
      console.error("Erro ao carregar backups:", err);
    }
  }, [getDocs]);

  useEffect(() => {
    loadBackupsHistory();
  }, [loadBackupsHistory]);

  const handleCreateBackupNow = async (isAuto = false) => {
    setIsBackingUp(true);
    try {
      const [
        custs, prods, supps, finTrans, payables, receivables, salesData, purchasesData, cats, brs, invTrans, kitsData
      ] = await Promise.all([
        getDocs("customers"),
        getDocs("products"),
        getDocs("suppliers"),
        getDocs("financial_transactions"),
        getDocs("accounts_payable"),
        getDocs("accounts_receivable"),
        getDocs("sales"),
        getDocs("purchases"),
        getDocs("categories"),
        getDocs("brands"),
        getDocs("inventory_transactions"),
        getDocs("product_kits")
      ]);

      const backupPayload = {
        meta: {
          app: "Carol Ramos Collection ERP",
          version: "2.0.0",
          tenantId: tenantId || "default",
          createdAt: new Date().toISOString(),
          type: isAuto ? "auto_daily" : "manual"
        },
        data: {
          customers: custs || [],
          products: prods || [],
          suppliers: supps || [],
          financial_transactions: finTrans || [],
          accounts_payable: payables || [],
          accounts_receivable: receivables || [],
          sales: salesData || [],
          purchases: purchasesData || [],
          categories: cats || [],
          brands: brs || [],
          inventory_transactions: invTrans || [],
          product_kits: kitsData || []
        }
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const nowStr = new Date().toISOString();

      // Gravar na coleção de auditoria de backups
      await createDoc("backups", {
        type: isAuto ? "Automático Diário" : "Manual",
        createdAt: nowStr,
        recordsCount: Object.values(backupPayload.data).reduce((sum, arr: any) => sum + (arr?.length || 0), 0),
        sizeBytes: new Blob([jsonString]).size
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("last_auto_backup_date", nowStr);
        setLastAutoBackupDate(nowStr);
      }

      // Download manual do arquivo JSON se acionado pelo usuário
      if (!isAuto) {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Backup_CarolRamosERP_${nowStr.split("T")[0]}_${nowStr.split("T")[1].slice(0,5).replace(":","")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        success("Backup Concluído", "Cópia completa de segurança gerada com sucesso!");
      }

      await loadBackupsHistory();
    } catch (err: any) {
      toastError("Erro no Backup", err.message || "Não foi possível gerar a cópia de segurança.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("ATENÇÃO: A restauração irá importar os registros do arquivo de backup. Deseja continuar?")) {
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const backupJson = JSON.parse(text);

      if (!backupJson || !backupJson.data) {
        throw new Error("Arquivo de backup inválido ou corrompido.");
      }

      const collectionsMap = backupJson.data;
      let restoredCount = 0;

      for (const [colName, docsArr] of Object.entries(collectionsMap)) {
        if (Array.isArray(docsArr)) {
          for (const docItem of docsArr) {
            await createDoc(colName, docItem);
            restoredCount++;
          }
          invalidateCache(colName);
        }
      }

      success("Restauração Concluída", `${restoredCount} registros foram restaurados com sucesso!`);
      await loadBackupsHistory();
    } catch (err: any) {
      toastError("Erro ao Restaurar", err.message || "Arquivo de backup inválido.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoStatus = async (auto: Automation) => {
    const nextStatus = auto.status === "active" ? ("inactive" as const) : ("active" as const);
    try {
      await updateDoc("automations", auto.id, { status: nextStatus });
      await loadIntegrationsData();
    } catch (e: any) {
      alert(e.message || "Erro ao alternar status.");
    }
  };

  const handleDeleteAuto = async (id: string, name: string) => {
    if (confirm(`Excluir regra de automação "${name}"?`)) {
      try {
        await deleteDoc("automations", id);
        await loadIntegrationsData();
      } catch (e: any) {
        alert(e.message || "Erro ao excluir.");
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Painel de <span className="font-semibold text-rosegold-500">Configurações SaaS</span></h1>
          <p className="text-xs text-muted-foreground">Gerencie informações do inquilino, usuários, integrações e automações de canais.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Nav menu */}
        <div className="md:col-span-1 p-2 rounded-2xl border border-border bg-card/40 space-y-1.5 h-fit">
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "profile" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Building2 className="h-4.5 w-4.5" />
            <span>Perfil da Empresa</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "appearance" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Palette className="h-4.5 w-4.5" />
            <span>Aparência & Tema</span>
          </button>
          
          <button
            onClick={() => setActiveTab("integrations")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "integrations" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Globe className="h-4.5 w-4.5" />
            <span>Integrações & Canais</span>
          </button>

          <button
            onClick={() => setActiveTab("rbac")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "rbac" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Shield className="h-4.5 w-4.5" />
            <span>Controle de Acesso (RBAC)</span>
          </button>
          
          <button
            onClick={() => setActiveTab("params")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "params" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Sliders className="h-4.5 w-4.5" />
            <span>Parametrização</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "logs" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Activity className="h-4.5 w-4.5" />
            <span>Logs do Sistema</span>
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors",
              activeTab === "backup" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Save className="h-4.5 w-4.5" />
            <span>Backups & Segurança</span>
          </button>
        </div>

        {/* Right Detail area */}
        <div className="md:col-span-2 space-y-6">
          
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              
              {/* SECTION: MULTI-EMPRESA (Req 2 & 3) */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                    <span>Suas Empresas (Multi-Tenant)</span>
                  </h3>
                  <button
                    onClick={() => setNewCompanyModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Nova Empresa</span>
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Alterne instantaneamente o contexto operacional do ERP selecionando uma das empresas abaixo.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {companiesList.map((company) => {
                    const id = company.id;
                    const isActive = id === tenantId;
                    const isDeactivated = company.status === "inactive";
                    const cRole = profile?.tenants?.[id]?.role || "owner";
                    const hasActionMenuOpen = openActionMenuId === id;
                    
                    return (
                      <div
                        key={id}
                        className={cn(
                          "relative p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all",
                          isActive
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                            : isDeactivated
                            ? "border-border bg-muted/20 opacity-75"
                            : "border-border hover:border-primary/20 bg-card hover:bg-muted/30"
                        )}
                      >
                        {/* Top Line: Header & Actions Menu */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            disabled={isDeactivated && !isActive}
                            onClick={() => handleSwitchCompanyNoReload(id, company.status)}
                            className="min-w-0 flex-1 flex items-center gap-3 text-left focus:outline-none"
                          >
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border overflow-hidden",
                              isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border"
                            )}>
                              {company.logo ? (
                                <img src={company.logo} alt="Logo" className="h-full w-full object-cover" />
                              ) : (
                                (company.name || id)[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-foreground truncate block">{company.name}</span>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block mt-0.5">{cRole}</span>
                            </div>
                          </button>

                          {/* Menu button (⋮) */}
                          <div className="relative shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(hasActionMenuOpen ? null : id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {/* Actions Dropdown */}
                            {hasActionMenuOpen && (
                              <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border bg-card shadow-lg p-1.5 z-30 animate-in fade-in-50 slide-in-from-top-1 duration-100">
                                <button
                                  onClick={() => handleOpenEditCompany(company)}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] hover:bg-muted text-foreground transition-colors text-left font-medium"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Editar Empresa</span>
                                </button>
                                
                                <label className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] hover:bg-muted text-foreground transition-colors text-left font-medium cursor-pointer">
                                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Alterar Logo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUploadCompanyLogo(e, id)}
                                    className="hidden"
                                  />
                                </label>

                                <button
                                  onClick={() => handleToggleCompanyStatus(id, company.status || "active")}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] hover:bg-muted text-foreground transition-colors text-left font-medium"
                                >
                                  <Power className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{isDeactivated ? "Ativar Empresa" : "Desativar Empresa"}</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteCompany(id, company.name)}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors text-left font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>Excluir Empresa</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle Line: Details info */}
                        <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-[8px] block">CNPJ</span>
                            <span className="font-medium text-foreground">{company.cnpj || "Sem CNPJ"}</span>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-[8px] block">Usuários</span>
                            <span className="font-medium text-foreground">1 vinculado</span>
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold uppercase tracking-wider text-[8px] block">Última Atualização</span>
                            <span className="font-medium text-foreground text-[9px]">
                              {company.updatedAt ? new Date(company.updatedAt).toLocaleDateString() + " " + new Date(company.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Não disponível"}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Line: Status Indicator */}
                        <div className="flex items-center justify-between pt-1">
                          {isDeactivated ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-[9px] font-bold uppercase tracking-wider">
                              Desativada
                            </span>
                          ) : isActive ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                              Ativa
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[9px] font-bold uppercase tracking-wider">
                              Disponível
                            </span>
                          )}

                          {!isActive && !isDeactivated && (
                            <button
                              onClick={() => handleSwitchCompanyNoReload(id, company.status)}
                              className="text-[10px] text-primary hover:underline font-semibold"
                            >
                              Selecionar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: CADASTRO DETALHADO DA EMPRESA ATIVA (Req 1) */}
              <form onSubmit={handleSaveCompanyProfile} className="p-5 rounded-2xl border border-border bg-card/50 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4.5 w-4.5 text-primary" />
                      <span>Cadastro Completo da Empresa</span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground">ID do Tenant Operacional: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{tenantId}</span></p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl shadow hover:bg-primary/95 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? "Salvando..." : "Salvar Alterações"}</span>
                  </button>
                </div>

                {/* Sub-Tabs Form */}
                <div className="flex border-b border-border text-xs gap-4 font-semibold pb-1.5">
                  {[
                    { id: "ident" as const, label: "Identificação" },
                    { id: "addr" as const, label: "Endereço" },
                    { id: "contacts" as const, label: "Contatos & Redes" },
                    { id: "extra" as const, label: "Funcionamento & Notas" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProfileFormTab(tab.id)}
                      className={cn(
                        "pb-1 border-b-2 transition-all",
                        profileFormTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Identificação */}
                {profileFormTab === "ident" && (
                  <div className="space-y-4">
                    {/* Logo uploader */}
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card/30">
                      <div className="h-16 w-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {compLogo ? (
                          <img src={compLogo} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logotipo da Empresa</label>
                        <div className="flex items-center gap-2">
                          <label className="px-2.5 py-1.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded hover:bg-primary/95 cursor-pointer flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            <span>Upload Logo</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} className="hidden" />
                          </label>
                          {compLogo && (
                            <button
                              type="button"
                              onClick={() => setCompLogo("")}
                              className="px-2.5 py-1.5 border border-border hover:bg-muted text-[10px] font-semibold rounded text-red-500"
                            >
                              Remover Logo
                            </button>
                          )}
                        </div>
                        {logoUploadProgress !== null && (
                          <div className="w-full space-y-1 my-1">
                            <div className="flex items-center justify-between text-[10px] text-primary font-bold">
                              <span>Enviando...</span>
                              <span>{logoUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="bg-primary h-full transition-all duration-200" style={{ width: `${logoUploadProgress}%` }} />
                            </div>
                          </div>
                        )}
                        {logoUploadError && (
                          <p className="text-[10px] text-destructive font-semibold">{logoUploadError}</p>
                        )}
                        <p className="text-[9px] text-muted-foreground">JPG, PNG, WebP (Máx. {MAX_IMAGE_SIZE_MB}MB)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Razão Social *</label>
                        <input
                          type="text"
                          required
                          value={compName}
                          onChange={e => setCompName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Fantasia</label>
                        <input
                          type="text"
                          value={compTradeName}
                          onChange={e => setCompTradeName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CNPJ</label>
                        <input
                          type="text"
                          value={compCnpj}
                          onChange={e => handleCnpjChange(e.target.value)}
                          placeholder="00.000.000/0000-00"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Insc. Estadual</label>
                        <input
                          type="text"
                          value={compIe}
                          onChange={e => setCompIe(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Insc. Municipal</label>
                        <input
                          type="text"
                          value={compIm}
                          onChange={e => setCompIm(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CNAE Principal</label>
                        <input
                          type="text"
                          value={compCnae}
                          onChange={e => setCompCnae(e.target.value)}
                          placeholder="9602-5/02"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Endereço */}
                {profileFormTab === "addr" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CEP</label>
                        <input
                          type="text"
                          value={compCep}
                          onChange={e => setCompCep(maskCep(e.target.value))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                          maxLength={9}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Logradouro / Rua</label>
                        <input
                          type="text"
                          value={compStreet}
                          onChange={e => setCompStreet(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Número</label>
                        <input
                          type="text"
                          value={compNumber}
                          onChange={e => setCompNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Complemento</label>
                        <input
                          type="text"
                          value={compComplement}
                          onChange={e => setCompComplement(e.target.value)}
                          placeholder="Ex: Sala 202"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Bairro</label>
                        <input
                          type="text"
                          value={compNeighborhood}
                          onChange={e => setCompNeighborhood(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Cidade</label>
                        <input
                          type="text"
                          value={compCity}
                          onChange={e => setCompCity(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Estado (UF)</label>
                        <input
                          type="text"
                          value={compState}
                          onChange={e => setCompState(e.target.value)}
                          placeholder="Ex: SP"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Contatos & Redes */}
                {profileFormTab === "contacts" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Telefone Fixo</label>
                        <input
                          type="text"
                          value={compPhone}
                          onChange={e => setCompPhone(e.target.value)}
                          placeholder="(11) 5555-5555"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">WhatsApp Comercial</label>
                        <input
                          type="text"
                          value={compWhatsapp}
                          onChange={e => setCompWhatsapp(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Email de Contato</label>
                        <input
                          type="email"
                          value={compEmail}
                          onChange={e => setCompEmail(e.target.value)}
                          placeholder="contato@empresa.com.br"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Website</label>
                        <input
                          type="text"
                          value={compSite}
                          onChange={e => setCompSite(e.target.value)}
                          placeholder="www.empresa.com.br"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs border-t border-border pt-4">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <InstagramIcon className="h-3 w-3" />
                          <span>Instagram</span>
                        </label>
                        <input
                          type="text"
                          value={compInstagram}
                          onChange={e => setCompInstagram(e.target.value)}
                          placeholder="@empresa"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <FacebookIcon className="h-3 w-3" />
                          <span>Facebook</span>
                        </label>
                        <input
                          type="text"
                          value={compFacebook}
                          onChange={e => setCompFacebook(e.target.value)}
                          placeholder="facebook.com/empresa"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">TikTok</label>
                        <input
                          type="text"
                          value={compTiktok}
                          onChange={e => setCompTiktok(e.target.value)}
                          placeholder="@empresa_tiktok"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Funcionamento */}
                {profileFormTab === "extra" && (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-3 pt-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] block">Horário de Funcionamento (Estilo WhatsApp Business)</label>
                      <div className="space-y-3.5 border border-border/80 bg-muted/10 p-4 rounded-xl max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                        {Object.keys(compHours).map((day) => {
                          const sched = compHours[day] || { isOpen: false, periods: [] };
                          return (
                            <div key={day} className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-border/40 last:border-b-0 text-xs">
                              {/* Left: Day & Toggle */}
                              <div className="flex items-center gap-2.5 w-36 shrink-0 pt-1.5">
                                <input
                                  type="checkbox"
                                  id={`hours-toggle-${day}`}
                                  checked={sched.isOpen}
                                  onChange={() => handleToggleDay(day)}
                                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                />
                                <label htmlFor={`hours-toggle-${day}`} className="font-bold text-foreground cursor-pointer select-none">
                                  {DAYS_TRANSLATIONS[day]}
                                </label>
                              </div>

                              {/* Center: Periods List */}
                              <div className="flex-1 space-y-2">
                                {sched.isOpen ? (
                                  sched.periods.length === 0 ? (
                                    <span className="text-[10px] text-muted-foreground italic pt-1 inline-block">Nenhum horário cadastrado.</span>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {sched.periods.map((period, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                          <input
                                            type="time"
                                            value={period.open}
                                            onChange={(e) => handleUpdatePeriodTime(day, idx, "open", e.target.value)}
                                            className="px-2 py-1 rounded border border-border bg-card font-mono text-[11px] w-20 text-center"
                                          />
                                          <span className="text-muted-foreground text-[10px]">às</span>
                                          <input
                                            type="time"
                                            value={period.close}
                                            onChange={(e) => handleUpdatePeriodTime(day, idx, "close", e.target.value)}
                                            className="px-2 py-1 rounded border border-border bg-card font-mono text-[11px] w-20 text-center"
                                          />
                                          {sched.periods.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemovePeriod(day, idx)}
                                              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors ml-1"
                                              title="Remover período"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded inline-block mt-1">Fechado</span>
                                )}
                              </div>

                              {/* Right: Actions */}
                              {sched.isOpen && (
                                <button
                                  type="button"
                                  onClick={() => handleAddPeriod(day)}
                                  className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors pt-1 shrink-0"
                                >
                                  + Adicionar
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações / Descrição do Estabelecimento</label>
                      <textarea
                        rows={4}
                        value={compNotes}
                        onChange={e => setCompNotes(e.target.value)}
                        placeholder="Informações adicionais sobre o salão, regras de atendimento ou detalhes da marca..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                  </div>
                )}
              </form>

              {/* Plan info */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                    <span>Plano SaaS Contratado</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase border border-primary/20">
                    Pro ERP Multi-Tenant
                  </span>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Sua conta empresarial está associada ao plano Pro ERP, ativado com suporte ilimitado para integração de marketplaces, relatórios financeiros consolidados e assistente de IA Gemini.
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Header & Quick Action */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Palette className="h-4.5 w-4.5 text-primary" />
                    <span>Personalização de Aparência & Tema</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Personalize o esquema de cores, tipografia, bordas e comportamento do sistema.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      resetAppDefaults();
                      success("Padrões restaurados", "A aparência foi redefinida para os valores padrão.");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      success("Aparência salva!", "Suas preferências visuais foram aplicadas com sucesso.");
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/95 transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar Aparência
                  </button>
                </div>
              </div>

              {/* Realtime Preview Banner */}
              <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                <Monitor className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Pré-visualização em Tempo Real</p>
                  <p className="text-[11px] text-muted-foreground">As alterações de cores e estilo são aplicadas instantaneamente no sistema.</p>
                </div>
              </div>

              {/* 1. Cor Principal */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span>Cor Principal (Accent Color)</span>
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {(Object.entries(COLOR_MAP) as [PrimaryColor, typeof COLOR_MAP[PrimaryColor]][]).map(([key, conf]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateAppSetting("primaryColor", key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                        appSettings.primaryColor === key
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
              </div>

              {/* 2. Tipografia */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  <span>Tipografia</span>
                </h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Família de Fonte</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                      {(Object.entries(FONT_MAP) as [FontFamily, typeof FONT_MAP[FontFamily]][]).map(([key, conf]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateAppSetting("fontFamily", key)}
                          className={cn(
                            "px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left",
                            appSettings.fontFamily === key
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

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tamanho da Fonte</span>
                    <div className="flex gap-2 mt-1.5">
                      {([
                        { key: "sm" as FontSize, label: "Pequeno", size: "text-xs" },
                        { key: "md" as FontSize, label: "Médio (Padrão)", size: "text-sm" },
                        { key: "lg" as FontSize, label: "Grande", size: "text-base" },
                      ]).map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => updateAppSetting("fontSize", opt.key)}
                          className={cn(
                            "flex-1 px-3 py-2.5 rounded-xl border text-center transition-all",
                            appSettings.fontSize === opt.key
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
              </div>

              {/* 3. Layout e Bordas */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                  <span>Layout e Bordas</span>
                </h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Arredondamento das Bordas</span>
                    <div className="grid grid-cols-5 gap-2 mt-1.5">
                      {(Object.entries(RADIUS_MAP) as [BorderRadius, typeof RADIUS_MAP[BorderRadius]][]).map(([key, conf]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateAppSetting("borderRadius", key)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 border transition-all rounded-xl",
                            appSettings.borderRadius === key
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

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Espaçamento do Layout</span>
                    <div className="flex gap-2 mt-1.5">
                      {([
                        { key: "compact" as Spacing, label: "Compacto", desc: "Mais conteúdo" },
                        { key: "normal" as Spacing, label: "Normal (Padrão)", desc: "Equilibrado" },
                        { key: "relaxed" as Spacing, label: "Espaçado", desc: "Mais respiro" },
                      ]).map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => updateAppSetting("spacing", opt.key)}
                          className={cn(
                            "flex-1 px-3 py-2.5 rounded-xl border text-center transition-all",
                            appSettings.spacing === opt.key
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
              </div>

              {/* 4. Comportamento e Efeitos */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>Comportamento e Efeitos Visuais</span>
                </h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nível de Sombras</span>
                    <div className="grid grid-cols-4 gap-2 mt-1.5">
                      {([
                        { key: "none" as ShadowLevel, label: "Sem sombra" },
                        { key: "sm" as ShadowLevel, label: "Suave" },
                        { key: "md" as ShadowLevel, label: "Médio (Padrão)" },
                        { key: "lg" as ShadowLevel, label: "Pronunciado" },
                      ]).map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => updateAppSetting("shadowLevel", opt.key)}
                          className={cn(
                            "px-3 py-3 rounded-xl border text-center transition-all",
                            appSettings.shadowLevel === opt.key
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-card/30">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Sidebar colapsada por padrão</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">O menu lateral inicia minimizado ao carregar o sistema.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateAppSetting("sidebarCollapsedByDefault", !appSettings.sidebarCollapsedByDefault)}
                        className={cn(
                          "relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0",
                          appSettings.sidebarCollapsedByDefault ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                        role="switch"
                        aria-checked={appSettings.sidebarCollapsedByDefault}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
                            appSettings.sidebarCollapsedByDefault ? "left-6" : "left-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-card/30">
                      <div className="flex items-start gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">Animações habilitadas</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Transições e micro-animações em todo o sistema.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateAppSetting("animationsEnabled", !appSettings.animationsEnabled)}
                        className={cn(
                          "relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0",
                          appSettings.animationsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                        role="switch"
                        aria-checked={appSettings.animationsEnabled}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
                            appSettings.animationsEnabled ? "left-6" : "left-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTEGRATIONS & CHANNELS */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              
              {/* Canais Conectados */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-rosegold-500" />
                  <span>Canais de Integração Disponíveis</span>
                </h3>

                <div className="space-y-3.5">
                  {[
                    { channel: "shopee" as const, name: "Shopee Marketplace", desc: "Sincronização de catálogo e importação de pedidos de vendas.", icon: ShopeeIcon },
                    { channel: "mercado_libre" as const, name: "Mercado Livre", desc: "Integração automática para estoque em anúncios e faturamento.", icon: MeliIcon },
                    { channel: "whatsapp" as const, name: "WhatsApp Cloud API", desc: "Envio de templates oficiais de confirmação e alertas pós-venda.", icon: WhatsAppIcon }
                  ].map((chan) => {
                    const config = configs.find(c => c.channel === chan.channel);
                    const isConnected = config?.status === "connected";
                    const Icon = chan.icon;

                    return (
                      <div key={chan.channel} className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 text-xs">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isConnected ? "bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-950/30 dark:text-rosegold-300" : "bg-muted text-muted-foreground"
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{chan.name}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{chan.desc}</p>
                            {isConnected && config.lastSyncAt && (
                              <p className="text-[8px] font-bold text-green-500 uppercase tracking-wider mt-1.5 flex items-center gap-1 font-mono">
                                <Check className="h-3 w-3" />
                                <span>Sincronizado: {new Date(config.lastSyncAt).toLocaleDateString()}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <>
                              <button
                                onClick={() => handleOpenCredentials(chan.channel)}
                                className="px-2.5 py-1.5 border border-border hover:bg-muted rounded text-[10px] font-semibold transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDisconnect(config.id, chan.channel)}
                                className="px-2.5 py-1.5 bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 hover:bg-red-200 rounded text-[10px] font-semibold transition-colors"
                              >
                                Desconectar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenCredentials(chan.channel)}
                              className="px-2.5 py-1.5 bg-primary text-primary-foreground font-semibold rounded text-[10px] shadow hover:bg-primary/95 transition-all"
                            >
                              Conectar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulador de Webhook de Entrada */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Code className="h-4.5 w-4.5 text-rosegold-500" />
                  <span>Simulador de Webhook de Marketplace (Entrada)</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Utilize este painel para simular o recebimento de webhooks e testar a automatização integrada de estoque, contabilidade (caixa) e mensagens instantâneas pós-venda.
                </p>

                <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Canal de Origem</label>
                      <select
                        value={simChannel}
                        onChange={(e) => setSimChannel(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                      >
                        <option value="shopee">Shopee Webhook</option>
                        <option value="mercado_libre">Mercado Livre Webhook</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome do Comprador</label>
                      <input
                        type="text"
                        value={simCustomerName}
                        onChange={(e) => setSimCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3.5">
                    <div className="col-span-2 space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Produto Vendido</label>
                      <select
                        value={simProductId}
                        onChange={(e) => setSimProductId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground truncate"
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {p.sellPrice.toFixed(2)})</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        value={simQuantity}
                        onChange={(e) => setSimQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-center"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateWebhook}
                    disabled={products.length === 0}
                    className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Disparar Webhook Simulado</span>
                  </button>

                  {simSuccessMsg && (
                    <div className="p-3.5 rounded-xl border border-green-200 bg-green-50 text-green-800 dark:border-green-950/20 dark:bg-green-950/20 dark:text-green-400 font-mono text-[10px] leading-relaxed">
                      {simSuccessMsg}
                    </div>
                  )}
                </div>
              </div>

              {/* Automations Rules (Automations collection CRUD) */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4.5 w-4.5 text-rosegold-500" />
                    <span>Regras de Automação (WhatsApp Bot)</span>
                  </h3>
                  
                  <button
                    onClick={() => handleOpenAuto()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-[10px] font-bold uppercase tracking-wider text-rosegold-700 dark:text-rosegold-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar Regra</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {automations.map((auto) => {
                    const isActive = auto.status === "active";
                    return (
                      <div key={auto.id} className="p-4 rounded-xl border border-border bg-card text-xs space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground text-xs">{auto.name}</span>
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                              <span>Disparador:</span>
                              <span className="text-rosegold-600 dark:text-rosegold-400">{auto.trigger}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleAutoStatus(auto)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isActive ? (
                                <ToggleRight className="h-6 w-6 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenAuto(auto.id)}
                              className="p-1.5 rounded bg-muted hover:bg-border text-muted-foreground hover:text-foreground"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAuto(auto.id, auto.name)}
                              className="p-1.5 rounded bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 font-mono text-[10px] leading-relaxed text-muted-foreground">
                          {auto.template}
                        </div>
                      </div>
                    );
                  })}
                  {automations.length === 0 && (
                    <p className="text-center py-6 text-muted-foreground italic text-xs">Nenhuma regra de automação cadastrada.</p>
                  )}
                </div>
              </div>

              {/* Logs de Integração */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-rosegold-500" />
                  <span>Histórico de Logs de Integrações</span>
                </h3>

                <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                  {logs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg border border-border bg-card/40 flex items-start justify-between gap-3 text-[10px]">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground leading-normal">{log.message}</p>
                        <span className="text-[8px] text-muted-foreground font-mono mt-0.5 block">
                          Canal: {log.channel.toUpperCase()} | {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[8px] font-bold uppercase shrink-0 border",
                        log.status === "success" 
                          ? "bg-green-50 text-green-700 border-green-200/50 dark:bg-green-950/20 dark:text-green-400" 
                          : "bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/20 dark:text-red-400"
                      )}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-center py-6 text-muted-foreground italic text-[10px]">Nenhum log gravado.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: RBAC (PLACEHOLDER) */}
          {activeTab === "rbac" && (
            <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-rosegold-500" />
                <span>Controle de Acesso RBAC</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure as permissões de acesso por cargo (Owner, Admin, Operator, Viewer). Funcionalidades avançadas de Multi-Tenant do ERP SaaS.
              </p>
              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-3 p-3 bg-muted/40 font-bold text-muted-foreground border-b border-border">
                  <span>Usuário</span>
                  <span>Função</span>
                  <span>Permissão</span>
                </div>
                <div className="grid grid-cols-3 p-3 border-b border-border/50 items-center">
                  <span className="font-semibold">admin@carolramos.com.br</span>
                  <span className="font-mono bg-rosegold-100 text-rosegold-800 dark:bg-rosegold-950/40 dark:text-rosegold-300 w-fit px-1.5 py-0.5 rounded text-[10px] font-bold">owner</span>
                  <span className="text-muted-foreground">Acesso Total</span>
                </div>
                <div className="grid grid-cols-3 p-3 items-center">
                  <span className="font-semibold">operator@carolramos.com.br</span>
                  <span className="font-mono bg-muted text-muted-foreground w-fit px-1.5 py-0.5 rounded text-[10px] font-bold">operator</span>
                  <span className="text-muted-foreground">Venda/PDV e Agenda</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PARAMETRIZAÇÃO */}
          {activeTab === "params" && (
            <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-primary" />
                <span>Parametrização Geral</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Opções gerais de faturamento, alertas e operações do sistema.
              </p>
              <div className="space-y-3 text-xs">
                {/* Toggle: Stock Alert */}
                <div className="flex justify-between items-center p-3 rounded-xl border border-border bg-card/30">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">Alertar estoque crítico</span>
                    <p className="text-[10px] text-muted-foreground">Exibe notificações de estoque baixo na header.</p>
                  </div>
                  <button
                    onClick={() => handleToggleParam('requireStockAlert', !requireStockAlert)}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 ${requireStockAlert ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    role="switch"
                    aria-checked={requireStockAlert}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${requireStockAlert ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {/* Toggle: Require CPF/CNPJ */}
                <div className="flex justify-between items-center p-3 rounded-xl border border-border bg-card/30">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">Exigir CPF/CNPJ de Cliente</span>
                    <p className="text-[10px] text-muted-foreground">Torna obrigatório o documento para emissão de NFC-e.</p>
                    {requireCpf && (
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        ⚠ Ativo: CPF/CNPJ obrigatório
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleParam('requireCpf', !requireCpf)}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 ${requireCpf ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    role="switch"
                    aria-checked={requireCpf}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${requireCpf ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM LOGS (AUDIT & AI) */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              
              {/* Header de Logs */}
              <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-rosegold-500" />
                    <span>Logs do Sistema e Rastreabilidade</span>
                  </h3>
                  
                  {/* SubTabs */}
                  <div className="flex border border-border bg-card rounded-lg p-0.5 text-[10px] font-semibold">
                    <button
                      onClick={() => setSubTab("audit")}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors",
                        subTab === "audit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      Auditoria CRUD
                    </button>
                    <button
                      onClick={() => setSubTab("ai")}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors",
                        subTab === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      Consultas IA
                    </button>
                  </div>
                </div>

                {/* SubTab 1: Auditoria CRUD */}
                {subTab === "audit" && (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                    {auditLogs.length === 0 ? (
                      <p className="text-center py-10 text-muted-foreground italic text-xs">Nenhum log de alteração de banco de dados registrado.</p>
                    ) : (
                      [...auditLogs]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((log: any) => {
                          const isUpdate = log.action === "update";
                          const isDelete = log.action === "delete";
                          
                          // Format changes visual representation
                          let changesList: string[] = [];
                          if (isUpdate && log.previousValues && log.newValues) {
                            Object.keys(log.newValues).forEach(k => {
                              if (k !== "updatedAt" && k !== "updatedBy") {
                                const oldVal = typeof log.previousValues[k] === "object" ? JSON.stringify(log.previousValues[k]) : log.previousValues[k];
                                const newVal = typeof log.newValues[k] === "object" ? JSON.stringify(log.newValues[k]) : log.newValues[k];
                                if (oldVal !== newVal) {
                                  changesList.push(`${k}: "${oldVal ?? ''}" → "${newVal ?? ''}"`);
                                }
                              }
                            });
                          }

                          return (
                            <div key={log.id} className="p-3.5 rounded-xl border border-border bg-card text-[11px] space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <span className={cn(
                                      "px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border",
                                      isUpdate ? "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400" : 
                                      isDelete ? "bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/20 dark:text-red-400" :
                                      "bg-green-50 text-green-700 border-green-200/50 dark:bg-green-950/20 dark:text-green-400"
                                    )}>
                                      {log.action}
                                    </span>
                                    <span>Tabela: <code className="text-rosegold-600 dark:text-rosegold-400 font-mono font-bold">{log.collection}</code></span>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground font-mono">ID Documento: {log.documentId}</p>
                                </div>
                                <span className="text-[9px] text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                              </div>

                              <div className="border-t border-border/40 pt-2 text-muted-foreground leading-relaxed">
                                <span className="font-semibold block text-[10px] text-foreground">Operador: <code className="font-mono text-rosegold-500">{log.userEmail}</code></span>
                                
                                {changesList.length > 0 ? (
                                  <div className="mt-1 space-y-0.5 pl-3 border-l-2 border-primary/20">
                                    {changesList.map((ch, cidx) => <p key={cidx} className="font-mono text-[9px]">{ch}</p>)}
                                  </div>
                                ) : isUpdate ? (
                                  <p className="italic text-[9px] mt-1">Metadados de auditoria modificados.</p>
                                ) : (
                                  <div className="mt-1 font-mono text-[9px] truncate bg-muted/40 p-1.5 rounded border border-border/50 max-w-full">
                                    {JSON.stringify(log.newValues || log.previousValues)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}

                {/* SubTab 2: Consultas IA */}
                {subTab === "ai" && (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                    {aiLogs.map((log: any) => (
                      <div key={log.id} className="p-3.5 rounded-xl border border-border bg-card text-[11px] space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-rosegold-500 animate-pulse" />
                            <span>Consulta Assistente IA</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>

                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-foreground font-medium italic leading-normal">
                          "{log.prompt}"
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono pt-1">
                          <span>Modelo: {log.model || "gemini-2.5-flash"}</span>
                          <span>Tokens: {log.tokensUsed || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 6: BACKUPS & SEGURANÇA */}
          {activeTab === "backup" && (
            <div className="p-6 rounded-2xl border border-border bg-card/40 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Save className="h-5 w-5 text-primary" />
                    <span>Gestão de Backups & Segurança</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Gere snapshots completos de dados e restaure backups de segurança com facilidade.</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer transition-all">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span>Restaurar Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => handleCreateBackupNow(false)}
                    disabled={isBackingUp}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 shadow transition-all disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isBackingUp ? "Gerando Backup..." : "Criar Backup Agora"}</span>
                  </button>
                </div>
              </div>

              {/* Status do Backup Automático Diário */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Backup Automático Diário: Ativo</div>
                    <div className="text-[11px] text-muted-foreground">
                      Última execução automática: {lastAutoBackupDate ? new Date(lastAutoBackupDate).toLocaleString() : "Realizado ao iniciar a sessão"}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30 self-start sm:self-auto">
                  Sincronizado Diariamente
                </span>
              </div>

              {/* Histórico de Backups Realizados */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground">Histórico de Backups Gerados</h4>

                {backupsList.length === 0 ? (
                  <div className="p-8 text-center border border-border/40 rounded-xl text-xs text-muted-foreground">
                    Nenhum registro no histórico. Clique em "Criar Backup Agora" para gerar a primeira cópia.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {backupsList.map((bk: any) => (
                      <div key={bk.id} className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between text-xs hover:bg-muted/20 transition-all">
                        <div className="flex items-center gap-3">
                          <Save className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-semibold text-foreground">Backup {bk.type || "Manual"}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {new Date(bk.createdAt).toLocaleString()} • {bk.recordsCount || 0} registros
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {bk.sizeBytes ? `${(bk.sizeBytes / 1024).toFixed(1)} KB` : "Varia"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            Concluído
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 4. MODAL: CONFIGURAÇÃO DE INTEGRAÇÃO (CREDENTIALS) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 capitalize">
                <Globe className="h-4.5 w-4.5 text-rosegold-500" />
                <span>Credenciais {selectedChannel.replace("_", " ")}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConnectChannel} className="space-y-4 text-xs">
              
              {selectedChannel === "shopee" && (
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">ID do Inquilino/Loja (Shop ID)</label>
                    <input
                      type="text"
                      required
                      value={shopId}
                      onChange={(e) => setShopId(e.target.value)}
                      placeholder="Ex: 9912034"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Chave de Produção API Key</label>
                    <input
                      type="password"
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                </>
              )}

              {selectedChannel === "mercado_libre" && (
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Chave de Acesso OAuth Access Token</label>
                    <input
                      type="password"
                      required
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Ex: APP_USR-823901-..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                </>
              )}

              {selectedChannel === "whatsapp" && (
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Phone Number ID (Meta Cloud)</label>
                    <input
                      type="text"
                      required
                      value={phoneId}
                      onChange={(e) => setPhoneId(e.target.value)}
                      placeholder="Ex: 10920491823901"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">WhatsApp Business Account ID (WABA ID)</label>
                    <input
                      type="text"
                      required
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      placeholder="Ex: 2094812049"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3.5 pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                >
                  Salvar e Conectar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. MODAL: AUTOMATION FORM (ADD / EDIT) */}
      {autoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Zap className="h-4.5 w-4.5 text-rosegold-500" />
                <span>{autoEditingId ? "Editar Regra" : "Nova Regra de Disparo"}</span>
              </h3>
              <button
                onClick={() => setAutoModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAutomation} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Amigável da Regra</label>
                <input
                  type="text"
                  required
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  placeholder="Ex: Mensagem Obrigado Venda Shopee"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                />
                {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Gatilho (Trigger)</label>
                  <select
                    value={autoTrigger}
                    onChange={(e) => setAutoTrigger(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="sale_completed">Venda Concluída</option>
                    <option value="customer_created">Cliente Cadastrado</option>
                    <option value="appointment_confirmed">Atendimento Confirmado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Ação Executada</label>
                  <select
                    value={autoAction}
                    onChange={(e) => setAutoAction(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="whatsapp_message">WhatsApp Simulado</option>
                    <option value="email_message">E-mail (SMTP)</option>
                    <option value="discount_coupon">Cupom de Desconto</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Mensagem de Disparo (Template)</label>
                <textarea
                  required
                  value={autoTemplate}
                  onChange={(e) => setAutoTemplate(e.target.value)}
                  placeholder="Ex: Olá {name}! Obrigado pela compra de R$ {total}..."
                  rows={4}
                  className="w-full p-3 rounded-lg border border-border bg-card resize-none"
                />
                {errors.template && <p className="text-[10px] text-destructive mt-0.5">{errors.template}</p>}
                <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                  Variáveis suportadas: <code className="font-bold text-rosegold-500 font-mono">{`{name}`}</code>, <code className="font-bold text-rosegold-500 font-mono">{`{total}`}</code>, <code className="font-bold text-rosegold-500 font-mono">{`{id}`}</code>.
                </p>
              </div>

              <div className="flex gap-3.5 pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setAutoModalOpen(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                >
                  Salvar Automação
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
      {/* 5. MODAL: NOVA EMPRESA (Req 2) */}
      {newCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <span>Cadastrar Nova Empresa</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewCompanyModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Razão Social / Nome da Empresa *</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Ex: Beleza SaaS Cosméticos"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CNPJ da Empresa</label>
                <input
                  type="text"
                  value={newCompanyCnpj}
                  onChange={(e) => setNewCompanyCnpj(maskCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  maxLength={18}
                />
              </div>

              <div className="flex gap-3.5 pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setNewCompanyModalOpen(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                >
                  {loading ? "Criando..." : "Criar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EDITAR EMPRESA */}
      {editCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <span>Editar Dados da Empresa</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditCompanyModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCompany} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Razão Social *</label>
                <input
                  type="text"
                  required
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Fantasia</label>
                <input
                  type="text"
                  value={editCompanyTradeName}
                  onChange={(e) => setEditCompanyTradeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CNPJ</label>
                <input
                  type="text"
                  value={editCompanyCnpj}
                  onChange={(e) => setEditCompanyCnpj(maskCnpj(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  maxLength={18}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Situação Operacional</label>
                <select
                  value={editCompanyStatus}
                  onChange={(e) => setEditCompanyStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                >
                  <option value="active">Ativa (Habilitada)</option>
                  <option value="inactive">Inativa (Desabilitada)</option>
                </select>
              </div>

              <div className="flex gap-3.5 pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setEditCompanyModalOpen(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
