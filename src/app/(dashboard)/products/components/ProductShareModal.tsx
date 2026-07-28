"use client";

import React, { useState, useEffect } from "react";
import { Product } from "@/features/products/types";
import { ShareService } from "@/services/sharing/ShareService";
import { ShareTemplateService, SocialPlatform, TemplateData } from "@/services/sharing/ShareTemplateService";
import { useToast } from "@/context/ToastContext";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  Send,
  Camera,
  Globe,
  Pin,
  Sparkles,
  AlertTriangle,
  FileText,
  Link2,
  Tag,
  QrCode
} from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

interface ProductShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onShareComplete?: () => void;
}

export default function ProductShareModal({
  product,
  isOpen,
  onClose,
  onShareComplete,
}: ProductShareModalProps) {
  const { success, error, info } = useToast();

  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("whatsapp");
  const [customCaption, setCustomCaption] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCheckingLink, setIsCheckingLink] = useState<boolean>(false);
  const [isLinkHealthy, setIsLinkHealthy] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (product && isOpen) {
      // 1. Incrementar a métrica shareClicks quando a modal é aberta
      ShareService.incrementShareClick(product.id);

      // 2. Montar dados da oferta para o template
      const templateData: TemplateData = {
        title: product.name,
        originalPrice: product.costPrice ? product.costPrice * 1.4 : product.sellPrice * 1.2,
        currentPrice: product.promoPrice || product.sellPrice,
        promoPrice: product.promoPrice,
        discountPercentage: product.promoPrice ? Math.round(((product.sellPrice - product.promoPrice) / product.sellPrice) * 100) : 15,
        marketplace: product.marketplace || "Carol Ramos ERP",
        affiliateLink: product.affiliateLink || (typeof window !== "undefined" ? window.location.href : "https://carolramos.com.br"),
        description: product.description,
      };

      // 3. Health Check do Link
      setIsCheckingLink(true);
      ShareService.verifyLinkHealth(templateData.affiliateLink).then((healthy) => {
        setIsLinkHealthy(healthy);
        setIsCheckingLink(false);
      });

      // 4. Gerar post padrão
      const post = ShareTemplateService.buildPost(templateData, selectedPlatform);
      setCustomCaption(post);
    }
  }, [product, isOpen, selectedPlatform]);

  if (!isOpen || !product) return null;

  const templateData: TemplateData = {
    title: product.name,
    originalPrice: product.costPrice ? product.costPrice * 1.4 : product.sellPrice * 1.2,
    currentPrice: product.promoPrice || product.sellPrice,
    promoPrice: product.promoPrice,
    discountPercentage: product.promoPrice ? Math.round(((product.sellPrice - product.promoPrice) / product.sellPrice) * 100) : 15,
    marketplace: product.marketplace || "Carol Ramos ERP",
    affiliateLink: product.affiliateLink || (typeof window !== "undefined" ? window.location.href : "https://carolramos.com.br"),
    description: product.description,
  };

  const handlePlatformChange = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    const post = ShareTemplateService.buildPost(templateData, platform);
    setCustomCaption(post);
  };

  const handleExecuteShare = async (platform: SocialPlatform) => {
    setLoading(true);
    try {
      const res = await ShareService.dispatchShare(
        product.id,
        templateData,
        platform
      );

      if (res.success) {
        if (res.data?.copied) {
          setCopiedKey(platform);
          success("Copiado para a Área de Transferência! ✅", "Legenda pré-formatada pronta para colar.");
          setTimeout(() => setCopiedKey(null), 3000);
        } else {
          success("Compartilhamento Iniciado! 🚀", `Disparando via ${platform.replace("_", " ").toUpperCase()}.`);
        }

        if (onShareComplete) onShareComplete();
      } else {
        error("Erro ao Compartilhar", res.error || "Tente novamente.");
      }
    } catch (e: any) {
      error("Erro Inesperado", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNativeWebShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: customCaption,
          url: templateData.affiliateLink,
        });
        success("Enviado via Web Share Native! ✅", "Métricas registradas com sucesso.");
        if (onShareComplete) onShareComplete();
      } catch (e) {
        console.log("Web Share cancelado pelo usuário.");
      }
    } else {
      info("Web Share não Suportado", "Utilize um dos botões diretos de rede social.");
    }
  };

  const platformsList = [
    { id: "whatsapp" as SocialPlatform, name: "WhatsApp", color: "bg-emerald-500 hover:bg-emerald-600 text-white", icon: MessageSquare },
    { id: "whatsapp_business" as SocialPlatform, name: "WA Business", color: "bg-teal-600 hover:bg-teal-700 text-white", icon: MessageSquare },
    { id: "telegram" as SocialPlatform, name: "Telegram", color: "bg-sky-500 hover:bg-sky-600 text-white", icon: Send },
    { id: "instagram" as SocialPlatform, name: "Instagram", color: "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white", icon: Camera },
    { id: "facebook" as SocialPlatform, name: "Facebook", color: "bg-blue-600 hover:bg-blue-700 text-white", icon: Globe },
    { id: "twitter" as SocialPlatform, name: "X (Twitter)", color: "bg-slate-900 hover:bg-black text-white dark:bg-slate-800", icon: MessageCircle },
    { id: "threads" as SocialPlatform, name: "Threads", color: "bg-neutral-800 hover:bg-black text-white", icon: Sparkles },
    { id: "pinterest" as SocialPlatform, name: "Pinterest", color: "bg-red-600 hover:bg-red-700 text-white", icon: Pin },
  ];


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Compartilhamento Inteligente
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 rounded-full">
                  v4.0 Multi-canal
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Gere copys persuasivas e compartilhe instantaneamente em todas as redes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Health Check do Link */}
        {!isCheckingLink && !isLinkHealthy && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 flex items-center gap-3 text-red-500 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              ⚠️ <strong>Link Indisponível (LK-1008):</strong> O link de afiliado fornecido é inválido ou está quebrado. Verifique o cadastro antes de compartilhar.
            </span>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          
          {/* Card Resumo do Produto */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/40 border border-border">
            <img
              src={product.images?.[0]?.url || "https://images.unsplash.com/photo-1541643600914-78b084683601?w=150"}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border"
            />
            <div className="min-w-0 flex-1">
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-primary/10 text-primary tracking-wider">
                {product.marketplace || "Loja Própria"}
              </span>
              <h3 className="text-sm font-bold text-foreground truncate mt-1">{product.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="font-bold text-foreground font-mono">
                  {formatCurrency(product.promoPrice || product.sellPrice)}
                </span>
                {product.promoPrice && (
                  <span className="text-muted-foreground line-through text-[11px] font-mono">
                    {formatCurrency(product.sellPrice)}
                  </span>
                )}
                <span className="text-emerald-500 font-semibold text-[11px]">
                  Comissão: {product.commissionRate || 10}%
                </span>
              </div>
            </div>
          </div>

          {/* Seleção de Plataformas */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
              1. Selecione a Rede Social
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {platformsList.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePlatformChange(p.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-accent text-foreground"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg text-white shrink-0", p.color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview & Edição da Legenda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                2. Preview & Legenda Personalizada
              </label>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {isEditing ? "Concluir Edição" : "Editar Texto"}
              </button>
            </div>

            {isEditing ? (
              <textarea
                value={customCaption}
                onChange={(e) => setCustomCaption(e.target.value)}
                rows={6}
                className="w-full p-3.5 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
              />
            ) : (
              <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed max-h-48 overflow-y-auto select-all">
                {customCaption}
              </div>
            )}
          </div>

          {/* Ações Rápidas de Cópia */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              3. Ações Rápidas de Cópia
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => handleExecuteShare("copy_text")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium transition-all"
              >
                {copiedKey === "copy_text" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copiar Texto da Oferta
              </button>

              <button
                onClick={() => handleExecuteShare("copy_link")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium transition-all"
              >
                {copiedKey === "copy_link" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
                Copiar Link de Afiliado
              </button>

              <button
                onClick={() => handleExecuteShare("copy_hashtags")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium transition-all"
              >
                {copiedKey === "copy_hashtags" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Tag className="w-3.5 h-3.5" />}
                Copiar Hashtags
              </button>

              {typeof navigator !== "undefined" && (navigator as any).share && (
                <button
                  onClick={handleNativeWebShare}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-500/20 transition-all ml-auto"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartilhar Nativamente
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            📊 O envio atualizará o contador de envios e o histórico da oferta automaticamente.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-accent text-foreground transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleExecuteShare(selectedPlatform)}
              disabled={loading || !isLinkHealthy}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Disparar {selectedPlatform.replace("_", " ").toUpperCase()}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
