import { Product } from "@/features/products/types";

export type SocialPlatform =
  | "whatsapp"
  | "whatsapp_business"
  | "telegram"
  | "facebook"
  | "instagram"
  | "twitter"
  | "threads"
  | "pinterest"
  | "copy_text"
  | "copy_link"
  | "copy_hashtags";

export interface TemplateData {
  title: string;
  originalPrice?: number;
  currentPrice: number;
  promoPrice?: number;
  discountPercentage?: number;
  marketplace?: string;
  affiliateLink: string;
  description?: string;
  category?: string;
  brand?: string;
}

export class ShareTemplateService {
  private static calculateDiscount(current: number, original?: number): number {
    if (!original || original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  }

  private static formatBRL(val: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  }

  public static generateHashtags(data: TemplateData): string[] {
    const tags = new Set<string>();
    tags.add("#ofertas");
    tags.add("#promocao");
    tags.add("#desconto");
    tags.add("#achadinhos");

    if (data.marketplace) {
      const mkt = data.marketplace.toLowerCase().replace(/\s+/g, "");
      tags.add(`#achadosda${mkt}`);
      tags.add(`#${mkt}`);
    }

    if (data.category) {
      tags.add(`#${data.category.toLowerCase().replace(/\s+/g, "")}`);
    }

    if (data.brand) {
      tags.add(`#${data.brand.toLowerCase().replace(/\s+/g, "")}`);
    }

    return Array.from(tags);
  }

  public static buildPost(data: TemplateData, platform: SocialPlatform): string {
    const priceFormatted = this.formatBRL(data.currentPrice);
    const originalPriceFormatted = data.originalPrice && data.originalPrice > data.currentPrice
      ? this.formatBRL(data.originalPrice)
      : null;

    const discount = data.discountPercentage || this.calculateDiscount(data.currentPrice, data.originalPrice);
    const discountText = discount > 0 ? `🔥 [${discount}% OFF]` : "🔥 OPORTUNIDADE";
    const hashtagsStr = this.generateHashtags(data).join(" ");

    switch (platform) {
      case "whatsapp":
      case "whatsapp_business":
        return [
          `😱 *${discountText}*`,
          `*${data.title}*`,
          "",
          originalPriceFormatted ? `❌ De: ~${originalPriceFormatted}~` : null,
          `✅ *Por apenas: ${priceFormatted}*`,
          data.marketplace ? `🛒 Loja: ${data.marketplace}` : null,
          "",
          `👇 *Garantir Oferta Agora:*`,
          `${data.affiliateLink}`,
          "",
          `⚡ _Estoque limitado! Aproveite antes que acabe._`,
        ]
          .filter(Boolean)
          .join("\n");

      case "telegram":
        return [
          `🚨 **${discountText} - OPORTUNIDADE IMPERDÍVEL**`,
          "",
          `📦 **${data.title}**`,
          data.description ? `\n💬 ${data.description.slice(0, 140)}...` : null,
          "",
          originalPriceFormatted ? `💰 ~${originalPriceFormatted}~ ➔ **${priceFormatted}**` : `💰 **${priceFormatted}**`,
          discount > 0 ? `🏷️ Desconto de ${discount}% aplicado!` : null,
          "",
          `👉 **CLIQUE AQUI PARA COMPRAR:**`,
          `${data.affiliateLink}`,
          "",
          `${hashtagsStr}`,
        ]
          .filter(Boolean)
          .join("\n");

      case "twitter": {
        const shortTitle = data.title.length > 80 ? `${data.title.slice(0, 77)}...` : data.title;
        return [
          `🔥 ${discountText}: ${shortTitle}`,
          `💰 ${priceFormatted} ${originalPriceFormatted ? `(De ${originalPriceFormatted})` : ""}`,
          `👇 Compre aqui:`,
          `${data.affiliateLink}`,
          `#promocao #ofertas`,
        ]
          .filter(Boolean)
          .join("\n");
      }

      case "instagram":
        return [
          `✨ ${data.title} ✨`,
          "",
          `💥 ${discountText}`,
          originalPriceFormatted ? ` De: ${originalPriceFormatted}` : null,
          ` Por apenas: ${priceFormatted}!`,
          "",
          `🔗 LINK DE COMPRA DIRETA NA BIO OU COPIE O LINK ABAIXO:`,
          `${data.affiliateLink}`,
          "",
          `${hashtagsStr}`,
        ]
          .filter(Boolean)
          .join("\n");

      case "threads":
        return [
          `Achadinho do dia! 🛍️`,
          `${data.title}`,
          `De ${originalPriceFormatted || "preço normal"} por APENAS ${priceFormatted} (${discount}% OFF)!`,
          "",
          `Garanta aqui 👉 ${data.affiliateLink}`,
          "",
          `${hashtagsStr}`,
        ]
          .filter(Boolean)
          .join("\n");

      case "facebook":
        return [
          `💥 OPORTUNIDADE: ${data.title}`,
          "",
          data.description ? `${data.description}\n` : "",
          `De ${originalPriceFormatted || priceFormatted} por apenas ${priceFormatted}!`,
          `Garanta o seu com desconto exclusivo pelo link oficial abaixo:`,
          "",
          `👇 CLIQUE PARA APROVEITAR:`,
          `${data.affiliateLink}`,
          "",
          `${hashtagsStr}`,
        ]
          .filter(Boolean)
          .join("\n");

      case "pinterest":
        return [
          `${data.title} em Promoção com ${discount}% de Desconto`,
          `Compre ${data.title} pelo melhor preço (${priceFormatted}).`,
          `Acesse o link para ver os detalhes da oferta oficial.`,
          `${data.affiliateLink}`,
        ]
          .filter(Boolean)
          .join("\n");

      case "copy_text":
      case "copy_link":
      default:
        return [
          `🔥 ${data.title}`,
          `💰 Por apenas: ${priceFormatted}`,
          `🛒 Compre aqui: ${data.affiliateLink}`,
        ].join("\n");
    }
  }
}
