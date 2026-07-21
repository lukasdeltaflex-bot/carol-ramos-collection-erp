"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { Customer } from "@/features/customers/types";
import { CustomerSchema } from "@/features/customers/schemas";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Phone,
  Mail,
  MapPin,
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn, formatCurrency, formatDate, calculateAge, maskCpf, maskPhone, maskCep, maskDate } from "@/lib/utils";

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

const INITIAL_CUSTOMERS = [
  { name: "Mariana Silva", email: "mariana.silva@gmail.com", phone: "+5511999998888", instagram: "@marianasilva", birthday: "1995-04-12", tags: ["VIP", "Perfumes"], source: "instagram", notes: "Prefere fragrâncias florais doces.", metrics: { totalOrders: 5, totalSpent: 750.00 } },
  { name: "Juliana Costa", email: "juliana.costa@hotmail.com", phone: "+5521988887777", instagram: "@jucosta", birthday: "1990-09-22", tags: ["Skincare"], source: "shopee", notes: "Pele sensível.", metrics: { totalOrders: 3, totalSpent: 350.00 } },
  { name: "Ana Beatriz", email: "ana.beatriz@outlook.com", phone: "+5511977776666", instagram: "@anabea_beauty", birthday: "1988-12-05", tags: ["Maquiagem", "VIP"], source: "walk-in", notes: "Sempre compra lançamentos de batons.", metrics: { totalOrders: 12, totalSpent: 1890.00 } }
];

import { getCustomerVipTier, VIP_TIERS, VipTier } from "@/features/customers/utils";

