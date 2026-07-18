"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/context/AuthContext";
import { Appointment } from "@/features/schedule/types";
import { AppointmentSchema } from "@/features/schedule/schemas";
import { Customer } from "@/features/customers/types";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  UserCheck,
  DollarSign,
  CheckCircle2,
  X,
  MessageSquare,
  Sparkles,
  Smartphone,
  Check,
  AlertCircle,
  Edit2,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Custom WhatsApp SVG Icon
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export default function SchedulePage() {
  const { createDoc, getDocs, updateDoc, deleteDoc } = useDb();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState(0);
  const [professionalName, setProfessionalName] = useState("Carol Ramos");
  const [dateTime, setDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [status, setStatus] = useState<'scheduled' | 'confirmed' | 'completed' | 'cancelled'>("scheduled");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // WhatsApp reminder preview state
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [whatsappSuccess, setWhatsappSuccess] = useState(false);

  // Load bookings
  const loadScheduleData = async () => {
    setLoading(true);
    try {
      const [appts, custs] = await Promise.all([
        getDocs("appointments"),
        getDocs("customers")
      ]);

      setCustomers(custs as Customer[]);

      // Seed mock appointments if empty
      if (appts.length === 0 && custs.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        const mockAppts = [
          {
            customerId: custs[0].id,
            customerName: custs[0].name,
            customerPhone: custs[0].phone,
            serviceName: "Maquiagem Social Express",
            price: 180.00,
            professionalName: "Carol Ramos",
            dateTime: `${todayStr}T16:00`,
            durationMinutes: 60,
            status: "confirmed" as const,
            notes: "Maquiagem para casamento à noite."
          },
          {
            customerId: custs[1]?.id || custs[0].id,
            customerName: custs[1]?.name || custs[0].name,
            customerPhone: custs[1]?.phone || custs[0].phone,
            serviceName: "Limpeza de Pele Hidratante",
            price: 150.00,
            professionalName: "Carol Ramos",
            dateTime: `${tomorrowStr}T10:00`,
            durationMinutes: 90,
            status: "scheduled" as const,
            notes: "Evitar produtos com ácidos agressivos."
          },
          {
            customerId: custs[0].id,
            customerName: custs[0].name,
            customerPhone: custs[0].phone,
            serviceName: "Design de Sobrancelhas",
            price: 60.00,
            professionalName: "Carol Ramos",
            dateTime: `${yesterdayStr}T14:00`,
            durationMinutes: 30,
            status: "completed" as const,
            notes: "Design com henna."
          }
        ];

        for (const app of mockAppts) {
          await createDoc("appointments", app);
        }
        
        const freshAppts = await getDocs("appointments");
        setAppointments(freshAppts as Appointment[]);
      } else {
        setAppointments(appts as Appointment[]);
      }
    } catch (e) {
      console.error("Erro ao carregar agenda:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, []);

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 is Sunday
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Check if dates are same day
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Get appointments for a specific day
  const getApptsForDay = (day: Date) => {
    return appointments.filter(a => {
      const apptDate = new Date(a.dateTime);
      return isSameDay(apptDate, day);
    });
  };

  // Form Handlers
  const handleNewAppointment = (day?: Date) => {
    setEditingId(null);
    setSelectedCustomerId(customers[0]?.id || "");
    setServiceName("");
    setPrice(0);
    setProfessionalName("Carol Ramos");

    const targetDate = day || selectedDate;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T14:00`;
    setDateTime(dateStr);
    
    setDurationMinutes(60);
    setStatus("scheduled");
    setNotes("");
    setErrors({});
    setDrawerOpen(true);
  };

  const handleEditAppointment = (appt: Appointment) => {
    setEditingId(appt.id);
    setSelectedCustomerId(appt.customerId || "");
    setServiceName(appt.serviceName || "");
    setPrice(appt.price || 0);
    setProfessionalName(appt.professionalName || "Carol Ramos");
    setDateTime(appt.dateTime || "");
    setDurationMinutes(appt.durationMinutes || 60);
    setStatus(appt.status || "scheduled");
    setNotes(appt.notes || "");
    setErrors({});
    setDrawerOpen(true);
  };

  const handleDeleteAppointment = async (id: string, customer: string) => {
    if (confirm(`Deseja cancelar o agendamento de "${customer}"?`)) {
      try {
        await deleteDoc("appointments", id);
        await loadScheduleData();
      } catch (err: any) {
        alert(err.message || "Erro ao deletar.");
      }
    }
  };

  // Faturar Agendamento ( POS Integration )
  const handleInvoiceAppointment = async (appt: Appointment) => {
    if (appt.status === "completed" && appt.saleId) {
      alert("Este agendamento já foi faturado!");
      return;
    }

    setLoading(true);

    try {
      // 1. Criar Venda correspondente ao serviço no POS
      const newSale = await createDoc("sales", {
        customerId: appt.customerId,
        items: [{
          productId: "servico-agendado",
          name: `Serviço: ${appt.serviceName} (${appt.professionalName})`,
          quantity: 1,
          unitPrice: appt.price,
          costPrice: 0,
          discount: 0
        }],
        subtotal: appt.price,
        discount: 0,
        total: appt.price,
        paymentMethod: "pix" as const, // Pix como padrão
        status: "completed" as const,
        channel: "pos" as const
      });

      // 2. Criar Transação Financeira de Entrada
      await createDoc("financial_transactions", {
        type: "revenue" as const,
        category: "sale" as const,
        amount: appt.price,
        description: `Serviço Faturado - Cliente: ${appt.customerName}`,
        paymentDate: new Date().toISOString().split("T")[0],
        status: "paid" as const,
        bankAccountId: "caixa-geral",
        referenceId: newSale.id
      });

      // 3. Atualizar status do agendamento para concluído e linkar a venda
      await updateDoc("appointments", appt.id, {
        status: "completed" as const,
        saleId: newSale.id
      });

      // 4. Incrementar métricas de gastos do cliente
      const client = customers.find(c => c.id === appt.customerId);
      if (client) {
        const updatedMetrics = {
          totalOrders: (client.metrics?.totalOrders || 0) + 1,
          totalSpent: (client.metrics?.totalSpent || 0) + appt.price,
          lastPurchaseDate: new Date().toISOString()
        };
        await updateDoc("customers", appt.customerId, { metrics: updatedMetrics });
      }

      alert(`Serviço faturado com sucesso! Venda registrada sob Ref #${newSale.id}`);
      await loadScheduleData();
    } catch (err: any) {
      alert(err.message || "Erro ao faturar agendamento.");
    } finally {
      setLoading(false);
    }
  };

  // Salvar Agendamento
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const client = customers.find(c => c.id === selectedCustomerId);
    if (!client) {
      alert("Selecione um cliente válido.");
      return;
    }

    const payload = {
      customerId: selectedCustomerId,
      serviceName,
      price,
      professionalName,
      dateTime,
      durationMinutes,
      status,
      notes: notes || undefined
    };

    // Validação Zod
    const result = AppointmentSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => errs[i.path.join(".")] = i.message);
      setErrors(errs);
      return;
    }

    try {
      const dbPayload = {
        ...payload,
        customerName: client.name,
        customerPhone: client.phone
      };

      if (editingId) {
        await updateDoc("appointments", editingId, dbPayload);
      } else {
        await createDoc("appointments", dbPayload);
      }

      setDrawerOpen(false);
      await loadScheduleData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar agendamento.");
    }
  };

  // Enviar Lembrete WhatsApp
  const handleOpenReminderModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setWhatsappSuccess(false);
    setReminderModalOpen(true);
  };

  const triggerWhatsAppReminder = async () => {
    if (!selectedAppt) return;
    setLoading(true);

    try {
      const datePart = new Date(selectedAppt.dateTime).toLocaleDateString();
      const timePart = new Date(selectedAppt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Registrar notificação enviada no banco
      await createDoc("notifications", {
        type: "whatsapp_reminder",
        customerId: selectedAppt.customerId,
        customerPhone: selectedAppt.customerPhone,
        message: `Lembrete agendamento enviado para ${selectedAppt.customerName}`,
        sentAt: new Date().toISOString()
      });

      setWhatsappSuccess(true);
    } catch (err: any) {
      alert(err.message || "Erro ao simular disparo de lembrete.");
    } finally {
      setLoading(false);
    }
  };

  // Geração da grade de dias do mês
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const gridDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  
  // Dias do mês anterior para preenchimento da primeira semana
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const daysInPrevMonth = getDaysInMonth(prevMonth);
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridDays.push({
      date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i),
      isCurrentMonth: false
    });
  }

  // Dias do mês atual
  for (let i = 1; i <= daysInMonth; i++) {
    gridDays.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
      isCurrentMonth: true
    });
  }

  // Dias do mês seguinte para completar a última semana
  const remaining = 42 - gridDays.length;
  for (let i = 1; i <= remaining; i++) {
    gridDays.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
      isCurrentMonth: false
    });
  }

  // Compromissos do dia selecionado
  const selectedDayAppts = appointments.filter(a => {
    const apptDate = new Date(a.dateTime);
    return isSameDay(apptDate, selectedDate);
  });

  const getStatusBadgeStyle = (stat: string, isOverdue: boolean) => {
    if (stat === "completed") return "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/50";
    if (stat === "cancelled") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50";
    if (stat === "confirmed") return "bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50";
    return isOverdue
      ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/50"
      : "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/50";
  };

  const getStatusLabel = (stat: string) => {
    switch (stat) {
      case "completed": return "Concluído";
      case "confirmed": return "Confirmado";
      case "cancelled": return "Cancelado";
      default: return "Agendado";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Agenda & <span className="font-semibold text-rosegold-500">Agendamentos</span></h1>
          <p className="text-xs text-muted-foreground">Reservas de atendimento estético, calendário integrado, faturamento no PDV e disparos WhatsApp.</p>
        </div>

        <button
          onClick={() => handleNewAppointment()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* 2. Grid de Visualização: Calendário (70%) + Painel Detalhe Dia (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendário */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card/40 flex flex-col justify-between h-fit select-none">
          
          {/* Header Calendário */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              <CalendarIcon className="h-4.5 w-4.5 text-rosegold-500" />
              <span>{monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}</span>
            </h3>
            
            <div className="flex items-center gap-2 text-xs font-semibold">
              <button onClick={handleGoToday} className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                Hoje
              </button>
              <div className="flex border border-border bg-card rounded-lg p-0.5">
                <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Grade de dias do mês */}
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((cell, idx) => {
              const appts = getApptsForDay(cell.date);
              const isSelected = isSameDay(cell.date, selectedDate);
              const isToday = isSameDay(cell.date, new Date());
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(cell.date)}
                  onDoubleClick={() => handleNewAppointment(cell.date)}
                  className={cn(
                    "p-1.5 rounded-xl border flex flex-col justify-between h-20 text-left transition-all relative overflow-hidden group",
                    isSelected 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-border/40 hover:border-primary/20 bg-card/25 hover:bg-card/75",
                    !cell.isCurrentMonth && "opacity-40"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-semibold h-5 w-5 rounded-full flex items-center justify-center font-mono",
                    isToday && "bg-rosegold-500 text-white font-bold",
                    isSelected && !isToday && "text-primary font-bold"
                  )}>
                    {cell.date.getDate()}
                  </span>
                  
                  {/* Badges de agendamento */}
                  <div className="space-y-0.5 w-full overflow-hidden mt-1.5">
                    {appts.slice(0, 2).map((appt) => (
                      <div
                        key={appt.id}
                        className={cn(
                          "px-1 py-0.2 rounded text-[8px] truncate leading-none border font-semibold",
                          appt.status === "completed" ? "bg-green-50 text-green-700 border-green-200/50" : 
                          appt.status === "cancelled" ? "bg-slate-50 text-slate-600 border-slate-200/50" :
                          "bg-rosegold-50 text-rosegold-700 border-rosegold-200/30"
                        )}
                      >
                        {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {appt.customerName.split(" ")[0]}
                      </div>
                    ))}
                    {appts.length > 2 && (
                      <div className="text-[7px] text-muted-foreground text-center font-semibold tracking-wider uppercase bg-muted rounded py-0.2 border border-border/50">
                        + {appts.length - 2} mais
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Painel lateral: Detalhe do Dia selecionado */}
        <div className="p-5 rounded-2xl border border-border bg-card/40 flex flex-col justify-between h-fit space-y-4">
          <div className="space-y-3.5">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Horários Agendados</span>
                <h3 className="text-xs font-semibold text-foreground">
                  {selectedDate.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground font-mono">
                {selectedDayAppts.length} reservas
              </span>
            </div>

            {/* Lista de compromissos do dia */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {selectedDayAppts.map((appt) => {
                const apptDate = new Date(appt.dateTime);
                const isOverdue = apptDate < new Date() && appt.status === "scheduled";
                return (
                  <div key={appt.id} className="p-3 rounded-xl border border-border bg-card/50 flex flex-col gap-2.5 text-xs hover:border-primary/20 transition-all">
                    
                    {/* Header Item */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{appt.customerName}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appt.durationMinutes} min)</span>
                        </div>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase shrink-0", getStatusBadgeStyle(appt.status, isOverdue))}>
                        {getStatusLabel(appt.status)}
                      </span>
                    </div>

                    {/* Detalhes do Serviço */}
                    <div className="flex items-center justify-between text-[11px] border-t border-b border-border/40 py-1.5">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground">Serviço</span>
                        <p className="font-medium text-foreground">{appt.serviceName}</p>
                      </div>
                      <div className="space-y-0.5 text-right font-mono">
                        <span className="text-muted-foreground">Valor</span>
                        <p className="font-bold text-foreground">R$ {appt.price.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Ações do agendamento */}
                    <div className="flex flex-wrap gap-1.5 items-center justify-between pt-1">
                      {/* Whatsapp reminder */}
                      <button
                        onClick={() => handleOpenReminderModal(appt)}
                        className="p-1.5 rounded bg-green-50 hover:bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200/40 hover:scale-105 transition-all"
                        title="Enviar Lembrete WhatsApp"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                      </button>

                      {/* Caixa/Faturamento */}
                      <div className="flex gap-1.5 ml-auto">
                        {appt.status !== "completed" && appt.status !== "cancelled" && (
                          <button
                            onClick={() => handleInvoiceAppointment(appt)}
                            className="px-2 py-1 rounded bg-rosegold-100 hover:bg-primary dark:bg-rosegold-900/50 dark:hover:bg-primary text-rosegold-700 dark:text-rosegold-300 hover:text-white font-bold text-[9px] uppercase tracking-wider border border-rosegold-200/50 transition-colors"
                          >
                            Faturar
                          </button>
                        )}
                        <button onClick={() => handleEditAppointment(appt)} className="p-1.5 rounded bg-muted hover:bg-border text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAppointment(appt.id, appt.customerName)} className="p-1.5 rounded bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

              {selectedDayAppts.length === 0 && (
                <div className="py-20 text-center text-muted-foreground select-none flex flex-col items-center gap-2">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/50 animate-pulse" />
                  <p className="italic text-[10px]">Nenhum compromisso marcado para este dia.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Slide-over Form Drawer (Cadastro / Edição Agendamento) */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <div className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <UserCheck className="h-4.5 w-4.5 text-rosegold-500" />
                <span>{editingId ? "Editar Horário" : "Novo Agendamento"}</span>
              </h3>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* Cliente */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Selecionar Cliente</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                >
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  {customers.length === 0 && <option value="">Sem clientes cadastrados</option>}
                </select>
                {errors.customerId && <p className="text-[10px] text-destructive mt-0.5">{errors.customerId}</p>}
              </div>

              {/* Nome do Serviço */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Serviço Prestado</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Maquiagem Social de Festa"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card"
                />
                {errors.serviceName && <p className="text-[10px] text-destructive mt-0.5">{errors.serviceName}</p>}
              </div>

              {/* Preço e Profissional */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Preço do Serviço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price || ""}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card font-mono"
                  />
                  {errors.price && <p className="text-[10px] text-destructive mt-0.5">{errors.price}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Profissional</label>
                  <input
                    type="text"
                    required
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                    placeholder="Ex: Carol Ramos"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card"
                  />
                  {errors.professionalName && <p className="text-[10px] text-destructive mt-0.5">{errors.professionalName}</p>}
                </div>
              </div>

              {/* Data/Hora e Duração */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Data & Horário</label>
                  <input
                    type="text"
                    required
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    placeholder="AAAA-MM-DDTHH:MM"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card font-mono"
                  />
                  {errors.dateTime && <p className="text-[10px] text-destructive mt-0.5">{errors.dateTime}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Duração (Minutos)</label>
                  <input
                    type="number"
                    required
                    value={durationMinutes || ""}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    placeholder="60"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card font-mono"
                  />
                  {errors.durationMinutes && <p className="text-[10px] text-destructive mt-0.5">{errors.durationMinutes}</p>}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Status da Reserva</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card text-foreground"
                >
                  <option value="scheduled">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Realizado / Faturado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Observações / Detalhes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Cliente tem alergia a maquiagem X, quer cílios postiços..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-card resize-none"
                />
              </div>

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
                  Salvar Horário
                </button>
              </div>

            </form>
          </div>
        </>
      )}

      {/* 4. MODAL: WHATSAPP REMINDER DISPARADOR SIMULADO */}
      {reminderModalOpen && selectedAppt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <WhatsAppIcon className="h-4.5 w-4.5 text-green-500" />
                <span>Simular Envio WhatsApp</span>
              </h3>
              <button
                onClick={() => setReminderModalOpen(false)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {whatsappSuccess ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/30 text-green-500 flex items-center justify-center animate-bounce">
                  <Check className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm">Disparado com Sucesso!</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Lembrete de compromisso enviado para o número de celular: <span className="font-mono font-semibold">{selectedAppt.customerPhone}</span>
                  </p>
                </div>
                <button
                  onClick={() => setReminderModalOpen(false)}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
                >
                  Voltar para Agenda
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[8px]">Modelo de Mensagem (Meta Cloud API Template)</span>
                  
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 font-mono text-[11px] leading-relaxed text-muted-foreground select-none">
                    Olá <span className="text-foreground font-bold">{selectedAppt.customerName}</span>! ✨<br/>
                    Confirmamos seu horário de <span className="text-foreground font-bold">{selectedAppt.serviceName}</span> em <span className="text-foreground font-bold">{new Date(selectedAppt.dateTime).toLocaleDateString()}</span> às <span className="text-foreground font-bold">{new Date(selectedAppt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> com a profissional <span className="text-foreground font-bold">{selectedAppt.professionalName}</span>.<br/>
                    Até breve! 💖
                  </div>
                </div>

                <div className="flex gap-3.5 pt-3 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setReminderModalOpen(false)}
                    className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={triggerWhatsAppReminder}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-1"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    <span>Disparar API</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
