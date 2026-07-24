export interface KnownBank {
  code: string;
  name: string;
  aliases: string[];
  domain: string;
  brand: string;
  color: string;
  logoUrl?: string;
}

export const KNOWN_BANKS: KnownBank[] = [
  {
    code: "001",
    name: "Banco do Brasil",
    aliases: ["bb", "bancodobrasil", "banco do brasil"],
    domain: "bb.com.br",
    brand: "BB",
    color: "bg-yellow-500 text-blue-950 border-yellow-600",
    logoUrl: "https://www.google.com/s2/favicons?domain=bb.com.br&sz=128"
  },
  {
    code: "260",
    name: "Nubank",
    aliases: ["nu", "nubank", "nuconta", "nu pagamentos"],
    domain: "nubank.com.br",
    brand: "Nu",
    color: "bg-purple-700 text-white border-purple-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=nubank.com.br&sz=128"
  },
  {
    code: "341",
    name: "Itaú Unibanco",
    aliases: ["itau", "itaú", "itau unibanco", "itau pj"],
    domain: "itau.com.br",
    brand: "Itaú",
    color: "bg-orange-500 text-blue-950 border-orange-600",
    logoUrl: "https://www.google.com/s2/favicons?domain=itau.com.br&sz=128"
  },
  {
    code: "237",
    name: "Bradesco",
    aliases: ["bradesco", "banco bradesco"],
    domain: "bradesco.com.br",
    brand: "Brad",
    color: "bg-red-700 text-white border-red-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=bradesco.com.br&sz=128"
  },
  {
    code: "033",
    name: "Santander",
    aliases: ["santander", "banco santander"],
    domain: "santander.com.br",
    brand: "San",
    color: "bg-red-600 text-white border-red-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=santander.com.br&sz=128"
  },
  {
    code: "104",
    name: "Caixa Econômica Federal",
    aliases: ["caixa", "cef", "caixa economica", "caixa econômica federal"],
    domain: "caixa.gov.br",
    brand: "Caixa",
    color: "bg-blue-600 text-orange-400 border-blue-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=caixa.gov.br&sz=128"
  },
  {
    code: "077",
    name: "Banco Inter",
    aliases: ["inter", "banco inter", "bancointer"],
    domain: "bancointer.com.br",
    brand: "Inter",
    color: "bg-orange-500 text-white border-orange-600",
    logoUrl: "https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=128"
  },
  {
    code: "336",
    name: "C6 Bank",
    aliases: ["c6", "c6bank", "c6 bank"],
    domain: "c6bank.com.br",
    brand: "C6",
    color: "bg-black text-white border-neutral-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=c6bank.com.br&sz=128"
  },
  {
    code: "290",
    name: "PagBank / PagSeguro",
    aliases: ["pagbank", "pagseguro", "pag bank"],
    domain: "pagbank.com.br",
    brand: "Pag",
    color: "bg-green-600 text-white border-green-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=pagbank.com.br&sz=128"
  },
  {
    code: "323",
    name: "Mercado Pago",
    aliases: ["mercadopago", "mercado pago", "mercado livre"],
    domain: "mercadopago.com.br",
    brand: "MP",
    color: "bg-sky-500 text-blue-950 border-sky-600",
    logoUrl: "https://www.google.com/s2/favicons?domain=mercadopago.com.br&sz=128"
  },
  {
    code: "380",
    name: "PicPay",
    aliases: ["picpay", "pic pay"],
    domain: "picpay.com",
    brand: "PicPay",
    color: "bg-emerald-600 text-white border-emerald-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=picpay.com&sz=128"
  },
  {
    code: "208",
    name: "BTG Pactual",
    aliases: ["btg", "btgpactual", "btg pactual"],
    domain: "btgpactual.com",
    brand: "BTG",
    color: "bg-slate-900 text-white border-slate-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=btgpactual.com&sz=128"
  },
  {
    code: "102",
    name: "XP Investimentos",
    aliases: ["xp", "xpinvestimentos", "xp investimentos"],
    domain: "xpi.com.br",
    brand: "XP",
    color: "bg-black text-amber-400 border-neutral-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=xpi.com.br&sz=128"
  },
  {
    code: "121",
    name: "Neon",
    aliases: ["neon", "banco neon"],
    domain: "neon.com.br",
    brand: "Neon",
    color: "bg-cyan-500 text-white border-cyan-600",
    logoUrl: "https://www.google.com/s2/favicons?domain=neon.com.br&sz=128"
  },
  {
    code: "756",
    name: "Sicoob",
    aliases: ["sicoob", "banco sicoob"],
    domain: "sicoob.com.br",
    brand: "Sicoob",
    color: "bg-emerald-800 text-yellow-400 border-emerald-950",
    logoUrl: "https://www.google.com/s2/favicons?domain=sicoob.com.br&sz=128"
  },
  {
    code: "748",
    name: "Sicredi",
    aliases: ["sicredi", "banco sicredi"],
    domain: "sicredi.com.br",
    brand: "Sicredi",
    color: "bg-green-700 text-white border-green-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=sicredi.com.br&sz=128"
  },
  {
    code: "637",
    name: "Sofisa Direto",
    aliases: ["sofisa", "sofisadireto", "banco sofisa"],
    domain: "sofisa.com.br",
    brand: "Sofisa",
    color: "bg-blue-700 text-white border-blue-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=sofisa.com.br&sz=128"
  },
  {
    code: "707",
    name: "Daycoval",
    aliases: ["daycoval", "banco daycoval"],
    domain: "daycoval.com.br",
    brand: "Dayc",
    color: "bg-blue-900 text-white border-blue-950",
    logoUrl: "https://www.google.com/s2/favicons?domain=daycoval.com.br&sz=128"
  },
  {
    code: "318",
    name: "BMG",
    aliases: ["bmg", "banco bmg"],
    domain: "bancobmg.com.br",
    brand: "BMG",
    color: "bg-orange-600 text-white border-orange-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=bancobmg.com.br&sz=128"
  },
  {
    code: "041",
    name: "Banrisul",
    aliases: ["banrisul"],
    domain: "banrisul.com.br",
    brand: "BRS",
    color: "bg-blue-800 text-white border-blue-900",
    logoUrl: "https://www.google.com/s2/favicons?domain=banrisul.com.br&sz=128"
  },
  {
    code: "197",
    name: "Stone",
    aliases: ["stone", "conta stone"],
    domain: "stone.com.br",
    brand: "Stone",
    color: "bg-emerald-600 text-white border-emerald-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=stone.com.br&sz=128"
  },
  {
    code: "623",
    name: "Banco Pan",
    aliases: ["pan", "bancopan", "banco pan"],
    domain: "bancopan.com.br",
    brand: "Pan",
    color: "bg-blue-950 text-white border-blue-900",
    logoUrl: "https://www.google.com/s2/favicons?domain=bancopan.com.br&sz=128"
  },
  {
    code: "074",
    name: "Safra",
    aliases: ["safra", "banco safra"],
    domain: "safra.com.br",
    brand: "Safra",
    color: "bg-amber-700 text-white border-amber-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=safra.com.br&sz=128"
  },
  {
    code: "212",
    name: "Banco Original",
    aliases: ["original", "banco original"],
    domain: "original.com.br",
    brand: "Orig",
    color: "bg-emerald-700 text-white border-emerald-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=original.com.br&sz=128"
  },
  {
    code: "218",
    name: "BS2",
    aliases: ["bs2", "banco bs2"],
    domain: "bancobs2.com.br",
    brand: "BS2",
    color: "bg-indigo-700 text-white border-indigo-800",
    logoUrl: "https://www.google.com/s2/favicons?domain=bancobs2.com.br&sz=128"
  },
  {
    code: "999",
    name: "Shopee Pay",
    aliases: ["shopee", "shopee pay", "carteira shopee"],
    domain: "shopee.com.br",
    brand: "Shopee",
    color: "bg-orange-600 text-white border-orange-700",
    logoUrl: "https://www.google.com/s2/favicons?domain=shopee.com.br&sz=128"
  }
];

