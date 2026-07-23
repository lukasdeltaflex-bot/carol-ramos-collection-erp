"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDb } from "@/hooks/useDb";
import { useToast } from "@/context/ToastContext";
import { cn, formatDate } from "@/lib/utils";
import {
  Bell,
  Mail,
  Settings,
  FileText,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  DollarSign,
  Package,
  Calendar,
  Users,
  ShieldAlert,
  Save,
  Send,
  Plus,
  X,
  Sparkles,
  Server,
  Key,
  Globe,
  User,
  Clock
} from "lucide-react";
import { SystemNotification, NotificationSettings, EmailTemplate, NotificationCategory } from "@/features/notifications/types";

const INITIAL_TEMPLATES: Partial<EmailTemplate>[] = [
  {
    category: "financial",
    name: "Alerta de Contas a Pagar Próximas do Vencimento",
    subject: "Aviso de Vencimento: Conta {numero_conta} no valor de {valor}",
    body: "Olá, {usuario_responsavel}.\n\nLembramos que a conta {numero_conta} referente a {empresa} no valor de {valor} vence em {data}.\n\nPor favor, acesse o ERP Carol Ramos Collection para realizar a liquidação.",
    variables: ["{nome_cliente}", "{empresa}", "{valor}", "{data}", "{numero_conta}", "{usuario_responsavel}"]
  },
  {
    category: "stock",
    name: "Alerta de Estoque Baixo de Produto",
    subject: "Atenção: Produto {produto} atingiu a quantidade mínima",
    body: "Olá equipe de compras.\n\nO produto {produto} da empresa {empresa} atingiu o limite mínimo de estoque em {data}.\n\nAcesse o módulo de Produtos & Estoque para emitir uma nova Ordem de Compra.",
    variables: ["{produto}", "{empresa}", "{data}"]
  },
  {
    category: "customer",
    name: "Mensagem de Aniversário de Cliente",
    subject: "Parabéns, {nome_cliente}! Uma surpresa especial da {empresa}",
    body: "Prezado(a) {nome_cliente},\n\nDesejamos a você um feliz aniversário! Em comemoração a este dia especial, preparamos um cupom de desconto exclusivo para sua próxima compra na {empresa}.\n\nAtenciosamente,\nEquipe {empresa}",
    variables: ["{nome_cliente}", "{empresa}", "{data}"]
  },
  {
    category: "schedule",
    name: "Lembrete de Compromisso do Dia",
    subject: "Compromisso Hoje na Agenda: {data}",
    body: "Olá {usuario_responsavel},\n\nLembrete de compromisso agendado para hoje ({data}) referente à empresa {empresa}.\n\nConfira os detalhes na sua agenda.",
    variables: ["{usuario_responsavel}", "{empresa}", "{data}"]
  }
];

