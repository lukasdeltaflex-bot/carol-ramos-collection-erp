export interface KnownCardFlag {
  id: string;
  name: string;
  aliases: string[];
  domain: string;
  brand: string;
  color: string;
  logoUrl: string;
}

export const KNOWN_CARD_FLAGS: KnownCardFlag[] = [
  {
    id: "visa",
    name: "Visa",
    aliases: ["visa", "visainfinite", "visaplatinum"],
    domain: "visa.com.br",
    brand: "VISA",
    color: "bg-blue-900 text-amber-400 border-blue-800 font-serif italic",
    logoUrl: "https://www.google.com/s2/favicons?domain=visa.com.br&sz=128"
  },
  {
    id: "mastercard",
    name: "Mastercard",
    aliases: ["mastercard", "master", "mastercardblack"],
    domain: "mastercard.com.br",
    brand: "MC",
    color: "bg-neutral-900 text-red-500 border-neutral-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=mastercard.com.br&sz=128"
  },
  {
    id: "elo",
    name: "Elo",
    aliases: ["elo", "cartaoelo", "elonanquim"],
    domain: "elo.com.br",
    brand: "ELO",
    color: "bg-black text-amber-400 border-neutral-700 font-bold",
    logoUrl: "https://www.google.com/s2/favicons?domain=elo.com.br&sz=128"
  },
  {
    id: "amex",
    name: "American Express",
    aliases: ["amex", "americanexpress", "american express"],
    domain: "americanexpress.com.br",
    brand: "AMEX",
    color: "bg-cyan-700 text-white border-cyan-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=americanexpress.com.br&sz=128"
  },
  {
    id: "hipercard",
    name: "Hipercard",
    aliases: ["hipercard", "hiper"],
    domain: "hipercard.com.br",
    brand: "HIPER",
    color: "bg-red-700 text-white border-red-800 font-bold",
    logoUrl: "https://www.google.com/s2/favicons?domain=hipercard.com.br&sz=128"
  },
  {
    id: "diners",
    name: "Diners Club",
    aliases: ["diners", "dinersclub", "diners club"],
    domain: "dinersclub.com",
    brand: "DINERS",
    color: "bg-slate-800 text-slate-100 border-slate-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=dinersclub.com&sz=128"
  },
  {
    id: "discover",
    name: "Discover",
    aliases: ["discover", "discovercard"],
    domain: "discover.com",
    brand: "DISC",
    color: "bg-orange-600 text-white border-orange-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=discover.com&sz=128"
  },
  {
    id: "aura",
    name: "Aura",
    aliases: ["aura", "auracard"],
    domain: "auracard.com.br",
    brand: "AURA",
    color: "bg-red-800 text-white border-red-900",
    logoUrl: "https://www.google.com/s2/favicons?domain=auracard.com.br&sz=128"
  },
  {
    id: "cabal",
    name: "Cabal",
    aliases: ["cabal", "cabalcard"],
    domain: "cabal.com.br",
    brand: "CABAL",
    color: "bg-blue-800 text-white border-blue-900",
    logoUrl: "https://www.google.com/s2/favicons?domain=cabal.com.br&sz=128"
  },
  {
    id: "unionpay",
    name: "UnionPay",
    aliases: ["unionpay", "union pay", "cup"],
    domain: "unionpayintl.com",
    brand: "UNION",
    color: "bg-teal-700 text-white border-teal-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=unionpayintl.com&sz=128"
  },
  {
    id: "jcb",
    name: "JCB",
    aliases: ["jcb", "jcbcard"],
    domain: "global.jcb",
    brand: "JCB",
    color: "bg-blue-700 text-white border-blue-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=global.jcb&sz=128"
  }
];

export function findKnownCardFlag(flagIdOrName?: string): KnownCardFlag | null {
  if (!flagIdOrName) return null;
  const clean = flagIdOrName.trim().toLowerCase();

  const byId = KNOWN_CARD_FLAGS.find((f) => f.id === clean);
  if (byId) return byId;

  const byName = KNOWN_CARD_FLAGS.find(
    (f) =>
      f.name.toLowerCase() === clean ||
      f.aliases.some((alias) => clean.includes(alias) || alias.includes(clean))
  );
  if (byName) return byName;

  return null;
}

const flagUrlCache = new Map<string, string>();

export function resolveCardFlagLogoUrl(card?: {
  flagLogo?: string;
  flag?: string;
}): { url: string | null; knownFlag: KnownCardFlag | null } {
  if (!card) return { url: null, knownFlag: null };

  if (card.flagLogo && card.flagLogo.trim().length > 0) {
    return { url: card.flagLogo.trim(), knownFlag: null };
  }

  const searchKey = card.flag || "";
  if (flagUrlCache.has(searchKey)) {
    const cachedUrl = flagUrlCache.get(searchKey)!;
    const known = findKnownCardFlag(card.flag);
    return { url: cachedUrl, knownFlag: known };
  }

  const known = findKnownCardFlag(card.flag);
  if (known) {
    const resolvedUrl =
      known.logoUrl || `https://www.google.com/s2/favicons?domain=${known.domain}&sz=128`;
    flagUrlCache.set(searchKey, resolvedUrl);
    return { url: resolvedUrl, knownFlag: known };
  }

  return { url: null, knownFlag: null };
}

export function generateOnlineFlagCandidates(query: string): string[] {
  if (!query || !query.trim()) return [];
  const clean = query.trim().toLowerCase();

  const known = findKnownCardFlag(clean);
  const domain = known
    ? known.domain
    : clean.includes(".")
    ? clean
    : `${clean.replace(/[^a-z0-9]/g, "")}.com.br`;

  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://logo.clearbit.com/${domain}`,
    `https://unavatar.io/${domain}`
  ];
}
