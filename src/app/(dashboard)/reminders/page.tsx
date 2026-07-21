"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import { cn, formatDate } from "@/lib/utils";
import {
  Lightbulb,
  Plus,
  Search,
  Pin,
  Star,
  CheckCircle2,
  Clock,
  Tag,
  User,
  Copy,
  Archive,
  Trash2,
  Edit2,
  LayoutGrid,
  List as ListIcon,
  Filter,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  X,
  Sparkles,
  Check
} from "lucide-react";
import { Reminder, ReminderCategory, ReminderPriority, ReminderStatus } from "@/features/reminders/types";

const COLOR_OPTIONS = [
  { name: "Amarelo Post-it", value: "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200" },
  { name: "Azul Suave", value: "bg-sky-100 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200" },
  { name: "Verde Menta", value: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200" },
  { name: "Rosa Rosegold", value: "bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200" },
  { name: "Roxo Lavanda", value: "bg-purple-100 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200" },
  { name: "Cinza Neutro", value: "bg-card border-border text-foreground" },
];

const INITIAL_REMINDERS = [
  {
    title: "Planejar Coleção Verão 2027",
    description: "Reunir com a equipe de estilistas para selecionar tecidos de linho e estampas florais exclusivas.",
    category: "idea" as const,
    priority: "high" as const,
    creationDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    color: "bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200",
    tags: ["Estilo", "Coleção", "Design"],
    responsiblePerson: "Carol Ramos",
    status: "in_progress" as const,
    isFavorite: true,
    isPinned: true
  },
  {
    title: "Renovar Certificado Digital e-CNPJ",
    description: "Solicitar renovação do A1 com a contabilidade antes do vencimento no fim do mês.",
    category: "task" as const,
    priority: "urgent" as const,
    creationDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    color: "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200",
    tags: ["Fiscal", "Contabilidade"],
    responsiblePerson: "Financeiro",
    status: "pending" as const,
    isFavorite: false,
    isPinned: true
  },
  {
    title: "Ideia: Programa de Fidelidade VIP",
    description: "Oferecer cashback em pontos para clientes que comprarem acima de R$ 500 no trimestre.",
    category: "idea" as const,
    priority: "medium" as const,
    creationDate: new Date().toISOString().split("T")[0],
    color: "bg-purple-100 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200",
    tags: ["Marketing", "Fidelização"],
    responsiblePerson: "Comercial",
    status: "pending" as const,
    isFavorite: true,
    isPinned: false
  }
];

export default function RemindersPage() {
  const { tenantId, user, activeCompany } = useAuth();
  const { getDocs, createDoc, updateDoc, deleteDoc } = useDb();
  const { success, error: toastError } = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"pinned" | "date" | "priority">("pinned");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReminderCategory>("task");
  const [priority, setPriority] = useState<ReminderPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [status, setStatus] = useState<ReminderStatus>("pending");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Load Reminders
  const loadReminders = async () => {
    setLoading(true);
    try {
      let data = (await getDocs("reminders")) as Reminder[];
      data = data || [];

      if (data.length === 0) {
        // Pre-seed demo reminders
        await Promise.all(INITIAL_REMINDERS.map(r => createDoc("reminders", r)));
        data = (await getDocs("reminders")) as Reminder[] || [];
      }

      setReminders(data);
    } catch (e: any) {
      console.error("Erro ao carregar lembretes:", e);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadReminders();
    }
  }, [tenantId]);

  // Open Create/Edit Modal
  const handleOpenModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingId(reminder.id);
      setTitle(reminder.title);
      setDescription(reminder.description || "");
      setCategory(reminder.category);
      setPriority(reminder.priority);
      setDueDate(reminder.dueDate || "");
      setDueTime(reminder.dueTime || "");
      setColor(reminder.color || COLOR_OPTIONS[0].value);
      setTags(reminder.tags || []);
      setResponsiblePerson(reminder.responsiblePerson || "");
      setStatus(reminder.status);
      setIsFavorite(!!reminder.isFavorite);
      setIsPinned(!!reminder.isPinned);
    } else {
      setEditingId(null);
      setTitle("");
      setDescription("");
      setCategory("task");
      setPriority("medium");
      setDueDate("");
      setDueTime("");
      setColor(COLOR_OPTIONS[0].value);
      setTags([]);
      setResponsiblePerson(user?.displayName || "Carol Ramos");
      setStatus("pending");
      setIsFavorite(false);
      setIsPinned(false);
    }
    setTagInput("");
    setModalOpen(true);
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Save Reminder
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toastError("Título Obrigatório", "Por favor informe um título para o lembrete.");
      return;
    }

    try {
      const payload = {
        title,
        description,
        category,
        priority,
        creationDate: new Date().toISOString().split("T")[0],
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        color,
        tags,
        responsiblePerson,
        status,
        isFavorite,
        isPinned,
        tenantId
      };

      if (editingId) {
        await updateDoc("reminders", editingId, { ...payload, updatedAt: new Date().toISOString() });
        success("Lembrete Atualizado", "As alterações foram salvas com sucesso.");
      } else {
        await createDoc("reminders", payload);
        success("Lembrete Criado", "Novo lembrete/ideia cadastrado com sucesso.");
      }

      setModalOpen(false);
      await loadReminders();
    } catch (e: any) {
      toastError("Erro ao salvar", e.message || "Não foi possível salvar o lembrete.");
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (reminder: Reminder) => {
    try {
      await updateDoc("reminders", reminder.id, { isFavorite: !reminder.isFavorite });
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, isFavorite: !r.isFavorite } : r));
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (reminder: Reminder) => {
    try {
      await updateDoc("reminders", reminder.id, { isPinned: !reminder.isPinned });
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, isPinned: !r.isPinned } : r));
    } catch (e) {
      console.error(e);
    }
  };

  // Duplicate Reminder
  const handleDuplicate = async (reminder: Reminder) => {
    try {
      const copyPayload = {
        ...reminder,
        title: `${reminder.title} (Cópia)`,
        creationDate: new Date().toISOString().split("T")[0],
      };
      delete (copyPayload as any).id;
      await createDoc("reminders", copyPayload);
      success("Lembrete Duplicado", "Uma cópia do lembrete foi criada.");
      await loadReminders();
    } catch (e: any) {
      toastError("Erro ao duplicar", e.message || "Erro ao criar cópia.");
    }
  };

  // Archive Reminder
  const handleArchive = async (reminder: Reminder) => {
    try {
      const newStatus = reminder.status === "archived" ? "pending" : "archived";
      await updateDoc("reminders", reminder.id, { status: newStatus });
      success("Status Alterado", newStatus === "archived" ? "Lembrete arquivado." : "Lembrete desarquivado.");
      await loadReminders();
    } catch (e: any) {
      toastError("Erro", e.message);
    }
  };

  // Delete Reminder
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o lembrete "${title}"?`)) return;
    try {
      await deleteDoc("reminders", id);
      success("Excluído", "Lembrete removido com sucesso.");
      await loadReminders();
    } catch (e: any) {
      toastError("Erro ao excluir", e.message);
    }
  };

  // Filter & Sort Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (r.tags && r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
      const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;

      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
    });
  }, [reminders, searchQuery, categoryFilter, priorityFilter, statusFilter]);

  const getPriorityBadge = (p: ReminderPriority) => {
    switch (p) {
      case "urgent": return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-300/40">Urgente</span>;
      case "high": return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300/40">Alta</span>;
      case "medium": return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-300/40">Média</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300/40">Baixa</span>;
    }
  };

  const getCategoryLabel = (c: ReminderCategory) => {
    switch (c) {
      case "idea": return "Ideia";
      case "task": return "Tarefa";
      case "reminder": return "Lembrete";
      case "meeting": return "Reunião";
      default: return "Outro";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Mural de <span className="font-semibold text-rosegold-500">Lembretes & Ideias</span></h1>
          <p className="text-xs text-muted-foreground">Registre insights, tarefas urgentes, notas de reuniões e lembretes da equipe.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Novo Lembrete / Ideia</span>
        </button>
      </div>

      {/* Bar: Search & Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar títulos, notas ou etiquetas..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Filters and View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">Todas Categorias</option>
            <option value="idea">Ideias</option>
            <option value="task">Tarefas</option>
            <option value="reminder">Lembretes</option>
            <option value="meeting">Reuniões</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">Todas Prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">Todos Status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluído</option>
            <option value="archived">Arquivado</option>
          </select>

          {/* Toggle View Mode */}
          <div className="flex border border-border bg-card rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "cards" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
              title="Modo Cards / Mural"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "list" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
              title="Modo Lista / Tabela"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Carregando lembretes e ideias...</div>
      ) : (
        <div>
          {/* VIEW MODE 1: CARDS */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReminders.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
                    r.color || "bg-card border-border text-foreground"
                  )}
                >
                  {/* Top Bar: Pin, Favorite, Category */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePin(r)}
                        className={cn(
                          "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                          r.isPinned ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground opacity-60 group-hover:opacity-100"
                        )}
                        title={r.isPinned ? "Desafixar" : "Fixar no topo"}
                      >
                        <Pin className={cn("h-4 w-4", r.isPinned && "fill-current")} />
                      </button>

                      <button
                        onClick={() => handleToggleFavorite(r)}
                        className={cn(
                          "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                          r.isFavorite ? "text-amber-500" : "text-muted-foreground opacity-60 group-hover:opacity-100"
                        )}
                        title={r.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                      >
                        <Star className={cn("h-4 w-4", r.isFavorite && "fill-current")} />
                      </button>

                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                        {getCategoryLabel(r.category)}
                      </span>
                    </div>

                    {getPriorityBadge(r.priority)}
                  </div>

                  {/* Body: Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold leading-snug">{r.title}</h3>
                    {r.description && (
                      <p className="text-xs opacity-90 leading-relaxed whitespace-pre-line">{r.description}</p>
                    )}
                  </div>

                  {/* Tags */}
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {r.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[9px] font-semibold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer Meta & Actions */}
                  <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] opacity-80">
                    <div className="space-y-0.5">
                      {r.dueDate && (
                        <div className="flex items-center gap-1 font-mono font-semibold">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(r.dueDate)} {r.dueTime ? `às ${r.dueTime}` : ""}</span>
                        </div>
                      )}
                      {r.responsiblePerson && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{r.responsiblePerson}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDuplicate(r)} title="Duplicar" className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleArchive(r)} title="Arquivar" className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleOpenModal(r)} title="Editar" className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r.id, r.title)} title="Excluir" className="p-1 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}

              {filteredReminders.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground space-y-3">
                  <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium">Nenhum lembrete ou ideia encontrado.</p>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: LIST / TABLE */}
          {viewMode === "list" && (
            <div className="border border-border bg-card/40 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Título / Descrição</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Prioridade</th>
                      <th className="p-4">Data Limite</th>
                      <th className="p-4">Responsável</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredReminders.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleFavorite(r)} className={cn("p-0.5", r.isFavorite ? "text-amber-500" : "text-muted-foreground")}>
                              <Star className={cn("h-3.5 w-3.5", r.isFavorite && "fill-current")} />
                            </button>
                            <div>
                              <p className="font-semibold text-foreground">{r.title}</p>
                              {r.description && <p className="text-[11px] text-muted-foreground truncate max-w-xs">{r.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 uppercase font-bold text-[10px] text-muted-foreground">{getCategoryLabel(r.category)}</td>
                        <td className="p-4">{getPriorityBadge(r.priority)}</td>
                        <td className="p-4 font-mono text-muted-foreground">{r.dueDate ? formatDate(r.dueDate) : "-"}</td>
                        <td className="p-4 text-muted-foreground">{r.responsiblePerson || "-"}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                            r.status === "completed" ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"
                          )}>
                            {r.status === "completed" ? "Concluído" : r.status === "in_progress" ? "Em Andamento" : r.status === "archived" ? "Arquivado" : "Pendente"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleDuplicate(r)} title="Duplicar" className="p-1.5 rounded-lg border border-border hover:bg-muted">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleOpenModal(r)} title="Editar" className="p-1.5 rounded-lg border border-border hover:bg-muted">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(r.id, r.title)} title="Excluir" className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Criar / Editar Lembrete */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                {editingId ? "Editar Lembrete / Ideia" : "Novo Lembrete / Ideia"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Título *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Criar campanha de Dia das Mães..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Descrição / Detalhes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escreva os detalhes ou anotações..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground"
                  >
                    <option value="task">Tarefa</option>
                    <option value="idea">Ideia</option>
                    <option value="reminder">Lembrete</option>
                    <option value="meeting">Reunião</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Data Limite</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Horário</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                  />
                </div>
              </div>

              {/* Color Choice */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Cor do Card / Post-it</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_OPTIONS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "p-2 rounded-xl border text-[10px] font-semibold flex items-center justify-between transition-all",
                        c.value,
                        color === c.value && "ring-2 ring-primary"
                      )}
                    >
                      <span>{c.name}</span>
                      {color === c.value && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Etiquetas / Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder="Adicionar tag e apertar Enter..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-card"
                  />
                  <button type="button" onClick={handleAddTag} className="px-3 py-2 rounded-xl bg-muted font-semibold hover:bg-muted/80">
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-md bg-muted text-[10px] font-semibold flex items-center gap-1">
                        #{t}
                        <button type="button" onClick={() => handleRemoveTag(t)} className="text-muted-foreground hover:text-destructive">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Responsável</label>
                  <input
                    type="text"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    placeholder="Carol Ramos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground"
                  >
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="completed">Concluído</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Fixar no topo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Marcar como favorito</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 shadow">
                  {editingId ? "Atualizar" : "Salvar Lembrete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
