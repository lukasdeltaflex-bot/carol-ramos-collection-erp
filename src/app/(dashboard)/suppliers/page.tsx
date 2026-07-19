"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { Supplier } from "@/features/suppliers/types";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
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
} from "lucide-react";
import { cn, maskPhone, maskCep, maskCnpj } from "@/lib/utils";

const CATEGORIES = [
  "Cosméticos","Embalagens","Matéria-prima","Perfumaria",
  "Skincare","Maquiagem","Acessórios","Outros",
];

const TABS = ["Dados Gerais", "Contatos", "Endereço", "Observações"] as const;
type TabLabel = (typeof TABS)[number];

function emptyForm() {
  return {
    name: "", tradeName: "", cnpj: "", category: "",
    status: "active" as "active" | "inactive",
    logo: "", email: "", phone: "", isWhatsapp: false, whatsapp: "", website: "",
    cep: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", notes: "",
    // New fields (Req 2)
    contactPerson: "",
    contactRole: "",
    contactDepartment: "",
    contactPhone: "",
    contactEmail: "",
    contactIsWhatsapp: false,
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
        "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/80",
        "placeholder:text-muted-foreground text-xs focus:outline-none",
        "focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all",
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
        "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/80",
        "placeholder:text-muted-foreground text-xs focus:outline-none",
        "focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none",
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
        "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card/80",
        "text-xs text-foreground focus:outline-none",
        "focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all",
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
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-emerald-500" : "bg-muted-foreground/60")} />
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

interface SupplierCardProps {
  supplier: Supplier;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
}

function SupplierCard({ supplier, onEdit, onDelete }: SupplierCardProps) {
  const initials = getInitials(supplier.name);
  return (
    <div className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start gap-3.5">
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
          {supplier.cnpj && <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{supplier.cnpj}</p>}
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
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={supplier.status} />
        <CategoryBadge category={supplier.category} />
      </div>
      <div className="space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-3 mt-1">
        {/* Atendimento details */}
        {supplier.contactPerson && (
          <div className="bg-muted/30 p-2 rounded-xl border border-border/40 space-y-0.5 mb-2">
            <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Atendimento</div>
            <div className="font-semibold text-foreground truncate">{supplier.contactPerson}</div>
            {supplier.contactRole && <div className="text-[10px] text-muted-foreground">{supplier.contactRole} {supplier.contactDepartment ? `• ${supplier.contactDepartment}` : ""}</div>}
            {supplier.contactPhone && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono mt-1">
                {supplier.contactIsWhatsapp && (
                  <a 
                    href={`https://wa.me/55${supplier.contactPhone.replace(/\D/g, "")}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm5.835-3.279c1.652.981 3.256 1.488 4.962 1.489 5.372 0 9.743-4.368 9.746-9.743.001-2.605-1.013-5.053-2.86-6.902C15.895 3.717 13.456 2.7 10.997 2.7 5.626 2.7 1.256 7.07 1.253 12.446c-.001 1.774.478 3.493 1.393 5.044L1.706 22l4.186-1.279zm12.381-5.111c-.302-.151-1.785-.882-2.057-.981-.273-.099-.471-.148-.669.151-.197.297-.767.981-.941 1.18-.173.197-.347.222-.648.072-1.08-.541-1.928-.971-2.695-1.688-.636-.596-1.127-1.326-1.253-1.523-.125-.197-.013-.304.112-.429.112-.113.25-.297.375-.446.125-.148.165-.25.25-.421.082-.172.04-.322-.02-.471-.06-.151-.471-1.14-.648-1.564-.173-.421-.347-.363-.471-.369h-.402c-.136 0-.36.051-.548.257-.188.206-.718.702-.718 1.71 0 1.008.734 1.984.836 2.12.102.136 1.442 2.202 3.493 3.086.488.21 1.002.348 1.411.479.553.176 1.056.151 1.455.091.445-.067 1.365-.558 1.558-1.097.193-.538.193-1.002.136-1.097-.058-.096-.215-.148-.517-.297z"/>
                    </svg>
                  </a>
                )}
                <span>{supplier.contactPhone}</span>
              </div>
            )}
            {supplier.contactEmail && <div className="text-[10px] truncate">{supplier.contactEmail}</div>}
          </div>
        )}

        {(supplier.phone || supplier.whatsapp) && (
          <div className="flex items-center gap-1.5">
            {supplier.isWhatsapp && (
              <a 
                href={`https://wa.me/55${supplier.phone?.replace(/\D/g, "")}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-emerald-500 hover:text-emerald-600 transition-colors"
                title="Conversar no WhatsApp"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm5.835-3.279c1.652.981 3.256 1.488 4.962 1.489 5.372 0 9.743-4.368 9.746-9.743.001-2.605-1.013-5.053-2.86-6.902C15.895 3.717 13.456 2.7 10.997 2.7 5.626 2.7 1.256 7.07 1.253 12.446c-.001 1.774.478 3.493 1.393 5.044L1.706 22l4.186-1.279zm12.381-5.111c-.302-.151-1.785-.882-2.057-.981-.273-.099-.471-.148-.669.151-.197.297-.767.981-.941 1.18-.173.197-.347.222-.648.072-1.08-.541-1.928-.971-2.695-1.688-.636-.596-1.127-1.326-1.253-1.523-.125-.197-.013-.304.112-.429.112-.113.25-.297.375-.446.125-.148.165-.25.25-.421.082-.172.04-.322-.02-.471-.06-.151-.471-1.14-.648-1.564-.173-.421-.347-.363-.471-.369h-.402c-.136 0-.36.051-.548.257-.188.206-.718.702-.718 1.71 0 1.008.734 1.984.836 2.12.102.136 1.442 2.202 3.493 3.086.488.21 1.002.348 1.411.479.553.176 1.056.151 1.455.091.445-.067 1.365-.558 1.558-1.097.193-.538.193-1.002.136-1.097-.058-.096-.215-.148-.517-.297z"/>
                </svg>
              </a>
            )}
            <Phone className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="font-mono truncate">{supplier.phone || supplier.whatsapp}</span>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.address?.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="truncate">{supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ""}</span>
          </div>
        )}
      </div>
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
          Adicione seus fornecedores para gerenciar contatos, endereços e categorias de produtos.
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
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) onChange(ev.target.result as string); };
    reader.readAsDataURL(file);
  };
  const initials = getInitials(name);
  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
        {value ? <img src={value} alt="logo" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-muted-foreground">{initials || <Building2 className="h-6 w-6" />}</span>}
      </div>
      <div className="flex-1 space-y-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card/80 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
          <Upload className="h-3.5 w-3.5" /> Selecionar Logo
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="flex items-center gap-1.5 text-[11px] text-destructive hover:underline">
            <X className="h-3 w-3" /> Remover
          </button>
        )}
        <p className="text-[10px] text-muted-foreground">PNG, JPG ou WebP. Máx. 2MB.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function SuppliersPage() {
  const { getDocs, createDoc, updateDoc, deleteDoc } = useDb();
  const { success, error: toastError } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabLabel>("Dados Gerais");
  const [form, setForm] = useState(emptyForm());
  const [cepLoading, setCepLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocs("suppliers");
      setSuppliers(data as Supplier[]);
    } catch (e: any) {
      toastError("Erro ao carregar", e.message || "Nao foi possivel carregar os fornecedores.");
    } finally {
      setLoading(false);
    }
  }, [getDocs, toastError]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.tradeName?.toLowerCase().includes(q) || s.cnpj?.includes(q) || s.email?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function openNew() {
    setEditingId(null); setForm(emptyForm()); setActiveTab("Dados Gerais"); setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name, tradeName: s.tradeName ?? "", cnpj: s.cnpj ?? "",
      category: s.category ?? "", status: s.status, logo: s.logo ?? "",
      email: s.email ?? "", phone: s.phone ?? "", isWhatsapp: !!s.isWhatsapp,
      whatsapp: s.whatsapp ?? "", website: s.website ?? "", cep: s.address?.cep ?? "",
      street: s.address?.street ?? "", number: s.address?.number ?? "",
      complement: s.address?.complement ?? "", neighborhood: s.address?.neighborhood ?? "",
      city: s.address?.city ?? "", state: s.address?.state ?? "", notes: s.notes ?? "",
      // New fields
      contactPerson: s.contactPerson ?? "",
      contactRole: s.contactRole ?? "",
      contactDepartment: s.contactDepartment ?? "",
      contactPhone: s.contactPhone ?? "",
      contactEmail: s.contactEmail ?? "",
      contactIsWhatsapp: !!s.contactIsWhatsapp,
    });
    setActiveTab("Dados Gerais"); setModalOpen(true);
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
    if (!form.name.trim()) {
      toastError("Campo obrigatorio", "A Razao Social e obrigatoria.");
      setActiveTab("Dados Gerais"); return;
    }
    setSaving(true);
    try {
      const hasAddress = form.cep || form.street || form.city;
      const payload: Omit<Supplier, "id" | "tenantId" | "createdAt"> = {
        name: form.name.trim(), tradeName: form.tradeName.trim() || undefined,
        cnpj: form.cnpj.trim() || undefined, category: form.category || undefined,
        status: form.status, logo: form.logo || undefined,
        email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
        isWhatsapp: form.isWhatsapp,
        whatsapp: form.whatsapp.trim() || undefined, website: form.website.trim() || undefined,
        notes: form.notes.trim() || undefined,
        address: hasAddress ? {
          cep: form.cep, street: form.street, number: form.number,
          complement: form.complement || undefined, neighborhood: form.neighborhood,
          city: form.city, state: form.state,
        } : undefined,
        // Representative fields (Req 2)
        contactPerson: form.contactPerson.trim() || undefined,
        contactRole: form.contactRole.trim() || undefined,
        contactDepartment: form.contactDepartment.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactIsWhatsapp: form.contactIsWhatsapp,
      };
      if (editingId) {
        await updateDoc("suppliers", editingId, payload);
        success("Fornecedor atualizado!", `${form.name} foi atualizado com sucesso.`);
      } else {
        await createDoc("suppliers", payload);
        success("Fornecedor criado!", `${form.name} foi cadastrado com sucesso.`);
      }
      setModalOpen(false);
      await loadSuppliers();
    } catch (e: any) {
      toastError("Erro ao salvar", e.message || "Ocorreu um erro ao salvar o fornecedor.");
    } finally { setSaving(false); }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Tem certeza que deseja excluir "${s.name}"?\n\nEsta acao nao pode ser desfeita.`)) return;
    try {
      await deleteDoc("suppliers", s.id);
      success("Fornecedor excluido", `${s.name} foi removido.`);
      await loadSuppliers();
    } catch (e: any) {
      toastError("Erro ao excluir", e.message || "Nao foi possivel excluir o fornecedor.");
    }
  }

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const inactiveCount = suppliers.filter((s) => s.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shadow-md shadow-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">Fornecedores</h1>
              {!loading && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">{suppliers.length}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie todos os seus fornecedores e parceiros.</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </button>
      </div>

      {/* Stats */}
      {!loading && suppliers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: suppliers.length, color: "text-foreground" },
            { label: "Ativos", value: activeCount, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Inativos", value: inactiveCount, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 p-3 rounded-xl border border-border bg-card/40">
              <span className={cn("text-lg font-bold", color)}>{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, e-mail, categoria..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>
        <div className="flex border border-border bg-card/40 rounded-xl p-1 shrink-0 self-start sm:self-auto">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)} className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all", statusFilter === f ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
              {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 && suppliers.length === 0 ? (
        <EmptyState onNew={openNew} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum resultado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente outros termos ou limpe os filtros.</p>
          </div>
          <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-xs text-primary hover:underline">Limpar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => <SupplierCard key={s.id} supplier={s} onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
        description={editingId ? "Atualize os dados do fornecedor abaixo." : "Preencha os dados para cadastrar um novo fornecedor."}
        size="xl"
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border -mx-5 px-5 overflow-x-auto">
          {TABS.map((tab) => {
            const icons: Record<TabLabel, React.ReactNode> = {
              "Dados Gerais": <Building2 className="h-3.5 w-3.5" />,
              "Contatos": <Phone className="h-3.5 w-3.5" />,
              "Endereço": <MapPin className="h-3.5 w-3.5" />,
              "Observações": <FileText className="h-3.5 w-3.5" />,
            };
            return (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all", activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {icons[tab as keyof typeof icons]} {tab}
              </button>
            );
          })}
        </div>

        {/* Tab: Dados Gerais */}
        {activeTab === "Dados Gerais" && (
          <div className="space-y-4">
            <div>
              <FormLabel>Logo / Foto</FormLabel>
              <LogoUploader value={form.logo} onChange={(v) => setField("logo", v)} name={form.name} />
            </div>
            <div>
              <FormLabel>Razao Social *</FormLabel>
              <FormInput type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Natura Cosmeticos S/A" required />
            </div>
            <div>
              <FormLabel>Nome Fantasia</FormLabel>
              <FormInput type="text" value={form.tradeName} onChange={(e) => setField("tradeName", e.target.value)} placeholder="Ex: Natura" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel>CNPJ</FormLabel>
                <FormInput type="text" value={form.cnpj} onChange={(e) => setField("cnpj", maskCnpj(e.target.value))} placeholder="XX.XXX.XXX/XXXX-XX" className="font-mono" maxLength={18} />
              </div>
              <div>
                <FormLabel>Categoria</FormLabel>
                <FormSelect value={form.category} onChange={(e) => setField("category", e.target.value)}>
                  <option value="">Selecionar...</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </FormSelect>
              </div>
            </div>
            <div>
              <FormLabel>Status</FormLabel>
              <button type="button" onClick={() => setField("status", form.status === "active" ? "inactive" : "active")}
                className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                  form.status === "active"
                    ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-border bg-card/80 text-muted-foreground"
                )}>
                <span className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all", form.status === "active" ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40 bg-transparent")}>
                  {form.status === "active" && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                </span>
                {form.status === "active" ? "Ativo" : "Inativo"}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Contatos */}
        {activeTab === "Contatos" && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Contatos Gerais */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Contatos Gerais</h4>
              <div>
                <FormLabel>E-mail</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <FormInput type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="contato@fornecedor.com.br" className="pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Telefone</label>
                    <label className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isWhatsapp}
                        onChange={(e) => setField("isWhatsapp", e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3 w-3"
                      />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <FormInput type="text" value={form.phone} onChange={(e) => setField("phone", maskPhone(e.target.value))} placeholder="(11) 99999-9999" className="pl-9 font-mono" maxLength={15} />
                  </div>
                </div>
                <div>
                  <FormLabel>Outro Telefone / WhatsApp</FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <FormInput type="text" value={form.whatsapp} onChange={(e) => setField("whatsapp", maskPhone(e.target.value))} placeholder="(11) 99999-9999" className="pl-9 font-mono" maxLength={15} />
                  </div>
                </div>
              </div>
              <div>
                <FormLabel>Website</FormLabel>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <FormInput type="url" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://www.fornecedor.com.br" className="pl-9" />
                </div>
              </div>
            </div>

            {/* Responsável pelo Atendimento (Req 2) */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Responsável pelo Atendimento</h4>
              <div>
                <FormLabel>Nome do Responsável</FormLabel>
                <FormInput type="text" value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} placeholder="Ex: Carlos Silva" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FormLabel>Cargo</FormLabel>
                  <FormInput type="text" value={form.contactRole} onChange={(e) => setField("contactRole", e.target.value)} placeholder="Ex: Gerente Comercial" />
                </div>
                <div>
                  <FormLabel>Departamento</FormLabel>
                  <FormInput type="text" value={form.contactDepartment} onChange={(e) => setField("contactDepartment", e.target.value)} placeholder="Ex: Vendas Atacado" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Telefone Direto</label>
                    <label className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.contactIsWhatsapp}
                        onChange={(e) => setField("contactIsWhatsapp", e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3 w-3"
                      />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <FormInput type="text" value={form.contactPhone} onChange={(e) => setField("contactPhone", maskPhone(e.target.value))} placeholder="(11) 99999-9999" className="pl-9 font-mono" maxLength={15} />
                  </div>
                </div>
                <div>
                  <FormLabel>E-mail Direto</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <FormInput type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} placeholder="vendedor@fornecedor.com.br" className="pl-9" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Endereço */}
        {activeTab === "Endereço" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <FormLabel>CEP</FormLabel>
                <div className="relative">
                  <FormInput type="text" value={form.cep} onChange={(e) => setField("cep", maskCep(e.target.value))} onBlur={handleCepBlur} placeholder="00000-000" className={cn("font-mono", cepLoading && "opacity-60")} maxLength={9} disabled={cepLoading} />
                  {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary animate-pulse">Buscando...</span>}
                </div>
              </div>
              <div className="col-span-2">
                <FormLabel>Rua / Logradouro</FormLabel>
                <FormInput type="text" value={form.street} onChange={(e) => setField("street", e.target.value)} placeholder="Ex: Av. Paulista" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FormLabel>Numero</FormLabel>
                <FormInput type="text" value={form.number} onChange={(e) => setField("number", e.target.value)} placeholder="1000" />
              </div>
              <div className="col-span-2">
                <FormLabel>Complemento</FormLabel>
                <FormInput type="text" value={form.complement} onChange={(e) => setField("complement", e.target.value)} placeholder="Sala 5, Bloco A..." />
              </div>
            </div>
            <div>
              <FormLabel>Bairro</FormLabel>
              <FormInput type="text" value={form.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} placeholder="Ex: Bela Vista" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <FormLabel>Cidade</FormLabel>
                <FormInput type="text" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Ex: Sao Paulo" />
              </div>
              <div>
                <FormLabel>UF</FormLabel>
                <FormInput type="text" value={form.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} placeholder="SP" maxLength={2} className="text-center uppercase" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary/60" />
              Digite o CEP e aguarde o preenchimento automatico dos campos de endereco.
            </p>
          </div>
        )}

        {/* Tab: Observações */}
        {activeTab === "Observações" && (
          <div className="space-y-4">
            <div>
              <FormLabel>Observacoes / Notas Internas</FormLabel>
              <FormTextarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Condicoes especiais, contatos adicionais, prazo de entrega tipico..." rows={8} />
            </div>
            <p className="text-[10px] text-muted-foreground">Estas anotacoes sao internas e visiveis apenas para a equipe.</p>
          </div>
        )}

        <ModalFooter>
          <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:pointer-events-none">
            {saving ? (
              <><span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> Salvando...</>
            ) : (
              <><Check className="h-3.5 w-3.5" /> {editingId ? "Salvar Alteracoes" : "Cadastrar Fornecedor"}</>
            )}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
