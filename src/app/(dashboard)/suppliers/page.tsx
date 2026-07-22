"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { Supplier } from "@/features/suppliers/types";
import { SupplierSchema } from "@/features/suppliers/schemas";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { processImageUpload, MAX_IMAGE_SIZE_MB } from "@/lib/imageUpload";
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Upload,
  X,
  Check,
  CreditCard,
  Paperclip,
  Calendar,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { cn, maskPhone, maskCep, maskCnpj } from "@/lib/utils";

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const CATEGORIES = [
  "Cosméticos",
  "Embalagens",
  "Matéria-prima",
  "Perfumaria",
  "Skincare",
  "Maquiagem",
  "Acessórios",
  "Serviços",
  "Outros",
];

const TABS = [
  "Dados da Empresa",
  "Contatos & Redes",
  "Endereço",
  "Comercial & Financeiro",
  "Notas & Anexos"
] as const;

type TabLabel = (typeof TABS)[number];

function emptyForm() {
  return {
    name: "",
    tradeName: "",
    cnpj: "",
    ie: "",
    im: "",
    status: "active" as "active" | "inactive",
    logo: "",
    email: "",
    phone: "",
    isWhatsapp: false,
    whatsapp: "",
    website: "",
    instagram: "",
    facebook: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
    contactPerson: "",
    contactRole: "",
    contactDepartment: "",
    contactPhone: "",
    contactEmail: "",
    contactIsWhatsapp: false,
    category: "",
    specialty: "",
    paymentTerms: "",
    leadTimeDays: 0,
    bankName: "",
    bankAgency: "",
    bankAccount: "",
    pixKey: "",
    creditLimit: 0,
    attachments: [] as Array<{ name: string; url: string; size?: number; type?: string }>,
  };
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
      {children}
    </label>
  );
}

function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/85",
        "placeholder:text-muted-foreground/60 text-xs focus:outline-none",
        "focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
        className
      )}
      {...props}
    />
  );
}

function FormTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/85",
        "placeholder:text-muted-foreground/60 text-xs focus:outline-none",
        "focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none",
        className
      )}
      {...props}
    />
  );
}

function FormSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/85",
        "text-xs text-foreground focus:outline-none",
        "focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
        className
      )}
      {...props}
    />
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
      status === "active"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
        : "bg-muted text-muted-foreground border-border"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60")} />
      {status === "active" ? "Ativo" : "Inativo"}
    </span>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      {category}
    </span>
  );
}

function SpecialtyBadge({ specialty }: { specialty?: string }) {
  if (!specialty) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold" title="Carro-chefe / Especialidade">
      <span>★ {specialty}</span>
    </span>
  );
}

interface SupplierCardProps {
  supplier: Supplier;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
  isSelected?: boolean;
  onSelectToggle?: () => void;
}

