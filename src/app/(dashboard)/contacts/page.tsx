"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { Customer, Supplier } from "@/features/customers/types";
import { CustomerSchema, SupplierSchema } from "@/features/customers/schemas";
import {
  Users,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Phone,
  Mail,
  MapPin,
  X,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// Mock inicial para Clientes
const INITIAL_CUSTOMERS = [
  { name: "Mariana Silva", email: "mariana.silva@gmail.com", phone: "+5511999998888", instagram: "@marianasilva", birthday: "1995-04-12", tags: ["VIP", "Perfumes"], source: "instagram", notes: "Prefere fragrâncias florais doces.", metrics: { totalOrders: 5, totalSpent: 750.00 } },
  { name: "Juliana Costa", email: "juliana.costa@hotmail.com", phone: "+5521988887777", instagram: "@jucosta", birthday: "1990-09-22", tags: ["Skincare"], source: "shopee", notes: "Pele sensível.", metrics: { totalOrders: 3, totalSpent: 350.00 } },
  { name: "Ana Beatriz", email: "ana.beatriz@outlook.com", phone: "+5511977776666", instagram: "@anabea_beauty", birthday: "1988-12-05", tags: ["Maquiagem", "VIP"], source: "walk-in", notes: "Sempre compra lançamentos de batons.", metrics: { totalOrders: 12, totalSpent: 1890.00 } }
];

// Mock inicial para Fornecedores
const INITIAL_SUPPLIERS = [
  { name: "Natura Cosméticos S/A", cnpj: "12.345.678/0001-00", email: "pedidos@natura.com.br", phone: "0800-115-566", contactPerson: "Carlos Silva" },
  { name: "Eudora (Grupo Boticário)", cnpj: "98.765.432/0001-99", email: "atendimento@eudora.com.br", phone: "0800-727-4533", contactPerson: "Fernanda Souza" }
];

export default function ContactsPage() {
  const { createDoc, getDocs, updateDoc, deleteDoc } = useDb();

  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");
  const [searchQuery, setSearchQuery] = useState("");

  // Lists state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpfOrCnpj, setCpfOrCnpj] = useState("");
  const [instagram, setInstagram] = useState("");
  const [birthday, setBirthday] = useState("");
  const [source, setSource] = useState("instagram");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // Address fields
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [hasAddress, setHasAddress] = useState(false);

  // Error States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados iniciais
  const loadData = async () => {
    setLoading(true);
    try {
      let custs = await getDocs("customers");
      let supps = await getDocs("suppliers");

      // Se estiver vazio no mock, preenchemos com dados de exemplo
      if (custs.length === 0) {
        for (const c of INITIAL_CUSTOMERS) {
          await createDoc("customers", c);
        }
        custs = await getDocs("customers");
      }

      if (supps.length === 0) {
        for (const s of INITIAL_SUPPLIERS) {
          await createDoc("suppliers", s);
        }
        supps = await getDocs("suppliers");
      }

      setCustomers(custs as Customer[]);
      setSuppliers(supps as Supplier[]);
    } catch (e) {
      console.error("Erro ao carregar contatos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abrir formulário de criação
  const handleNew = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
    setCpfOrCnpj("");
    setInstagram("");
    setBirthday("");
    setSource("instagram");
    setNotes("");
    setTagsInput("");
    setContactPerson("");
    
    // Address
    setStreet("");
    setNumber("");
    setComplement("");
    setNeighborhood("");
    setCity("");
    setState("");
    setZipCode("");
    setHasAddress(false);
    
    setErrors({});
    setDrawerOpen(true);
  };

  // Abrir formulário de edição
  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name || "");
    setEmail(item.email || "");
    setPhone(item.phone || "");
    setCpfOrCnpj(activeTab === "customers" ? (item.cpf || "") : (item.cnpj || ""));
    setInstagram(item.instagram || "");
    setBirthday(item.birthday || "");
    setSource(item.source || "instagram");
    setNotes(item.notes || "");
    setTagsInput(item.tags ? item.tags.join(", ") : "");
    setContactPerson(item.contactPerson || "");

    // Address
    if (item.address) {
      setStreet(item.address.street || "");
      setNumber(item.address.number || "");
      setComplement(item.address.complement || "");
      setNeighborhood(item.address.neighborhood || "");
      setCity(item.address.city || "");
      setState(item.address.state || "");
      setZipCode(item.address.zipCode || "");
      setHasAddress(true);
    } else {
      setStreet("");
      setNumber("");
      setComplement("");
      setNeighborhood("");
      setCity("");
      setState("");
      setZipCode("");
      setHasAddress(false);
    }

    setErrors({});
    setDrawerOpen(true);
  };

  // Excluir registro
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o cadastro de "${name}"?`)) {
      try {
        await deleteDoc(activeTab, id);
        await loadData();
      } catch (e: any) {
        alert(e.message || "Erro ao excluir.");
      }
    }
  };

  // Salvar formulário
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const addressData = hasAddress ? {
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode
    } : undefined;

    // 1. Validação de dados com Zod
    if (activeTab === "customers") {
      const payload = {
        name,
        email: email || undefined,
        phone,
        cpf: cpfOrCnpj || undefined,
        instagram: instagram || undefined,
        birthday: birthday || undefined,
        tags: tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : [],
        source,
        notes: notes || undefined,
        address: addressData
      };

      const result = CustomerSchema.safeParse(payload);
      if (!result.success) {
        const errorMap: Record<string, string> = {};
        result.error.issues.forEach(issue => {
          const path = issue.path.join(".");
          errorMap[path] = issue.message;
        });
        setErrors(errorMap);
        return;
      }

      try {
        if (editingId) {
          await updateDoc("customers", editingId, payload);
        } else {
          await createDoc("customers", {
            ...payload,
            metrics: { totalOrders: 0, totalSpent: 0 }
          });
        }
      } catch (err: any) {
        alert(err.message || "Erro ao salvar cliente.");
        return;
      }

    } else {
      // Fornecedores
      const payload = {
        name,
        cnpj: cpfOrCnpj || undefined,
        email: email || undefined,
        phone: phone || undefined,
        contactPerson: contactPerson || undefined,
        address: addressData
      };

      const result = SupplierSchema.safeParse(payload);
      if (!result.success) {
        const errorMap: Record<string, string> = {};
        result.error.issues.forEach(issue => {
          const path = issue.path.join(".");
          errorMap[path] = issue.message;
        });
        setErrors(errorMap);
        return;
      }

      try {
        if (editingId) {
          await updateDoc("suppliers", editingId, payload);
        } else {
          await createDoc("suppliers", payload);
        }
      } catch (err: any) {
        alert(err.message || "Erro ao salvar fornecedor.");
        return;
      }
    }

    setDrawerOpen(false);
    await loadData();
  };

  // Filtragem local
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cnpj?.includes(searchQuery) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSourceBadgeStyle = (src: string) => {
    switch (src) {
      case "instagram": return "bg-pink-100 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400 border-pink-200/50";
      case "shopee": return "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/50";
      case "whatsapp": return "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/50";
      case "walk-in": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/50";
      default: return "bg-rosegold-50 text-rosegold-700 dark:bg-rosegold-950/20 dark:text-rosegold-400 border-rosegold-200/50";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Contatos do <span className="font-semibold text-rosegold-500">ERP & SaaS</span></h1>
          <p className="text-xs text-muted-foreground">Gerenciamento completo do relacionamento de clientes e fornecedores.</p>
        </div>
        
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo {activeTab === "customers" ? "Cliente" : "Fornecedor"}</span>
        </button>
      </div>

      {/* 2. Seleção de Abas & Filtro */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Abas */}
        <div className="flex border border-border bg-card/40 rounded-xl p-1 shrink-0 self-start">
          <button
            onClick={() => { setActiveTab("customers"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors",
              activeTab === "customers"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Clientes ({customers.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab("suppliers"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors",
              activeTab === "suppliers"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="h-4 w-4" />
            <span>Fornecedores ({suppliers.length})</span>
          </button>
        </div>

        {/* Busca */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "customers" ? "Buscar por nome, telefone, email ou tag..." : "Buscar por nome, CNPJ, email..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* 3. Tabela de Conteúdo */}
      <div className="border border-border bg-card/40 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Carregando contatos...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "customers" ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4">Redes Sociais</th>
                    <th className="p-4">Canal</th>
                    <th className="p-4">Tags</th>
                    <th className="p-4">Métricas</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum cliente cadastrado ou encontrado.</td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{c.name}</div>
                          {c.cpf && <span className="text-[10px] text-muted-foreground font-mono">CPF: {c.cpf}</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 font-mono text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /> {c.phone}</span>
                            {c.email && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /> {c.email}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          {c.instagram ? (
                            <a href={`https://instagram.com/${c.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-500 hover:underline">
                              <Instagram className="h-3.5 w-3.5" />
                              <span>{c.instagram}</span>
                            </a>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize", getSourceBadgeStyle(c.source))}>
                            {c.source}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((tag, idx) => (
                              <span key={idx} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-rosegold-200/50 bg-rosegold-50 dark:bg-rosegold-950/20 text-rosegold-700 dark:text-rosegold-400 text-[10px] font-medium">
                                <Tag className="h-2.5 w-2.5 shrink-0" />
                                <span>{tag}</span>
                              </span>
                            ))}
                            {c.tags.length === 0 && <span className="text-muted-foreground">-</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-[11px]">
                            <span className="font-semibold text-foreground">{c.metrics.totalOrders} Pedidos</span>
                            <div className="text-[10px] text-muted-foreground">Total: R$ {c.metrics.totalSpent.toFixed(2)}</div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="p-4">Fornecedor</th>
                    <th className="p-4">CNPJ</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4">Pessoa de Contato</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum fornecedor cadastrado ou encontrado.</td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-semibold text-foreground">{s.name}</td>
                        <td className="p-4 font-mono text-muted-foreground">{s.cnpj || "-"}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            {s.phone && <span className="flex items-center gap-1 font-mono text-muted-foreground"><Phone className="h-3 w-3" /> {s.phone}</span>}
                            {s.email && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Mail className="h-3 w-3" /> {s.email}</span>}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{s.contactPerson || "-"}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 4. Slide-over Form Drawer (Clientes / Fornecedores) */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <div className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-rosegold-500" />
                <span>{editingId ? "Editar" : "Novo"} {activeTab === "customers" ? "Cliente" : "Fornecedor"}</span>
              </h3>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* Nome */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={activeTab === "customers" ? "Ex: Mariana Silva" : "Ex: Natura Distribuidora"}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
              </div>

              {/* Email & Telefone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  {errors.email && <p className="text-[10px] text-destructive mt-0.5">{errors.email}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Telefone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-8888"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  {errors.phone && <p className="text-[10px] text-destructive mt-0.5">{errors.phone}</p>}
                </div>
              </div>

              {/* CPF / CNPJ */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                  {activeTab === "customers" ? "CPF" : "CNPJ"}
                </label>
                <input
                  type="text"
                  value={cpfOrCnpj}
                  onChange={(e) => setCpfOrCnpj(e.target.value)}
                  placeholder={activeTab === "customers" ? "123.456.789-00" : "12.345.678/0001-99"}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
                />
                {errors.cpf && <p className="text-[10px] text-destructive mt-0.5">{errors.cpf}</p>}
                {errors.cnpj && <p className="text-[10px] text-destructive mt-0.5">{errors.cnpj}</p>}
              </div>

              {/* Campos específicos de Clientes */}
              {activeTab === "customers" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Instagram */}
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Instagram</label>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@usuario"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                    {/* Birthday */}
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Aniversário (AAAA-MM-DD)</label>
                      <input
                        type="text"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        placeholder="Ex: 1995-04-12"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                      {errors.birthday && <p className="text-[10px] text-destructive mt-0.5">{errors.birthday}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Tags */}
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Tags (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Ex: VIP, Skincare, Perfumes"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                    {/* Origem (Source) */}
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Origem / Canal</label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="shopee">Shopee</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="mercadolivre">Mercado Livre</option>
                        <option value="walk-in">Loja Física / Presencial</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Notas de Preferência / Observações</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Prefere fragrâncias florais doces, tem alergia a..."
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                    />
                  </div>
                </>
              )}

              {/* Campos específicos de Fornecedores */}
              {activeTab === "suppliers" && (
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Pessoa de Contato / Vendedor</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Ex: Carlos Silva - Supervisor Regional"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              )}

              {/* Checkbox de Endereço */}
              <div className="flex items-center gap-2 pt-2 pb-1 border-t border-border">
                <input
                  type="checkbox"
                  id="hasAddress"
                  checked={hasAddress}
                  onChange={(e) => setHasAddress(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="hasAddress" className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] cursor-pointer flex items-center gap-1 select-none">
                  <MapPin className="h-3.5 w-3.5 text-rosegold-500" />
                  <span>Cadastrar Endereço Completo</span>
                </label>
              </div>

              {/* Bloco de Endereço */}
              {hasAddress && (
                <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Rua</label>
                      <input
                        type="text"
                        required={hasAddress}
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Ex: Av. Paulista"
                        className="w-full p-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Número</label>
                      <input
                        type="text"
                        required={hasAddress}
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Ex: 1000"
                        className="w-full p-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Bairro</label>
                      <input
                        type="text"
                        required={hasAddress}
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ex: Bela Vista"
                        className="w-full p-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Complemento</label>
                      <input
                        type="text"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Ex: Apto 51"
                        className="w-full p-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Cidade</label>
                      <input
                        type="text"
                        required={hasAddress}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: São Paulo"
                        className="w-full p-2 rounded-lg border border-border bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Estado (UF)</label>
                      <input
                        type="text"
                        required={hasAddress}
                        maxLength={2}
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full p-2 rounded-lg border border-border bg-card text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">CEP</label>
                    <input
                      type="text"
                      required={hasAddress}
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="01310-100"
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Botões de Ação do Drawer */}
              <div className="flex gap-3.5 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                >
                  {editingId ? "Salvar Alterações" : "Cadastrar Novo"}
                </button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