export default function ContactsPage() {
  const { tenantId } = useAuth();
  const { createDoc, getDocs, updateDoc, deleteDoc, softDeleteDoc, invalidateCache } = useDb();

  const [searchQuery, setSearchQuery] = useState("");
  const [vipFilter, setVipFilter] = useState<"all" | VipTier>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, vipFilter]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const [cpf, setCpf] = useState("");
  const [instagram, setInstagram] = useState("");
  const [birthday, setBirthday] = useState("");
  const [source, setSource] = useState("instagram");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

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

  const loadData = async () => {
    setLoading(true);
    try {
      let custs = await getDocs("customers");
      const safeCusts = (custs as Customer[]) || [];
      const isSeeded = typeof window !== "undefined" && localStorage.getItem("seeded_customers_v1") === "true";

      if (safeCusts.length === 0 && !isSeeded) {
        for (const c of INITIAL_CUSTOMERS) {
          await createDoc("customers", c);
        }
        if (typeof window !== "undefined") localStorage.setItem("seeded_customers_v1", "true");
        custs = await getDocs("customers");
      }

      setCustomers((custs as Customer[]) || []);
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const handleNew = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
    setIsWhatsapp(false);
    setCpf("");
    setInstagram("");
    setBirthday("");
    setSource("instagram");
    setNotes("");
    setTagsInput("");
    
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

  const handleEdit = (item: Customer) => {
    setEditingId(item.id);
    setName(item.name || "");
    setEmail(item.email || "");
    setPhone(item.phone || "");
    setIsWhatsapp(!!item.isWhatsapp);
    setCpf(item.cpf || "");
    setInstagram(item.instagram || "");
    setBirthday(item.birthday || "");
    setSource(item.source || "instagram");
    setNotes(item.notes || "");
    setTagsInput(item.tags ? item.tags.join(", ") : "");

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

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja mover o cliente "${name}" para a Lixeira Inteligente?`)) {
      try {
        if (typeof window !== "undefined") localStorage.setItem("seeded_customers_v1", "true");
        await softDeleteDoc("customers", id, "Clientes", name);
        invalidateCache("customers");
        setCustomers(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        await loadData();
      } catch (e: any) {
        alert(e.message || "Erro ao excluir.");
      }
    }
  };

  // Batch Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedCustomers.length && paginatedCustomers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedCustomers.map(c => c.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja mover os ${selectedIds.length} clientes selecionados para a Lixeira Inteligente?`)) {
      try {
        if (typeof window !== "undefined") localStorage.setItem("seeded_customers_v1", "true");
        for (const id of selectedIds) {
          const cust = customers.find(c => c.id === id);
          await softDeleteDoc("customers", id, "Clientes", cust?.name || "Cliente");
        }
        invalidateCache("customers");
        setCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        await loadData();
        alert(`${selectedIds.length} clientes movidos para a Lixeira com sucesso.`);
      } catch (err: any) {
        alert(err.message || "Erro na exclusão em lote.");
      }
    }
  };

  const handleBatchExport = () => {
    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
    if (selectedCustomers.length === 0) return;
    let csvContent = `data:text/csv;charset=utf-8,Nome;Email;Telefone;CPF;Instagram;Canal;Tags\n`;
    selectedCustomers.forEach(c => {
      csvContent += `"${c.name}";"${c.email || ""}";"${c.phone}";"${c.cpf || ""}";"${c.instagram || ""}";"${c.source}";"${c.tags.join(",")}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Clientes_Selecionados_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCepBlur = async () => {
    const clean = zipCode.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        alert("CEP não encontrado. Por favor, verifique.");
        return;
      }
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  };

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

    const payload = {
      name,
      email: email || undefined,
      phone,
      isWhatsapp,
      cpf: cpf || undefined,
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
    setDrawerOpen(false);
    await loadData();
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (vipFilter !== "all") {
      const vipTier = getCustomerVipTier(c).id;
      return vipTier === vipFilter;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

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
    <div className="space-y-6 pb-20">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Clientes do <span className="font-semibold text-rosegold-500">ERP & SaaS</span></h1>
          <p className="text-xs text-muted-foreground">Gerenciamento completo do relacionamento e preferências de clientes.</p>
        </div>
        
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* 2. Filtro & Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Total Badge & VIP Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-border bg-card/40 rounded-xl p-2.5 text-xs font-semibold text-muted-foreground items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            <span>Clientes: <strong className="text-foreground">{customers.length}</strong></span>
          </div>

          {/* Filtro VIP */}
          <div className="flex items-center p-1 rounded-xl border border-border bg-card/40 gap-1 text-xs">
            <button
              onClick={() => setVipFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-xs",
                vipFilter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setVipFilter("gold")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center gap-1",
                vipFilter === "gold" ? "bg-amber-500 text-white shadow-xs" : "text-amber-500 hover:bg-amber-500/10"
              )}
            >
              🥇 Ouro
            </button>
            <button
              onClick={() => setVipFilter("silver")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center gap-1",
                vipFilter === "silver" ? "bg-slate-400 text-white shadow-xs" : "text-slate-400 hover:bg-slate-400/10"
              )}
            >
              🥈 Prata
            </button>
            <button
              onClick={() => setVipFilter("bronze")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center gap-1",
                vipFilter === "bronze" ? "bg-amber-800 text-white shadow-xs" : "text-amber-700 hover:bg-amber-800/10"
              )}
            >
              🥉 Bronze
            </button>
          </div>
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
            placeholder="Buscar por nome, telefone, email ou tag..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* 3. Tabela de Conteúdo */}
      <div className="border border-border bg-card/40 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Carregando clientes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedCustomers.length && paginatedCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Idade</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">Redes Sociais</th>
                  <th className="p-4">Canal</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4">Métricas</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum cliente cadastrado ou encontrado.</td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <tr key={c.id} className={cn("transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/10")}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDoc(c.id)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{c.name}</span>
                            {(() => {
                              const vip = getCustomerVipTier(c);
                              return (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center gap-0.5",
                                    vip.bgClass,
                                    vip.colorClass,
                                    vip.borderClass
                                  )}
                                  title={`Status: ${vip.label}`}
                                >
                                  {vip.badge}
                                </span>
                              );
                            })()}
                          </div>
                          {c.cpf && <span className="text-[10px] text-muted-foreground font-mono">CPF: {c.cpf}</span>}
                        </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {calculateAge(c.birthday) || "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                            {c.isWhatsapp && (
                              <a 
                                href={`https://wa.me/55${c.phone.replace(/\D/g, "")}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer" 
                                title="Conversar no WhatsApp"
                              >
                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm5.835-3.279c1.652.981 3.256 1.488 4.962 1.489 5.372 0 9.743-4.368 9.746-9.743.001-2.605-1.013-5.053-2.86-6.902C15.895 3.717 13.456 2.7 10.997 2.7 5.626 2.7 1.256 7.07 1.253 12.446c-.001 1.774.478 3.493 1.393 5.044L1.706 22l4.186-1.279zm12.381-5.111c-.302-.151-1.785-.882-2.057-.981-.273-.099-.471-.148-.669.151-.197.297-.767.981-.941 1.18-.173.197-.347.222-.648.072-1.08-.541-1.928-.971-2.695-1.688-.636-.596-1.127-1.326-1.253-1.523-.125-.197-.013-.304.112-.429.112-.113.25-.297.375-.446.125-.148.165-.25.25-.421.082-.172.04-.322-.02-.471-.06-.151-.471-1.14-.648-1.564-.173-.421-.347-.363-.471-.369h-.402c-.136 0-.36.051-.548.257-.188.206-.718.702-.718 1.71 0 1.008.734 1.984.836 2.12.102.136 1.442 2.202 3.493 3.086.488.21 1.002.348 1.411.479.553.176 1.056.151 1.455.091.445-.067 1.365-.558 1.558-1.097.193-.538.193-1.002.136-1.097-.058-.096-.215-.148-.517-.297z"/>
                                </svg>
                              </a>
                            )}
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{c.phone}</span>
                          </span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/10 select-none">
          <span className="text-xs text-muted-foreground">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredCustomers.length} itens)
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

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-2xl border border-primary/40 shadow-2xl rounded-2xl p-3 px-5 flex flex-wrap items-center gap-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-extrabold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-foreground">
              {selectedIds.length === 1 ? "1 cliente selecionado" : `${selectedIds.length} clientes selecionados`}
            </span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all"
            >
              Exportar CSV
            </button>

            <button
              onClick={handleBatchDelete}
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
      </div>

      {/* 4. Slide-over Form Drawer (Clientes) */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <div className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-rosegold-500" />
                <span>{editingId ? "Editar Cliente" : "Novo Cliente"}</span>
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
                  placeholder="Ex: Mariana Silva"
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
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Telefone</label>
                    <label className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isWhatsapp}
                        onChange={(e) => setIsWhatsapp(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3 w-3"
                      />
                      <span>WhatsApp</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  {errors.phone && <p className="text-[10px] text-destructive mt-0.5">{errors.phone}</p>}
                </div>
              </div>

              {/* CPF */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
                />
                {errors.cpf && <p className="text-[10px] text-destructive mt-0.5">{errors.cpf}</p>}
              </div>

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
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Aniversário (DD/MM/AAAA)</label>
                  <input
                    type="text"
                    value={birthday}
                    onChange={(e) => setBirthday(maskDate(e.target.value))}
                    placeholder="Ex: 15/08/1992"
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
                      onChange={(e) => setZipCode(maskCep(e.target.value))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
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