function SupplierCard({ supplier, onEdit, onDelete, isSelected, onSelectToggle }: SupplierCardProps) {
  const initials = getInitials(supplier.name);
  return (
    <div className={cn("group relative flex flex-col justify-between gap-4 p-5 rounded-2xl border transition-all duration-255 hover:shadow-lg hover:shadow-primary/5 select-none", isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80")}>
      <div>
        <div className="flex items-start gap-3.5">
          {onSelectToggle && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelectToggle}
              className="mt-1 rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer shrink-0"
            />
          )}
          <div className="shrink-0 h-12 w-12 rounded-xl overflow-hidden border border-border bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {supplier.logo ? (
              <img src={supplier.logo} alt={supplier.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">{supplier.name}</h3>
            {supplier.tradeName && <p className="text-xs text-muted-foreground truncate mt-0.5">{supplier.tradeName}</p>}
            {supplier.cnpj && <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{supplier.cnpj}</p>}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onEdit(supplier)} className="p-1.5 rounded-lg border border-border bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Editar">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(supplier)} className="p-1.5 rounded-lg border border-border bg-card/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <StatusBadge status={supplier.status} />
          <CategoryBadge category={supplier.category} />
          <SpecialtyBadge specialty={supplier.specialty} />
          {supplier.attachments && supplier.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono">
              <Paperclip className="h-2.5 w-2.5" /> {supplier.attachments.length}
            </span>
          )}
        </div>

        {/* Representative/Contact Box */}
        {(supplier.contactPerson || supplier.phone || supplier.email) && (
          <div className="space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-3 mt-3.5">
            {supplier.contactPerson && (
              <div className="bg-muted/30 p-2 rounded-xl border border-border/40 space-y-0.5">
                <div className="text-[9px] font-bold text-primary uppercase tracking-wider leading-none mb-1">Contato Atendimento</div>
                <div className="font-semibold text-foreground truncate">{supplier.contactPerson}</div>
                {supplier.contactRole && <div className="text-[10px] text-muted-foreground">{supplier.contactRole} {supplier.contactDepartment ? `• ${supplier.contactDepartment}` : ""}</div>}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              {(supplier.phone || supplier.whatsapp) && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 text-primary/60" />
                  <span className="font-mono">{supplier.phone || supplier.whatsapp}</span>
                  {supplier.isWhatsapp && (
                    <a 
                      href={`https://wa.me/55${(supplier.whatsapp || supplier.phone || "").replace(/\D/g, "")}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-emerald-500 hover:text-emerald-600 transition-colors ml-0.5"
                      title="Chamar no WhatsApp"
                    >
                      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm5.835-3.279c1.652.981 3.256 1.488 4.962 1.489 5.372 0 9.743-4.368 9.746-9.743.001-2.605-1.013-5.053-2.86-6.902C15.895 3.717 13.456 2.7 10.997 2.7 5.626 2.7 1.256 7.07 1.253 12.446c-.001 1.774.478 3.493 1.393 5.044L1.706 22l4.186-1.279zm12.381-5.111c-.302-.151-1.785-.882-2.057-.981-.273-.099-.471-.148-.669.151-.197.297-.767.981-.941 1.18-.173.197-.347.222-.648.072-1.08-.541-1.928-.971-2.695-1.688-.636-.596-1.127-1.326-1.253-1.523-.125-.197-.013-.304.112-.429.112-.113.25-.297.375-.446.125-.148.165-.25.25-.421.082-.172.04-.322-.02-.471-.06-.151-.471-1.14-.648-1.564-.173-.421-.347-.363-.471-.369h-.402c-.136 0-.36.051-.548.257-.188.206-.718.702-.718 1.71 0 1.008.734 1.984.836 2.12.102.136 1.442 2.202 3.493 3.086.488.21 1.002.348 1.411.479.553.176 1.056.151 1.455.091.445-.067 1.365-.558 1.558-1.097.193-.538.193-1.002.136-1.097-.058-.096-.215-.148-.517-.297z"/>
                      </svg>
                    </a>
                  )}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 shrink-0 text-primary/60" />
                  <span className="truncate">{supplier.email}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {supplier.paymentTerms && (
        <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground flex justify-between items-center">
          <span>Pgto: <strong className="text-foreground">{supplier.paymentTerms}</strong></span>
          {supplier.leadTimeDays ? <span>Prazo: <strong className="text-foreground">{supplier.leadTimeDays}d</strong></span> : null}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-xl shadow-primary/10">
        <Truck className="h-9 w-9 text-primary/60" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">Nenhum fornecedor cadastrado</h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Adicione seus fornecedores para gerenciar contatos, endereços, prazos e compras.
        </p>
      </div>
      <button onClick={onNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
        <Plus className="h-4 w-4" />
        Novo Fornecedor
      </button>
    </div>
  );
}

function LogoUploader({ value, onChange, name }: { value: string; onChange: (b64: string) => void; name: string; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProgress(0);

    const res = await processImageUpload(file, {
      maxWidth: 800,
      maxHeight: 800,
      onProgress: (pct) => setProgress(pct)
    });

    if (res.success && res.dataUrl) {
      onChange(res.dataUrl);
      setTimeout(() => setProgress(null), 1000);
    } else {
      setError(res.errorMessage || "Erro ao carregar imagem.");
      setProgress(null);
    }
  };

  const initials = getInitials(name);
  return (
    <div className="flex items-center gap-4 border border-border/80 bg-muted/10 p-3 rounded-xl">
      <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-border bg-card overflow-hidden flex items-center justify-center shrink-0">
        {value ? <img src={value} alt="logo" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-muted-foreground">{initials || <Building2 className="h-6 w-6" />}</span>}
      </div>
      <div className="flex-1 space-y-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
          <Upload className="h-3.5 w-3.5" /> Selecionar Logo
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="flex items-center gap-1.5 text-[11px] text-destructive hover:underline">
            <X className="h-3 w-3" /> Remover
          </button>
        )}
        {progress !== null && (
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between text-[10px] text-primary font-bold">
              <span>Enviando...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {error && (
          <p className="text-[10px] text-destructive font-semibold">{error}</p>
        )}
        <p className="text-[10px] text-muted-foreground">PNG, JPG ou WebP. Máx. {MAX_IMAGE_SIZE_MB}MB.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function SuppliersPage() {
  const { tenantId } = useAuth();
  const { getDocs, createDoc, updateDoc, deleteDoc, softDeleteDoc, invalidateCache } = useDb();
  const { success, error: toastError } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, statusFilter, categoryFilter]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabLabel>("Dados da Empresa");
  const [form, setForm] = useState(emptyForm());
  const [cepLoading, setCepLoading] = useState(false);

  // Silent Migration for Legacy Suppliers
  const runMigration = useCallback(async (loaded: Supplier[]) => {
    const toMigrate = loaded.filter(s => {
      return !s.status || s.isWhatsapp === undefined || s.paymentTerms === undefined;
    });

    if (toMigrate.length === 0) return;

    try {
      await Promise.all(toMigrate.map(s => {
        const migrated: Partial<Supplier> = {
          status: s.status || "active",
          isWhatsapp: s.isWhatsapp ?? false,
          contactIsWhatsapp: s.contactIsWhatsapp ?? false,
          paymentTerms: s.paymentTerms ?? "",
          leadTimeDays: s.leadTimeDays ?? 0,
          bankName: s.bankName ?? "",
          bankAgency: s.bankAgency ?? "",
          bankAccount: s.bankAccount ?? "",
          pixKey: s.pixKey ?? "",
          creditLimit: s.creditLimit ?? 0,
          attachments: s.attachments ?? [],
          updatedAt: new Date().toISOString()
        };
        return updateDoc("suppliers", s.id, migrated);
      }));
      
      const refreshed = await getDocs("suppliers");
      setSuppliers(refreshed as Supplier[]);
    } catch (e) {
      console.error("Erro na migração de fornecedores legados:", e);
    }
  }, [getDocs, updateDoc]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocs("suppliers");
      const loaded = (data as Supplier[]) || [];
      setSuppliers(loaded);
      if (loaded.length > 0) {
        runMigration(loaded);
      }
    } catch (e: any) {
      console.error("Erro ao carregar fornecedores:", e);
      setSuppliers([]);
      toastError("Erro ao carregar", e.message || "Não foi possível carregar os fornecedores.");
    } finally {
      setLoading(false);
    }
  }, [getDocs, toastError, runMigration]);

  useEffect(() => {
    if (tenantId) {
      loadSuppliers();
    }
  }, [tenantId, loadSuppliers]);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      s.name.toLowerCase().includes(q) || 
      s.tradeName?.toLowerCase().includes(q) || 
      s.cnpj?.includes(q) || 
      s.email?.toLowerCase().includes(q) || 
      s.category?.toLowerCase().includes(q) ||
      s.specialty?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedSuppliers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setActiveTab("Dados da Empresa");
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      tradeName: s.tradeName || "",
      cnpj: s.cnpj || "",
      ie: s.ie || "",
      im: s.im || "",
      status: s.status || "active",
      logo: s.logo || "",
      email: s.email || "",
      phone: s.phone || "",
      isWhatsapp: !!s.isWhatsapp,
      whatsapp: s.whatsapp || "",
      website: s.website || "",
      instagram: s.instagram || "",
      facebook: s.facebook || "",
      cep: s.address?.cep || "",
      street: s.address?.street || "",
      number: s.address?.number || "",
      complement: s.address?.complement || "",
      neighborhood: s.address?.neighborhood || "",
      city: s.address?.city || "",
      state: s.address?.state || "",
      notes: s.notes || "",
      contactPerson: s.contactPerson || "",
      contactRole: s.contactRole || "",
      contactDepartment: s.contactDepartment || "",
      contactPhone: s.contactPhone || "",
      contactEmail: s.contactEmail || "",
      contactIsWhatsapp: !!s.contactIsWhatsapp,
      category: s.category || "",
      specialty: s.specialty || "",
      paymentTerms: s.paymentTerms || "",
      leadTimeDays: s.leadTimeDays || 0,
      bankName: s.bankName || "",
      bankAgency: s.bankAgency || "",
      bankAccount: s.bankAccount || "",
      pixKey: s.pixKey || "",
      creditLimit: s.creditLimit || 0,
      attachments: s.attachments || [],
    });
    setActiveTab("Dados da Empresa");
    setModalOpen(true);
  }

  function setField<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCepBlur() {
    const cepClean = form.cep.replace(/\D/g, "");
    if (cepClean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await res.json();
      if (data.erro) {
        toastError("CEP não encontrado", "Por favor, verifique o CEP informado.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch {
      toastError("Erro ao buscar CEP", "Não foi possível consultar o CEP automaticamente.");
    } finally { setCepLoading(false); }
  }

  async function handleSave() {
    // Validate schema
    const validationResult = SupplierSchema.safeParse({
      name: form.name.trim(),
      tradeName: form.tradeName.trim() || undefined,
      cnpj: form.cnpj.trim() || undefined,
      ie: form.ie.trim() || undefined,
      im: form.im.trim() || undefined,
      status: form.status,
      logo: form.logo || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      isWhatsapp: form.isWhatsapp,
      whatsapp: form.whatsapp.trim() || undefined,
      website: form.website.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      contactRole: form.contactRole.trim() || undefined,
      contactDepartment: form.contactDepartment.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactIsWhatsapp: form.contactIsWhatsapp,
      address: {
        cep: form.cep.trim() || undefined,
        street: form.street.trim() || undefined,
        number: form.number.trim() || undefined,
        complement: form.complement.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
      },
      category: form.category || undefined,
      specialty: form.specialty.trim() || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      leadTimeDays: form.leadTimeDays,
      bankName: form.bankName.trim() || undefined,
      bankAgency: form.bankAgency.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      pixKey: form.pixKey.trim() || undefined,
      creditLimit: form.creditLimit,
      notes: form.notes.trim() || undefined,
      attachments: form.attachments,
    });

    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues[0]?.message || "Valores inválidos.";
      toastError("Erro de validação", errorMsg);
      // Focus appropriate tab if possible
      const path = validationResult.error.issues[0]?.path[0];
      if (path === "name" || path === "cnpj" || path === "ie" || path === "im") {
        setActiveTab("Dados da Empresa");
      } else if (path === "email" || path === "phone" || path === "whatsapp" || path === "instagram" || path === "facebook") {
        setActiveTab("Contatos & Redes");
      }
      return;
    }

    setSaving(true);
    try {
      const hasAddress = form.cep || form.street || form.city;
      const payload = {
        name: form.name.trim(),
        tradeName: form.tradeName.trim() || null,
        cnpj: form.cnpj.trim() || null,
        ie: form.ie.trim() || null,
        im: form.im.trim() || null,
        status: form.status,
        logo: form.logo || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        isWhatsapp: form.isWhatsapp,
        whatsapp: form.whatsapp.trim() || null,
        website: form.website.trim() || null,
        instagram: form.instagram.trim() || null,
        facebook: form.facebook.trim() || null,
        contactPerson: form.contactPerson.trim() || null,
        contactRole: form.contactRole.trim() || null,
        contactDepartment: form.contactDepartment.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactIsWhatsapp: form.contactIsWhatsapp,
        address: hasAddress ? {
          cep: form.cep,
          street: form.street,
          number: form.number,
          complement: form.complement || null,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        } : null,
        category: form.category || null,
        paymentTerms: form.paymentTerms.trim() || null,
        leadTimeDays: Number(form.leadTimeDays) || 0,
        bankName: form.bankName.trim() || null,
        bankAgency: form.bankAgency.trim() || null,
        bankAccount: form.bankAccount.trim() || null,
        pixKey: form.pixKey.trim() || null,
        creditLimit: Number(form.creditLimit) || 0,
        notes: form.notes.trim() || null,
        attachments: form.attachments,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc("suppliers", editingId, payload);
        success("Fornecedor atualizado!", `${form.name} foi atualizado com sucesso.`);
      } else {
        await createDoc("suppliers", {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        success("Fornecedor criado!", `${form.name} foi cadastrado com sucesso.`);
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (e: any) {
      toastError("Erro ao salvar", e.message || "Ocorreu um erro ao salvar o fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Deseja mover o fornecedor "${s.name}" para a Lixeira Inteligente?`)) return;
    try {
      await softDeleteDoc("suppliers", s.id, "Fornecedores", s.name);
      invalidateCache("suppliers");
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== s.id));
      success("Fornecedor movido para a Lixeira", `${s.name} foi enviado para a Lixeira Inteligente.`);
      loadSuppliers();
    } catch (e: any) {
      toastError("Erro ao excluir", e.message || "Não foi possível excluir o fornecedor.");
    }
  }

  // Batch Handlers (Fornecedores)
  const toggleSelectAllSuppliers = (paginatedList: Supplier[]) => {
    if (selectedIds.length === paginatedList.length && paginatedList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedList.map(s => s.id));
    }
  };

  const toggleSelectDocSupplier = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBatchDeleteSuppliers = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja mover os ${selectedIds.length} fornecedores selecionados para a Lixeira Inteligente?`)) {
      try {
        for (const id of selectedIds) {
          const supp = suppliers.find(s => s.id === id);
          await softDeleteDoc("suppliers", id, "Fornecedores", supp?.name || "Fornecedor");
        }
        invalidateCache("suppliers");
        setSuppliers(prev => prev.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        await loadSuppliers();
        success("Operação concluída", `${selectedIds.length} fornecedores foram movidos para a Lixeira.`);
      } catch (err: any) {
        toastError("Erro na exclusão em lote", err.message || "Erro ao excluir fornecedores.");
      }
    }
  };

  const handleBatchStatusChangeSuppliers = async (newStatus: "active" | "inactive") => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => updateDoc("suppliers", id, { status: newStatus })));
      invalidateCache("suppliers");
      setSuppliers(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, status: newStatus } : s));
      setSelectedIds([]);
      success("Status Atualizado", `Status de ${selectedIds.length} fornecedores alterado para ${newStatus === "active" ? "Ativo" : "Inativo"}.`);
    } catch (err: any) {
      toastError("Erro na alteração de status", err.message || "Erro ao atualizar status.");
    }
  };

  const handleBatchExportSuppliers = () => {
    const selectedSuppliers = suppliers.filter(s => selectedIds.includes(s.id));
    if (selectedSuppliers.length === 0) return;
    let csvContent = `data:text/csv;charset=utf-8,RazaoSocial;NomeFantasia;CNPJ;Email;Telefone;Categoria;Status\n`;
    selectedSuppliers.forEach(s => {
      csvContent += `"${s.name}";"${s.tradeName || ""}";"${s.cnpj || ""}";"${s.email || ""}";"${s.phone || ""}";"${s.category || ""}";"${s.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fornecedores_Selecionados_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newFile = {
            name: file.name,
            url: ev.target.result as string,
            size: file.size,
            type: file.type
          };
          setForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, newFile]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (idx: number) => {
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Fornecedores</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {filtered.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Módulo único para gestão e cadastro completo de fornecedores, dados bancários e anotações.
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/15 hover:scale-[1.01] active:scale-[0.99] shrink-0">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/25 p-4 rounded-xl border border-border/80">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, categoria..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-border bg-card/50 text-xs text-muted-foreground focus:outline-none w-1/2 sm:w-32"
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card/50 text-xs text-muted-foreground focus:outline-none w-1/2 sm:w-36"
          >
            <option value="all">Todas Categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState onNew={openNew} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum resultado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente ajustar seus termos de busca ou filtros.</p>
          </div>
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }} className="text-xs text-primary hover:underline font-semibold">Limpar Filtros</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === paginatedSuppliers.length && paginatedSuppliers.length > 0}
                onChange={() => toggleSelectAllSuppliers(paginatedSuppliers)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <span>Selecionar Todos da Página</span>
            </label>
            {selectedIds.length > 0 && (
              <span className="text-xs text-primary font-bold">{selectedIds.length} selecionado(s)</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSuppliers.map((s) => (
              <SupplierCard
                key={s.id}
                supplier={s}
                onEdit={openEdit}
                onDelete={handleDelete}
                isSelected={selectedIds.includes(s.id)}
                onSelectToggle={() => toggleSelectDocSupplier(s.id)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border border-border bg-card/40 rounded-xl select-none">
              <span className="text-xs text-muted-foreground">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length} itens)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Batch Action Bar (Fornecedores) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-2xl border border-primary/40 shadow-2xl rounded-2xl p-3 px-5 flex flex-wrap items-center gap-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-extrabold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-foreground">
              {selectedIds.length === 1 ? "1 fornecedor selecionado" : `${selectedIds.length} fornecedores selecionados`}
            </span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchStatusChangeSuppliers("active")}
              className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all"
            >
              Marcar como Ativos
            </button>

            <button
              onClick={() => handleBatchStatusChangeSuppliers("inactive")}
              className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all"
            >
              Marcar como Inativos
            </button>

            <button
              onClick={handleBatchExportSuppliers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all"
            >
              Exportar CSV
            </button>

            <button
              onClick={handleBatchDeleteSuppliers}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold transition-all shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir Selecionados</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-all"
              title="Cancelar Seleção"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingId ? "Editar Fornecedor" : "Cadastrar Fornecedor"}
        description={editingId ? "Atualize os dados e anexos do fornecedor." : "Crie um novo cadastro completo de fornecedor no sistema."}
        size="xl"
      >
        {/* Tabs switcher */}
        <div className="flex gap-1 mb-5 border-b border-border -mx-5 px-5 overflow-x-auto scrollbar-none select-none">
          {TABS.map((tab) => {
            const icons: Record<TabLabel, React.ReactNode> = {
              "Dados da Empresa": <Building2 className="h-3.5 w-3.5" />,
              "Contatos & Redes": <Phone className="h-3.5 w-3.5" />,
              "Endereço": <MapPin className="h-3.5 w-3.5" />,
              "Comercial & Financeiro": <DollarSign className="h-3.5 w-3.5" />,
              "Notas & Anexos": <FileText className="h-3.5 w-3.5" />,
            };
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all",
                  activeTab === tab 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {icons[tab]} {tab}
              </button>
            );
          })}
        </div>

        {/* Form panels */}
        <div className="max-h-[55vh] overflow-y-auto pr-1 text-xs">
          
          {/* Tab 1: Dados da Empresa */}
          {activeTab === "Dados da Empresa" && (
            <div className="space-y-4">
              <div>
                <FormLabel>Logomarca</FormLabel>
                <LogoUploader value={form.logo} onChange={(v) => setField("logo", v)} name={form.name} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Razão Social *</FormLabel>
                  <FormInput type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Natura Cosméticos S/A" required />
                </div>
                <div>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormInput type="text" value={form.tradeName} onChange={(e) => setField("tradeName", e.target.value)} placeholder="Ex: Natura" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel>CNPJ</FormLabel>
                  <FormInput type="text" value={form.cnpj} onChange={(e) => setField("cnpj", maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} className="font-mono" />
                </div>
                <div>
                  <FormLabel>Inscrição Estadual</FormLabel>
                  <FormInput type="text" value={form.ie} onChange={(e) => setField("ie", e.target.value.replace(/\D/g, ""))} placeholder="Apenas números" className="font-mono" />
                </div>
                <div>
                  <FormLabel>Inscrição Municipal</FormLabel>
                  <FormInput type="text" value={form.im} onChange={(e) => setField("im", e.target.value.replace(/\D/g, ""))} placeholder="Apenas números" className="font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Categoria Principal</FormLabel>
                  <select value={form.category} onChange={(e) => setField("category", e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/85 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none">
                    <option value="">Selecione uma categoria...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <FormLabel>Carro-chefe / Especialidade</FormLabel>
                  <FormInput
                    type="text"
                    value={form.specialty}
                    onChange={(e) => setField("specialty", e.target.value)}
                    placeholder="Ex: Perfumes Importados, Body Splash, Skincare..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Contatos & Redes */}
          {activeTab === "Contatos & Redes" && (
            <div className="space-y-4">
              <div className="bg-muted/10 p-4 rounded-xl border border-border/80 space-y-4">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Contatos Corporativos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>E-mail Geral</FormLabel>
                    <FormInput type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="contato@fornecedor.com" />
                  </div>
                  <div>
                    <FormLabel>Telefone Comercial</FormLabel>
                    <FormInput type="text" value={form.phone} onChange={(e) => setField("phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>WhatsApp Comercial</FormLabel>
                    <div className="relative">
                      <FormInput type="text" value={form.whatsapp} onChange={(e) => setField("whatsapp", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="font-mono pr-10" />
                      <input 
                        type="checkbox" 
                        checked={form.isWhatsapp} 
                        onChange={(e) => setField("isWhatsapp", e.target.checked)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded border-border text-emerald-500 focus:ring-emerald-400 h-4 w-4" 
                        title="Marcar se este número possui WhatsApp"
                      />
                    </div>
                  </div>
                  <div>
                    <FormLabel>Website</FormLabel>
                    <FormInput type="text" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="www.fornecedor.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Instagram</FormLabel>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                      <FormInput type="text" value={form.instagram} onChange={(e) => setField("instagram", e.target.value)} placeholder="@usuario" className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <FormLabel>Facebook</FormLabel>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                      <FormInput type="text" value={form.facebook} onChange={(e) => setField("facebook", e.target.value)} placeholder="facebook.com/pagina" className="pl-9" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/10 p-4 rounded-xl border border-border/80 space-y-4">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Representante de Atendimento</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FormLabel>Nome do Contato</FormLabel>
                    <FormInput type="text" value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} placeholder="Nome do vendedor/suporte" />
                  </div>
                  <div>
                    <FormLabel>Cargo</FormLabel>
                    <FormInput type="text" value={form.contactRole} onChange={(e) => setField("contactRole", e.target.value)} placeholder="Ex: Vendedor Key Account" />
                  </div>
                  <div>
                    <FormLabel>Departamento</FormLabel>
                    <FormInput type="text" value={form.contactDepartment} onChange={(e) => setField("contactDepartment", e.target.value)} placeholder="Ex: Comercial/Vendas" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Telefone do Contato</FormLabel>
                    <div className="relative">
                      <FormInput type="text" value={form.contactPhone} onChange={(e) => setField("contactPhone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="font-mono pr-10" />
                      <input 
                        type="checkbox" 
                        checked={form.contactIsWhatsapp} 
                        onChange={(e) => setField("contactIsWhatsapp", e.target.checked)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded border-border text-emerald-500 focus:ring-emerald-400 h-4 w-4" 
                        title="Marcar se este número possui WhatsApp"
                      />
                    </div>
                  </div>
                  <div>
                    <FormLabel>E-mail do Contato</FormLabel>
                    <FormInput type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} placeholder="vendedor@fornecedor.com" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Endereço */}
          {activeTab === "Endereço" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel>CEP</FormLabel>
                  <div className="relative">
                    <FormInput type="text" value={form.cep} onChange={(e) => setField("cep", maskCep(e.target.value))} onBlur={handleCepBlur} placeholder="00000-000" maxLength={9} className="font-mono" />
                    {cepLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <FormLabel>Rua / Logradouro</FormLabel>
                  <FormInput type="text" value={form.street} onChange={(e) => setField("street", e.target.value)} placeholder="Ex: Avenida Paulista" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel>Número</FormLabel>
                  <FormInput type="text" value={form.number} onChange={(e) => setField("number", e.target.value)} placeholder="Ex: 1500" />
                </div>
                <div className="md:col-span-2">
                  <FormLabel>Complemento</FormLabel>
                  <FormInput type="text" value={form.complement} onChange={(e) => setField("complement", e.target.value)} placeholder="Ex: Sala 42" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel>Bairro</FormLabel>
                  <FormInput type="text" value={form.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} placeholder="Bairro" />
                </div>
                <div>
                  <FormLabel>Cidade</FormLabel>
                  <FormInput type="text" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Cidade" />
                </div>
                <div>
                  <FormLabel>Estado (UF)</FormLabel>
                  <FormInput type="text" value={form.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} maxLength={2} placeholder="UF" />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Comercial & Financeiro */}
          {activeTab === "Comercial & Financeiro" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Categoria de Produtos</FormLabel>
                  <FormSelect value={form.category} onChange={(e) => setField("category", e.target.value)}>
                    <option value="">Selecionar categoria...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </FormSelect>
                </div>
                <div>
                  <FormLabel>Condição de Pagamento Padrão</FormLabel>
                  <FormInput type="text" value={form.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)} placeholder="Ex: Boleto 30/60 dias, Pix à vista" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Prazo Médio de Entrega (dias)</FormLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <FormInput type="number" value={form.leadTimeDays} onChange={(e) => setField("leadTimeDays", Math.max(0, parseInt(e.target.value) || 0))} className="pl-9" />
                  </div>
                </div>
                <div>
                  <FormLabel>Limite de Crédito Disponível (R$)</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <FormInput type="number" value={form.creditLimit} onChange={(e) => setField("creditLimit", Math.max(0, parseFloat(e.target.value) || 0))} className="pl-9" />
                  </div>
                </div>
              </div>

              <div className="bg-muted/10 p-4 rounded-xl border border-border/80 space-y-4">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Dados Bancários para Pagamento</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FormLabel>Banco Principal</FormLabel>
                    <FormInput type="text" value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} placeholder="Ex: Itaú, Bradesco" />
                  </div>
                  <div>
                    <FormLabel>Agência</FormLabel>
                    <FormInput type="text" value={form.bankAgency} onChange={(e) => setField("bankAgency", e.target.value)} placeholder="Agência" />
                  </div>
                  <div>
                    <FormLabel>Conta Corrente</FormLabel>
                    <FormInput type="text" value={form.bankAccount} onChange={(e) => setField("bankAccount", e.target.value)} placeholder="Conta + Dígito" />
                  </div>
                </div>
                <div>
                  <FormLabel>Chave Pix Principal</FormLabel>
                  <FormInput type="text" value={form.pixKey} onChange={(e) => setField("pixKey", e.target.value)} placeholder="CNPJ, E-mail, Celular ou Chave Aleatória" />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Notas & Anexos */}
          {activeTab === "Notas & Anexos" && (
            <div className="space-y-4">
              <div>
                <FormLabel>Observações Internas</FormLabel>
                <FormTextarea rows={4} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Escreva observações adicionais sobre acordos comerciais, atendimento, reputação, etc." />
              </div>

              <div className="border border-border/80 bg-muted/10 p-4 rounded-xl space-y-3">
                <FormLabel>Anexos & Documentos (Contratos, Catálogos, etc.)</FormLabel>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-primary/40 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-all">
                    <Upload className="h-4 w-4 text-primary" />
                    <span>Upload Arquivos</span>
                    <input 
                      type="file" 
                      multiple 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" 
                      className="hidden" 
                      onChange={handleAttachmentUpload} 
                    />
                  </label>
                  <span className="text-[10px] text-muted-foreground">PDF, Word, Excel ou Imagens (Máx. 5MB cada)</span>
                </div>

                {form.attachments.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    {form.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card/60 text-xs font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                          <span className="truncate max-w-[250px]">{file.name}</span>
                          {file.size && <span className="text-[9px] text-muted-foreground font-mono">({(file.size / 1024).toFixed(0)} KB)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={file.url} 
                            download={file.name} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            Baixar
                          </a>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAttachment(idx)} 
                            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground/60 italic text-xs">
                    Nenhum documento anexado ainda.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-primary" />
              <span>Campos com * são obrigatórios</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold transition-all">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                {saving ? (
                  <>
                    <span className="h-3 w-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{editingId ? "Salvar Alterações" : "Cadastrar Fornecedor"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
}
