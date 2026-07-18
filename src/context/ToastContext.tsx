"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "REMOVE":
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

interface ToastContextType {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  dismiss: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const toast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: "ADD", toast: { id, type, title, message, duration } });
    setTimeout(() => dispatch({ type: "REMOVE", id }), duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const success = useCallback((title: string, message?: string) => toast("success", title, message), [toast]);
  const error   = useCallback((title: string, message?: string) => toast("error", title, message), [toast]);
  const warning = useCallback((title: string, message?: string) => toast("warning", title, message), [toast]);
  const info    = useCallback((title: string, message?: string) => toast("info", title, message), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ——— Toast Container ———

const TOAST_CONFIG: Record<ToastType, { icon: React.ElementType; bar: string; bg: string; text: string }> = {
  success: { icon: CheckCircle2, bar: "bg-emerald-500",  bg: "bg-emerald-50 dark:bg-emerald-950/60",  text: "text-emerald-800 dark:text-emerald-200" },
  error:   { icon: AlertCircle,  bar: "bg-red-500",      bg: "bg-red-50 dark:bg-red-950/60",          text: "text-red-800 dark:text-red-200" },
  warning: { icon: AlertTriangle,bar: "bg-amber-500",    bg: "bg-amber-50 dark:bg-amber-950/60",      text: "text-amber-800 dark:text-amber-200" },
  info:    { icon: Info,         bar: "bg-blue-500",     bg: "bg-blue-50 dark:bg-blue-950/60",        text: "text-blue-800 dark:text-blue-200" },
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const conf = TOAST_CONFIG[t.type];
  const Icon = conf.icon;
  return (
    <div
      className={cn(
        "pointer-events-auto relative flex items-start gap-3 rounded-xl border border-border shadow-lg p-4 pr-10 overflow-hidden",
        "animate-in slide-in-from-right-full fade-in duration-300",
        conf.bg
      )}
    >
      {/* Colored left bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", conf.bar)} />
      <Icon className={cn("h-4.5 w-4.5 mt-0.5 shrink-0", conf.text)} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className={cn("text-xs font-semibold leading-none", conf.text)}>{t.title}</p>
        {t.message && <p className={cn("text-[11px] leading-relaxed opacity-80", conf.text)}>{t.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className={cn("absolute top-2 right-2 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors", conf.text)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
