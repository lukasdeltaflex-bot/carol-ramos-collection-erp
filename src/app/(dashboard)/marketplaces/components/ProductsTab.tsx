"use client";

import React, { useEffect, useState } from "react";
import { listItemsAction } from "../actions";
import { MarketplaceItem } from "@/features/integrations/types/marketplaces";
import { Box, RefreshCw, Search, Tag, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function ProductsTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MarketplaceItem[]>([]);
  const [search, setSearch] = useState("");
  const { error } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await listItemsAction(tenantId);
      if (res.success) {
        setProducts(res.data || []);
      } else {
        error("Erro ao carregar produtos", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [tenantId]);

  const filteredProducts = products.filter(
    (p) =>
      (p.productSku || p.externalSku || p.erpItemId || p.externalItemId).toLowerCase().includes(search.toLowerCase()) ||
      (p.productName || p.title || "").toLowerCase().includes(search.toLowerCase()) ||
      p.externalItemId.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" />
          Hub de Produtos ({filteredProducts.length})
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por SKU ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-xl border border-border focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent/40 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Canal</th>
                <th className="p-3">Imagem</th>
                <th className="p-3">Produto</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Estoque</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Carregando catálogo...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Nenhum produto sincronizado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-accent/20 transition-colors">
                    <td className="p-3 font-semibold uppercase">
                      <span className={cn("px-2 py-1 rounded text-xs", product.channel === "shopee" ? "bg-orange-500/10 text-orange-500" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400")}>
                        {product.channel.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="w-10 h-10 bg-accent rounded-md border border-border flex items-center justify-center overflow-hidden">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </td>
                    <td className="p-3 font-medium text-foreground max-w-[200px] truncate" title={product.productName || product.title}>
                      {product.productName || product.title}
                      <div className="text-[10px] text-muted-foreground mt-0.5">ID: {product.externalItemId}</div>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">{product.productSku || product.externalSku || "—"}</td>
                    <td className="p-3 font-semibold">{product.syncedStock ?? product.stock ?? 0}</td>
                    <td className="p-3 font-semibold text-emerald-500">{formatCurrency(product.syncedPrice ?? product.price ?? 0)}</td>
                    <td className="p-3">
                      {product.status === "active" ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-semibold"><CheckCircle className="w-3.5 h-3.5"/> Ativo</span>
                      ) : product.status === "paused" ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold"><AlertCircle className="w-3.5 h-3.5"/> Pausado</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-semibold"><AlertCircle className="w-3.5 h-3.5"/> Erro</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
