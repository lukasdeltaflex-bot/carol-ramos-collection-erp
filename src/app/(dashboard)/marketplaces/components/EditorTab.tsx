"use client";

import React, { useState } from "react";
import { Edit3, RefreshCw, CheckCircle, AlertTriangle, ArrowRight, Image, Upload } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { MarketplaceChannel } from "@/features/integrations/types/marketplaces";
import { cn } from "@/lib/utils";

interface ValidationError {
  field: string;
  message: string;
}

export default function EditorTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    price: 0,
    promoPrice: 0,
    stock: 0,
    weight: 0,
    height: 0,
    width: 0,
    length: 0,
    ncm: "",
    gtin: "",
    warranty: "12 meses",
    condition: "new" as "new" | "used",
    channel: "shopee" as MarketplaceChannel,
    productId: "",
  });

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors([]);
    setSuccess(false);

    // Client-side validation
    const errors: ValidationError[] = [];
    if (!form.title || form.title.trim().length < 5) errors.push({ field: "title", message: "Título deve ter ao menos 5 caracteres." });
    if (form.price <= 0) errors.push({ field: "price", message: "Preço deve ser maior que zero." });
    if (!form.category.trim()) errors.push({ field: "category", message: "Categoria é obrigatória." });
    if (form.channel === "mercado_libre" && !form.gtin) errors.push({ field: "gtin", message: "GTIN/EAN obrigatório para Mercado Livre." });

    if (errors.length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // Aqui integraria com publishOrUpdateAdAction, mas para a demo:
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSuccess(true);
      toastSuccess("Anúncio publicado!", `O anúncio "${form.title}" foi enviado para publicação em ${form.channel}.`);
    } catch (e: any) {
      toastError("Erro ao publicar", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <Edit3 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Editor de Anúncios</h2>
          <p className="text-sm text-muted-foreground">
            Crie e publique anúncios validados conforme as regras de cada canal
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-500">Anúncio enviado para publicação!</p>
            <p className="text-sm text-muted-foreground">Ele será sincronizado com o canal em instantes.</p>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="font-semibold text-red-500">Corrija os erros antes de publicar:</p>
          </div>
          <ul className="space-y-1">
            {validationErrors.map((e, idx) => (
              <li key={idx} className="text-sm text-red-400 flex gap-2">
                <ArrowRight className="w-3 h-3 shrink-0 mt-1" /> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Informações Básicas */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <h3 className="font-bold border-b border-border pb-3">Informações do Produto</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Canal de Publicação *</label>
                <select
                  value={form.channel}
                  onChange={(e) => handleChange("channel", e.target.value)}
                  className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="shopee">Shopee</option>
                  <option value="mercado_libre">Mercado Livre</option>
                  <option value="amazon">Amazon</option>
                  <option value="tiktok_shop">TikTok Shop</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">ID Produto ERP</label>
                <input
                  type="text"
                  value={form.productId}
                  onChange={(e) => handleChange("productId", e.target.value)}
                  placeholder="ID do produto no ERP..."
                  className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Título do Anúncio *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Título do anúncio no marketplace (min. 5 caracteres)..."
                className={cn(
                  "w-full bg-background rounded-xl border p-3 text-sm focus:border-primary focus:outline-none",
                  validationErrors.find(e => e.field === "title") ? "border-red-500" : "border-border"
                )}
              />
              <span className="text-xs text-muted-foreground mt-1 block">{form.title.length}/200 caracteres</span>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={5}
                placeholder="Descrição detalhada do produto..."
                className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none resize-y"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Categoria *</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Categoria do produto no canal..."
                className={cn(
                  "w-full bg-background rounded-xl border p-3 text-sm focus:border-primary focus:outline-none",
                  validationErrors.find(e => e.field === "category") ? "border-red-500" : "border-border"
                )}
              />
            </div>
          </div>

          {/* Preços e Estoque */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <h3 className="font-bold border-b border-border pb-3">Preços e Estoque</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Preço Normal (R$) *</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => handleChange("price", Number(e.target.value))}
                  className={cn("w-full bg-background rounded-xl border p-3 text-sm focus:border-primary focus:outline-none", validationErrors.find(e => e.field === "price") ? "border-red-500" : "border-border")} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Preço Promo (R$)</label>
                <input type="number" min="0" step="0.01" value={form.promoPrice} onChange={(e) => handleChange("promoPrice", Number(e.target.value))}
                  className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Estoque</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => handleChange("stock", Number(e.target.value))}
                  className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Logística */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <h3 className="font-bold border-b border-border pb-3">Logística e Dimensões</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Peso (kg)", field: "weight" },
                { label: "Altura (cm)", field: "height" },
                { label: "Largura (cm)", field: "width" },
                { label: "Comprimento (cm)", field: "length" },
              ].map((item) => (
                <div key={item.field}>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">{item.label}</label>
                  <input type="number" min="0" step="0.01"
                    value={(form as any)[item.field]}
                    onChange={(e) => handleChange(item.field, Number(e.target.value))}
                    className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 2: Dados Técnicos + Fotos */}
        <div className="space-y-5">
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <h3 className="font-bold border-b border-border pb-3">Dados Técnicos</h3>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">NCM</label>
              <input type="text" value={form.ncm} onChange={(e) => handleChange("ncm", e.target.value)} placeholder="0000.00.00"
                className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className={cn("text-sm font-medium block mb-1", validationErrors.find(e => e.field === "gtin") ? "text-red-500" : "text-muted-foreground")}>
                GTIN / EAN {form.channel === "mercado_libre" && <span className="text-red-500">*</span>}
              </label>
              <input type="text" value={form.gtin} onChange={(e) => handleChange("gtin", e.target.value)} placeholder="7890000000000"
                className={cn("w-full bg-background rounded-xl border p-3 text-sm focus:border-primary focus:outline-none", validationErrors.find(e => e.field === "gtin") ? "border-red-500" : "border-border")} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Garantia</label>
              <input type="text" value={form.warranty} onChange={(e) => handleChange("warranty", e.target.value)}
                className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Condição</label>
              <select value={form.condition} onChange={(e) => handleChange("condition", e.target.value)}
                className="w-full bg-background rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none">
                <option value="new">Novo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>

          {/* Upload de Fotos */}
          <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border space-y-4">
            <h3 className="font-bold border-b border-border pb-3">Fotos do Produto</h3>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground font-medium">Arraste ou clique para adicionar fotos</p>
              <p className="text-xs text-muted-foreground">Shopee: máx. 9 fotos | ML: máx. 12 fotos | Min. 500x500px</p>
            </div>
          </div>

          {/* Botão de Publicar */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-base flex justify-center items-center gap-3 transition-all",
              loading
                ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/30"
            )}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {loading ? "Publicando e Sincronizando..." : "Publicar Anúncio"}
          </button>

          {form.channel === "mercado_libre" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                GTIN/EAN obrigatório para Mercado Livre. Produtos sem GTIN válido podem ser pausados.
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