export function findKnownBank(nameOrCode?: string): KnownBank | null {
  if (!nameOrCode) return null;
  const target = nameOrCode.trim().toLowerCase();
  if (!target) return null;

  const byCode = KNOWN_BANKS.find((b) => b.code === target);
  if (byCode) return byCode;

  const byName = KNOWN_BANKS.find(
    (b) =>
      b.name.toLowerCase() === target ||
      b.aliases.some((alias) => target.includes(alias) || alias.includes(target))
  );
  if (byName) return byName;

  return null;
}

const logoUrlCache = new Map<string, string>();

export function resolveBankLogoUrl(account?: {
  logo?: string;
  bankName?: string;
  bankCode?: string;
  name?: string;
}): { url: string | null; knownBank: KnownBank | null } {
  if (!account) return { url: null, knownBank: null };

  if (account.logo && account.logo.trim().length > 0) {
    return { url: account.logo.trim(), knownBank: null };
  }

  const searchKey = `${account.bankCode || ""}_${account.bankName || ""}_${account.name || ""}`;
  if (logoUrlCache.has(searchKey)) {
    const cachedUrl = logoUrlCache.get(searchKey)!;
    const known =
      findKnownBank(account.bankCode) ||
      findKnownBank(account.bankName) ||
      findKnownBank(account.name);
    return { url: cachedUrl, knownBank: known };
  }

  const known =
    findKnownBank(account.bankCode) ||
    findKnownBank(account.bankName) ||
    findKnownBank(account.name);

  if (known) {
    const resolvedUrl =
      known.logoUrl || `https://www.google.com/s2/favicons?domain=${known.domain}&sz=128`;
    logoUrlCache.set(searchKey, resolvedUrl);
    return { url: resolvedUrl, knownBank: known };
  }

  const potentialName = `${account.bankName || ""} ${account.name || ""}`.toLowerCase();
  const domainRegex = /([a-z0-9|-]+\.(com|net|org|br|io|co|app))/i;
  const match = potentialName.match(domainRegex);
  if (match && match[1]) {
    const domainUrl = `https://www.google.com/s2/favicons?domain=${match[1]}&sz=128`;
    logoUrlCache.set(searchKey, domainUrl);
    return { url: domainUrl, knownBank: null };
  }

  return { url: null, knownBank: null };
}

export function generateOnlineLogoCandidates(query: string): string[] {
  if (!query || !query.trim()) return [];
  const clean = query.trim().toLowerCase();

  const known = findKnownBank(clean);
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
