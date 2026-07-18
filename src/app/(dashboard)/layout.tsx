"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Redireciona para o login se não estiver logado
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Loading Screen Premium
  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors duration-300">
        <div className="relative flex flex-col items-center gap-4">
          {/* Círculo animado */}
          <div className="h-16 w-16 rounded-full border-4 border-rosegold-200 border-t-rosegold-500 animate-spin" />
          
          {/* Logo do Centro */}
          <div className="absolute top-4 h-8 w-8 rounded-lg bg-gradient-to-tr from-rosegold-600 to-rosegold-400 flex items-center justify-center shadow-md">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>

          <div className="flex flex-col items-center mt-2">
            <span className="font-display font-medium text-base tracking-wide bg-gradient-to-r from-rosegold-600 to-foreground bg-clip-text text-transparent dark:from-rosegold-400">
              Carol Ramos Collection
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold mt-0.5">
              Carregando Ambiente Seguro...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isMobileOpen={mobileSidebarOpen}
        setIsMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Layout Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          sidebarOpen ? "md:pl-64" : "md:pl-16"
        )}
      >
        {/* Header Topbar */}
        <Header
          isMobileOpen={mobileSidebarOpen}
          setIsMobileOpen={setMobileSidebarOpen}
          sidebarOpen={sidebarOpen}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
