import { Customer } from "./types";

export type VipTier = "gold" | "silver" | "bronze";

export interface VipTierInfo {
  id: VipTier;
  label: string;
  badge: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  minSpent: number;
  minOrders: number;
}

export const VIP_TIERS: Record<VipTier, VipTierInfo> = {
  gold: {
    id: "gold",
    label: "VIP Ouro",
    badge: "🥇 Ouro",
    colorClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/20",
    borderClass: "border-amber-500/30",
    minSpent: 1000,
    minOrders: 5,
  },
  silver: {
    id: "silver",
    label: "VIP Prata",
    badge: "🥈 Prata",
    colorClass: "text-slate-400 dark:text-slate-300",
    bgClass: "bg-slate-500/10 dark:bg-slate-500/20",
    borderClass: "border-slate-500/30",
    minSpent: 300,
    minOrders: 2,
  },
  bronze: {
    id: "bronze",
    label: "VIP Bronze",
    badge: "🥉 Bronze",
    colorClass: "text-amber-700 dark:text-amber-600",
    bgClass: "bg-amber-800/10 dark:bg-amber-800/20",
    borderClass: "border-amber-800/30",
    minSpent: 0,
    minOrders: 0,
  },
};

/**
 * Calculates the Customer's VIP tier based on totalSpent and totalOrders
 */
export function calculateVipTier(totalSpent: number = 0, totalOrders: number = 0): VipTier {
  if (totalSpent >= 1000 || totalOrders >= 5) {
    return "gold";
  }
  if (totalSpent >= 300 || totalOrders >= 2) {
    return "silver";
  }
  return "bronze";
}

/**
 * Gets the customer's current VIP Tier info, auto-calculating if not explicitly set
 */
export function getCustomerVipTier(customer: Partial<Customer>): VipTierInfo {
  const totalSpent = customer.metrics?.totalSpent || 0;
  const totalOrders = customer.metrics?.totalOrders || 0;
  const tier = customer.vipTier || calculateVipTier(totalSpent, totalOrders);
  return VIP_TIERS[tier] || VIP_TIERS.bronze;
}
