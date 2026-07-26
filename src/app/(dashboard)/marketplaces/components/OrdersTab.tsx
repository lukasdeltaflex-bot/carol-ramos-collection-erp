"use client";

import React, { useEffect, useState } from "react";
import { listOrdersAction } from "../actions";
import { MarketplaceOrder } from "@/features/integrations/types/marketplaces";
import { ShoppingCart, RefreshCw, Eye, Search } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function OrdersTab({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [search, setSearch] = useState("");
  const { error } = useToast();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await listOrdersAction(tenantId, { limit: 100 });
      if (res.success) {
        setOrders(res.data || []);
      } else {
        error("Erro ao carregar pedidos", res.error);
      }
    } catch (e: any) {
      error("Erro Fatal", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [tenantId]);

  const filteredOrders = orders.filter(
    (o) =>
      o.externalOrderId.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Gestão de Pedidos
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-xl border border-border focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={loadOrders}
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
                <th className="p-3">Data</th>
                <th className="p-3">Canal</th>
                <th className="p-3">ID Externo</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Carregando pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-accent/20 transition-colors">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 font-semibold uppercase">{order.channel.replace("_", " ")}</td>
                    <td className="p-3 font-mono">{order.externalOrderId}</td>
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3 font-semibold text-foreground">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-semibold rounded-md",
                        order.orderStatus === "paid" ? "bg-emerald-500/10 text-emerald-500" :
                        order.orderStatus === "pending" ? "bg-amber-500/10 text-amber-500" :
                        order.orderStatus === "shipped" || order.orderStatus === "delivered" ? "bg-blue-500/10 text-blue-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="p-1.5 bg-accent/50 hover:bg-accent rounded-md transition-colors text-primary" title="Ver Detalhes">
                        <Eye className="w-4 h-4" />
                      </button>
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