export default function NotificationsPage() {
  const { tenantId, user, activeCompany } = useAuth();
  const { getDocs, createDoc, updateDoc, deleteDoc, invalidateCache } = useDb();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"notifications" | "settings" | "templates">("notifications");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Internal Notifications List
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");

  const defaultSettings: NotificationSettings = {
    tenantId: tenantId || "",
    smtpHost: "smtp.sendgrid.net",
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: "apikey",
    smtpPass: "••••••••••••••••",
    fromEmail: "notificacoes@carolramos.com.br",
    fromName: "Carol Ramos Collection ERP",
    replyTo: "contato@carolramos.com.br",
    sendTime: "08:00",
    frequency: "daily",
    signature: "Carol Ramos Collection ERP - Gestão Inteligente",
    activeCategories: {
      financialPayables: true,
      financialOverduePayables: true,
      financialReceivables: true,
      financialOverdueReceivables: true,
      scheduleDaily: true,
      scheduleUpcoming: true,
      scheduleMeetings: true,
      customerBirthdays: true,
      customerPostSale: false,
      stockLow: true,
      stockOut: true,
      systemBackups: true,
      systemNewUser: true,
      systemCriticalErrors: true,
    },
    recipients: {
      admin: true,
      manager: true,
      financial: true,
      commercial: false,
      customEmails: ["financeiro@carolramos.com.br", "diretoria@carolramos.com.br"]
    }
  };

  // Settings State
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  const [customEmailInput, setCustomEmailInput] = useState("");

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Load Data
  const loadData = async () => {
    console.log("[Notifications Page] Executando loadData()...");
    setLoading(true);
    try {
      let [notifs, sets, tmpls] = await Promise.all([
        getDocs("system_notifications"),
        getDocs("notification_settings"),
        getDocs("email_templates")
      ]);
      console.log("[Notifications Page] getDocs('system_notifications') retornou:", notifs);

      const rawNotifs = (notifs as any[]) || [];
      console.log("[Notifications Page] rawNotifs array:", rawNotifs);
      console.log("[Notifications Page] Array.isArray(rawNotifs):", Array.isArray(rawNotifs));

      const cleanNotifs: SystemNotification[] = rawNotifs.filter(Boolean).map((n, idx) => {
        console.log("[Notifications Page] Processing notification item:", n);
        if (!n) return null;

        let createdAtIso = new Date().toISOString();
        if (n.createdAt) {
          if (typeof n.createdAt === "string") createdAtIso = n.createdAt;
          else if (typeof n.createdAt.toDate === "function") createdAtIso = n.createdAt.toDate().toISOString();
          else if (typeof n.createdAt.seconds === "number") createdAtIso = new Date(n.createdAt.seconds * 1000).toISOString();
          else if (n.createdAt instanceof Date) createdAtIso = n.createdAt.toISOString();
        }

        return {
          ...n,
          id: n.id || `notif-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          title: typeof n.title === "string" ? n.title : "Notificação",
          description: typeof n.description === "string" ? n.description : (typeof n.message === "string" ? n.message : (typeof n.desc === "string" ? n.desc : "")),
          message: typeof n.message === "string" ? n.message : (typeof n.description === "string" ? n.description : (typeof n.desc === "string" ? n.desc : "")),
          category: n.category || n.type || "system",
          priority: n.priority || "medium",
          read: Boolean(n.read),
          createdAt: createdAtIso
        };
      }).filter(Boolean) as SystemNotification[];

      console.log("[Notifications Page] Notificações limpas:", cleanNotifs);
      setNotifications(cleanNotifs);

      const loadedSets = (sets as NotificationSettings[]) || [];
      if (loadedSets.length > 0) {
        const loaded = loadedSets[0];
        setSettings({
          ...defaultSettings,
          ...(loaded || {}),
          activeCategories: {
            ...defaultSettings.activeCategories,
            ...((loaded && loaded.activeCategories) || {})
          },
          recipients: {
            ...defaultSettings.recipients,
            ...((loaded && loaded.recipients) || {}),
            customEmails: Array.isArray(loaded?.recipients?.customEmails)
              ? loaded.recipients.customEmails
              : defaultSettings.recipients.customEmails
          }
        });
      }

      let loadedTmpls = (tmpls as EmailTemplate[]) || [];
      if (loadedTmpls.length === 0) {
        // Pre-seed templates
        await Promise.all(INITIAL_TEMPLATES.map(t => createDoc("email_templates", t)));
        loadedTmpls = (await getDocs("email_templates") as EmailTemplate[]) || [];
      }

      setTemplates(loadedTmpls);
      if (loadedTmpls.length > 0) {
        setSelectedTemplate(loadedTmpls[0]);
      }
    } catch (e: any) {
      console.error("[Notifications Page] EXCEÇÃO EM loadData():", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Mark single read
  const handleMarkAsRead = async (id: string) => {
    if (!id) return;
    try {
      await updateDoc("system_notifications", id, { read: true, readAt: new Date().toISOString() });
      invalidateCache("system_notifications");
      setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => n && n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
    } catch (e) {
      console.error("Erro ao marcar notificação como lida:", e);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      const list = Array.isArray(notifications) ? notifications : [];
      const unreadList = list.filter(n => n && n.id && !n.read);
      if (unreadList.length === 0) {
        success("Tudo em dia!", "Todas as notificações já estão marcadas como lidas.");
        return;
      }
      await Promise.all(unreadList.map(n => updateDoc("system_notifications", n.id, { read: true, readAt: new Date().toISOString() })));
      invalidateCache("system_notifications");
      setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => n && n.id ? ({ ...n, read: true, readAt: new Date().toISOString() }) : n));
      success("Notificações Atualizadas", "Todas as notificações foram marcadas como lidas com sucesso.");
    } catch (e: any) {
      toastError("Erro ao atualizar", e?.message || "Erro ao marcar todas como lidas.");
    }
  };

  // Delete notification
  const handleDeleteNotif = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc("system_notifications", id);
      invalidateCache("system_notifications");
      setNotifications(prev => (Array.isArray(prev) ? prev : []).filter(n => n && n.id !== id));
      success("Notificação excluída", "A notificação foi removida com sucesso.");
    } catch (e: any) {
      toastError("Erro ao excluir", e?.message || "Erro ao excluir notificação.");
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if ((settings as any).id) {
        await updateDoc("notification_settings", (settings as any).id, { ...settings, updatedAt: new Date().toISOString() });
      } else {
        await createDoc("notification_settings", settings);
      }
      success("Configurações Salvas", "Servidor SMTP e preferências de e-mail atualizados.");
    } catch (e: any) {
      toastError("Erro ao salvar", e.message);
    } finally {
      setSaving(false);
    }
  };

  // Add custom email recipient
  const handleAddCustomEmail = () => {
    if (customEmailInput.trim() && customEmailInput.includes("@")) {
      const updated = [...settings.recipients.customEmails, customEmailInput.trim()];
      setSettings({
        ...settings,
        recipients: { ...settings.recipients, customEmails: updated }
      });
      setCustomEmailInput("");
    }
  };

  // Remove custom email
  const handleRemoveCustomEmail = (email: string) => {
    setSettings({
      ...settings,
      recipients: {
        ...settings.recipients,
        customEmails: settings.recipients.customEmails.filter(e => e !== email)
      }
    });
  };

  // Save Template
  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !selectedTemplate.id) return;
    setSaving(true);
    try {
      await updateDoc("email_templates", selectedTemplate.id, {
        subject: selectedTemplate.subject,
        body: selectedTemplate.body,
        updatedAt: new Date().toISOString()
      });
      success("Modelo Salvo", `O modelo "${selectedTemplate.name}" foi atualizado.`);
      await loadData();
    } catch (e: any) {
      toastError("Erro ao salvar modelo", e.message);
    } finally {
      setSaving(false);
    }
  };

  // Insert Variable into Template
  const handleInsertVariable = (varName: string) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      body: selectedTemplate.body + " " + varName
    });
  };

  // Filtered Notifications List
  const filteredNotifications = useMemo(() => {
    console.log("[Notifications Page] Filtrando notificações. Total:", notifications.length);
    try {
      const list = Array.isArray(notifications) ? notifications : [];
      const query = (searchQuery || "").trim().toLowerCase();
      return list.filter(n => {
        if (!n) return false;
        const titleStr = typeof n.title === "string" ? n.title.toLowerCase() : "";
        const descStr = typeof n.description === "string" ? n.description.toLowerCase() : (typeof n.message === "string" ? n.message.toLowerCase() : "");
        const matchesSearch = !query || titleStr.includes(query) || descStr.includes(query);
        const matchesCat = catFilter === "all" || n.category === catFilter;
        return matchesSearch && matchesCat;
      });
    } catch (err) {
      console.error("[Notifications Page] EXCEÇÃO NO FILTRO useMemo:", err);
      return [];
    }
  }, [notifications, searchQuery, catFilter]);

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case "financial": return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case "stock": return <Package className="h-4 w-4 text-amber-500" />;
      case "schedule": return <Calendar className="h-4 w-4 text-blue-500" />;
      case "customer": return <Users className="h-4 w-4 text-rose-500" />;
      default: return <ShieldAlert className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Central de <span className="font-semibold text-rosegold-500">Notificações & E-mails</span></h1>
          <p className="text-xs text-muted-foreground">Alertas internos no ERP, configurações de SMTP e modelos de e-mails automáticos.</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border border-border bg-card/40 rounded-xl p-1 overflow-x-auto scrollbar-none">
        {[
          { id: "notifications", label: "Central de Notificações Internas", icon: Bell },
          { id: "settings", label: "Servidor SMTP & Destinatários", icon: Settings },
          { id: "templates", label: "Modelos de E-mail (Templates)", icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CENTRAL DE NOTIFICAÇÕES INTERNAS */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar notificações..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="all">Todas Categorias</option>
                <option value="financial">Financeiro</option>
                <option value="stock">Estoque</option>
                <option value="schedule">Agenda</option>
                <option value="customer">Clientes</option>
                <option value="system">Sistema</option>
              </select>

              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold transition-all shrink-0"
              >
                <CheckCheck className="h-4 w-4 text-emerald-500" />
                <span>Marcar Todas Lidas</span>
              </button>
            </div>
          </div>

          <div className="border border-border bg-card/40 rounded-2xl overflow-hidden divide-y divide-border/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs font-medium">Nenhuma notificação encontrada no momento.</p>
              </div>
            ) : (
              filteredNotifications.map((notif, index) => {
                if (!notif) return null;
                const notifId = notif.id || `notif-${index}`;
                const title = notif.title || "Notificação";
                const desc = notif.description || notif.message || notif.desc || "";
                const cat = notif.category || "system";
                const isUnread = Boolean(!notif.read);
                return (
                  <div
                    key={notifId}
                    className={cn(
                      "p-4 flex items-start gap-4 transition-colors",
                      isUnread ? "bg-primary/5 font-medium" : "hover:bg-muted/10 opacity-85"
                    )}
                  >
                    <div className="p-2 rounded-xl border border-border bg-card shrink-0 mt-0.5">
                      {getCategoryIcon(cat as NotificationCategory)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">{formatDate(notif.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isUnread && (
                        <button
                          onClick={() => handleMarkAsRead(notifId)}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          title="Marcar como lida"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotif(notifId)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                        title="Excluir notificação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURAÇÕES DE SMTP & ENVIOS DE E-MAIL */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Servidor SMTP */}
          <div className="p-6 rounded-2xl border border-border bg-card/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Server className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Servidor SMTP de Envio de E-mails</h3>
                <p className="text-xs text-muted-foreground">Configuração da conta remetente (SendGrid, Resend, Mailgun ou Gmail SMTP).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Servidor SMTP (Host)</label>
                <input
                  type="text"
                  required
                  value={settings.smtpHost}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  placeholder="smtp.sendgrid.net"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Porta</label>
                <input
                  type="number"
                  required
                  value={settings.smtpPort}
                  onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                  placeholder="587"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Autenticação / SSL</label>
                <select
                  value={settings.smtpSecure ? "true" : "false"}
                  onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.value === "true" })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground"
                >
                  <option value="true">SSL / TLS (Porta 465 / 587)</option>
                  <option value="false">Sem Criptografia (Porta 25)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Usuário SMTP</label>
                <input
                  type="text"
                  required
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  placeholder="apikey ou email@dominio.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Senha / Chave de API</label>
                <input
                  type="password"
                  required
                  value={settings.smtpPass}
                  onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome do Remetente</label>
                <input
                  type="text"
                  required
                  value={settings.fromName}
                  onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                  placeholder="Carol Ramos Collection ERP"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">E-mail do Remetente</label>
                <input
                  type="email"
                  required
                  value={settings.fromEmail}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                  placeholder="notificacoes@carolramos.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">E-mail de Resposta (Reply-To)</label>
                <input
                  type="email"
                  value={settings.replyTo || ""}
                  onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                  placeholder="contato@carolramos.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono"
                />
              </div>
            </div>
          </div>

          {/* Categorias de Notificação Ativas */}
          <div className="p-6 rounded-2xl border border-border bg-card/40 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">Ativação Individual por Categoria de Alerta</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { key: "financialPayables", label: "Contas a Pagar Próximas do Vencimento" },
                { key: "financialOverduePayables", label: "Contas a Pagar em Atraso / Vencidas" },
                { key: "financialReceivables", label: "Contas a Receber Próximas do Vencimento" },
                { key: "financialOverdueReceivables", label: "Contas a Receber em Atraso" },
                { key: "scheduleDaily", label: "Compromissos do Dia" },
                { key: "scheduleUpcoming", label: "Eventos Futuros na Agenda" },
                { key: "customerBirthdays", label: "Aniversários de Clientes" },
                { key: "stockLow", label: "Produtos com Estoque Baixo" },
                { key: "stockOut", label: "Produtos Esgotados / Sem Estoque" },
                { key: "systemBackups", label: "Relatórios & Backups do Sistema" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:border-primary/30 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={!!(settings?.activeCategories && (settings.activeCategories as any)[item.key])}
                    onChange={(e) => setSettings({
                      ...settings,
                      activeCategories: {
                        ...(settings?.activeCategories || {}),
                        [item.key]: e.target.checked
                      }
                    })}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-semibold text-foreground">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Destinatários */}
          <div className="p-6 rounded-2xl border border-border bg-card/40 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">Destinatários dos E-mails de Alerta</h3>

            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "admin", label: "Administradores do ERP" },
                  { key: "manager", label: "Gerentes de Loja" },
                  { key: "financial", label: "Equipe Financeira" },
                  { key: "commercial", label: "Equipe Comercial" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(settings?.recipients && (settings.recipients as any)[item.key])}
                      onChange={(e) => setSettings({
                        ...settings,
                        recipients: {
                          ...(settings?.recipients || { customEmails: [] }),
                          [item.key]: e.target.checked
                        }
                      })}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-medium text-foreground">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">E-mails Externos Adicionais</label>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="email"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    placeholder="novo.email@empresa.com.br"
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-card font-mono"
                  />
                  <button type="button" onClick={handleAddCustomEmail} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(settings?.recipients?.customEmails || []).map((email, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-muted border border-border font-mono text-[10px] flex items-center gap-1.5">
                      {email}
                      <button type="button" onClick={() => handleRemoveCustomEmail(email)} className="text-muted-foreground hover:text-destructive">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 shadow-md shadow-primary/10 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Salvar Configurações de Envio</span>
            </button>
          </div>

        </form>
      )}

      {/* TAB 3: MODELOS DE E-MAIL (TEMPLATES) */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Templates */}
          <div className="border border-border bg-card/40 rounded-2xl p-4 space-y-2 h-fit">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Modelos Cadastrados</h3>
            <div className="space-y-1.5">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all text-xs",
                    selectedTemplate?.id === tmpl.id
                      ? "border-primary bg-primary/10 font-bold"
                      : "border-border hover:border-primary/30 bg-card/50"
                  )}
                >
                  <p className="text-foreground">{tmpl.name}</p>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">{tmpl.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-2 border border-border bg-card/40 rounded-2xl p-6 space-y-4">
            {selectedTemplate ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-bold text-foreground">{selectedTemplate.name}</h3>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 shadow"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Salvar Modelo</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Assunto do E-mail (Subject)</label>
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Variáveis Disponíveis para Inserção</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.variables?.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        className="px-2 py-1 rounded-md bg-muted hover:bg-primary/20 hover:text-primary border border-border text-[10px] font-mono transition-colors"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Corpo da Mensagem do E-mail</label>
                  <textarea
                    rows={10}
                    value={selectedTemplate.body}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card font-mono text-xs leading-relaxed resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">Selecione um modelo para editar.</div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
