"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "./providers";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sun, 
  Moon, 
  AlertCircle,
  Building2,
  UserCheck,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  const { user, login, signUp, resetPassword, loginWithGoogle, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    setResetSuccess(false);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Erro ao realizar login.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    setResetSuccess(false);

    try {
      await signUp(email, password, displayName, companyName);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Erro ao criar nova conta.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    setResetSuccess(false);

    if (!email || !email.trim()) {
      setError("Por favor, digite seu e-mail no campo abaixo para solicitar a redefinição de senha.");
      return;
    }

    setAuthLoading(true);
    try {
      await resetPassword(email);
      setResetSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar e-mail de redefinição de senha.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setError("");

    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Erro ao realizar login com o Google.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
      
      {/* Botão de alternar tema no topo direito */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 p-2 rounded-full border border-border bg-card hover:bg-muted transition-colors z-50 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Alternar Tema"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-rosegold-400" />
        ) : (
          <Moon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Lado Esquerdo - Branding & Estilo Premium */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 bg-gradient-to-br from-card to-background border-r border-border md:max-w-2xl relative overflow-hidden select-none">
        {/* Padrão de Fundo Rose Gold */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rosegold-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rosegold-300/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Topo do Branding */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rosegold-600 to-rosegold-400 flex items-center justify-center shadow-lg shadow-rosegold-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-wide bg-gradient-to-r from-rosegold-600 to-foreground bg-clip-text text-transparent dark:from-rosegold-400">
            Carol Ramos Collection
          </span>
        </div>

        {/* Centro - Mensagem */}
        <div className="my-auto py-12 md:py-24 relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rosegold-100 text-rosegold-700 dark:bg-rosegold-900/30 dark:text-rosegold-300 mb-6 border border-rosegold-200/50 dark:border-rosegold-800/30">
            SaaS ERP Multi-Tenant
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight leading-[1.1] mb-6">
            Gestão elegante. <br />
            <span className="font-medium bg-gradient-to-r from-rosegold-500 to-rosegold-600 bg-clip-text text-transparent dark:from-rosegold-300 dark:to-rosegold-400">
              Decisões inteligentes.
            </span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Desenvolvido sob medida para controle multicanal de estoque, financeiro completo,
            e assistente comercial alimentado por Inteligência Artificial.
          </p>
        </div>

        {/* Rodapé do Branding */}
        <div className="relative z-10 text-xs text-muted-foreground flex items-center justify-between">
          <span>© 2026 Carol Ramos Collection.</span>
          <a href="#" className="hover:underline hover:text-foreground transition-colors">
            Termos de Uso
          </a>
        </div>
      </div>

      {/* Lado Direito - Painel de Autenticação */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 bg-background relative">
        <div className="w-full max-w-md space-y-6">
          
          {/* Abas Alternadoras: Login vs Criar Conta */}
          <div className="flex border border-border bg-card/60 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === "login"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("signup"); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === "signup"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-display font-light tracking-tight">
              {authMode === "login" ? "Acesse o sistema" : "Cadastre sua empresa"}
            </h2>
            <p className="text-muted-foreground text-xs">
              {authMode === "login"
                ? "Insira seus dados para acessar o painel administrativo."
                : "Crie sua conta para gerenciar produtos, kits e vendas."}
            </p>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleSignUp} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.</span>
              </div>
            )}

            {/* Se for formulário de Cadastro (Criar Nova Conta) */}
            {authMode === "signup" && (
              <>
                {/* Nome Completo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Seu Nome Completo *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <UserCheck className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Carol Ramos"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>

                {/* Nome da Empresa */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Nome da Sua Empresa / Loja *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Carol Ramos Collection"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Campo E-mail */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                E-mail *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@carolramos.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Senha *
                </label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[11px] font-semibold text-rosegold-500 hover:text-rosegold-600 dark:text-rosegold-400 hover:underline cursor-pointer"
                  >
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Botão Entrar ou Criar Conta */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-md cursor-pointer"
            >
              <span>
                {authLoading
                  ? "Processando..."
                  : authMode === "login"
                  ? "Entrar no Painel"
                  : "Criar Conta e Começar"}
              </span>
              {!authLoading && <ArrowRight className="h-4 w-4" />}
            </button>

            {/* Separador */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-3 text-muted-foreground tracking-wider font-bold">Ou continue com</span>
              </div>
            </div>

            {/* Botão SSO Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-border bg-card text-foreground font-semibold text-xs rounded-xl hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>{authLoading ? "Carregando..." : "Acessar com o Google"}</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
