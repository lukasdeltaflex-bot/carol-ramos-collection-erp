"use "client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, Download, Sparkles, X, Share, PlusSquare, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect if running standalone (already installed)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsAppInstalled(isStandalone);

    // 2. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 3. Online/Offline Listeners
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 4. Intercept Install Prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__pwaInstallPrompt = e;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Register Service Worker & Handle Updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("[PWA] Service Worker registrado com sucesso!");

        // Check for SW update
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setHasUpdate(true);
                setWaitingWorker(newWorker);
              }
            });
          }
        });
      }).catch((err) => console.error("[PWA] Erro ao registrar SW:", err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).__pwaInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
        setIsAppInstalled(true);
      }
    } else if (isIos && !isAppInstalled) {
      setShowIosGuide(true);
    } else {
      alert("Para instalar o Carol Ramos ERP:\n\n• No Chrome/Edge: Clique nos 3 pontos e selecione 'Instalar Carol Ramos ERP'.\n• No iPhone: Toque em Compartilhar e 'Adicionar à Tela de Início'.");
    }
  };

  const handleUpdateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Global Event Listener Trigger for any button with data-pwa-install */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              if (e.target && e.target.closest('[data-pwa-install="true"]')) {
                window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
              }
            });
          `
        }}
      />

      {/* Online / Offline Status Banners */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-amber-50 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-full duration-300">
          <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
          <span>Você está navegando em modo offline. Visualizando dados armazenados no cache local.</span>
        </div>
      )}

      {showOnlineToast && isOnline && (
        <div className="fixed top-3 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xl animate-in fade-in-50 slide-in-from-top-3 duration-300">
          <Wifi className="h-4 w-4 shrink-0" />
          <span>Conexão reestabelecida! O sistema está sincronizado.</span>
        </div>
      )}

      {/* Service Worker Update Available Notification */}
      {hasUpdate && (
        <div className="fixed bottom-6 right-6 z-50 bg-card/95 backdrop-blur-xl border border-primary/40 text-foreground p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-5 duration-300">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="text-xs font-bold text-foreground">Nova versão disponível!</div>
            <div className="text-[11px] text-muted-foreground">Atualização com melhorias de desempenho e novas correções.</div>
          </div>
          <button
            onClick={handleUpdateApp}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shrink-0"
          >
            Atualizar
          </button>
        </div>
      )}

      {/* Modal Guia de Instalação no iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Instalar no iPhone / iPad</h3>
                <p className="text-xs text-muted-foreground">Siga os 2 passos rápidos abaixo:</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground border-t border-border/40 pt-4">
              <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-xl border border-border/40">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">1</div>
                <div>Toque no botão <strong className="text-foreground flex items-center gap-1 inline-flex">Compartilhar <Share className="h-3.5 w-3.5 text-primary inline" /></strong> na barra inferior do Safari.</div>
              </div>

              <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-xl border border-border/40">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">2</div>
                <div>Role a lista e selecione <strong className="text-foreground flex items-center gap-1 inline-flex">Adicionar à Tela de Início <PlusSquare className="h-3.5 w-3.5 text-primary inline" /></strong>.</div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow"
            >
              Entendi!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
