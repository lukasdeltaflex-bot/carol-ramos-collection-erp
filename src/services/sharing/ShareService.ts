import { ServiceResult } from "@/features/products/types";
import { ShareTemplateService, SocialPlatform, TemplateData } from "./ShareTemplateService";
import { ShareHistoryService } from "./ShareHistoryService";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

export class ShareService {
  /**
   * Health Check simples do link de afiliado/oferta antes de liberar o disparo.
   */
  public static async verifyLinkHealth(url: string): Promise<boolean> {
    if (!url) return false;
    try {
      // Validação de formato URL
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith("http")) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Registra um clique no menu de compartilhamento (Métrica: shareClicks)
   */
  public static async incrementShareClick(productId: string): Promise<void> {
    try {
      const prodRef = doc(db, "products", productId);
      await updateDoc(prodRef, {
        shareClicks: increment(1),
      });
    } catch (e) {
      console.warn("Não foi possível incrementar shareClicks:", e);
    }
  }

  /**
   * Executa o compartilhamento da oferta para a plataforma especificada.
   */
  public static async dispatchShare(
    productId: string,
    data: TemplateData,
    platform: SocialPlatform,
    userName = "Usuário Atual"
  ): Promise<ServiceResult<{ postText: string; actionUrl?: string; copied: boolean }>> {
    // 1. Health Check do Link
    const isHealthy = await this.verifyLinkHealth(data.affiliateLink);
    if (!isHealthy) {
      return {
        success: false,
        error: "Oferta indisponível. O link fornecido é inválido ou está quebrado.",
        errorCode: "LK-1008",
      };
    }

    // 2. Gerar mensagem formatada via ShareTemplateService
    const postText = ShareTemplateService.buildPost(data, platform);

    let actionUrl: string | undefined;
    let copied = false;

    const encodedText = encodeURIComponent(postText);
    const encodedUrl = encodeURIComponent(data.affiliateLink);

    // 3. Montar URL de ação / Trigger
    switch (platform) {
      case "whatsapp":
        actionUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        break;
      case "whatsapp_business":
        actionUrl = `whatsapp://send?text=${encodedText}`;
        break;
      case "telegram":
        actionUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case "facebook":
        actionUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        actionUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case "threads":
        actionUrl = `https://www.threads.net/intent/post?text=${encodedText}`;
        break;
      case "pinterest":
        actionUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodeURIComponent(data.title)}`;
        break;
      case "copy_text":
      case "instagram":
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(postText);
          copied = true;
        }
        break;
      case "copy_link":
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(data.affiliateLink);
          copied = true;
        }
        break;
      case "copy_hashtags": {
        const tagsStr = ShareTemplateService.generateHashtags(data).join(" ");
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(tagsStr);
          copied = true;
        }
        break;
      }
    }

    // 4. Se for disparar via window.open, abre o link no navegador
    if (actionUrl && typeof window !== "undefined") {
      window.open(actionUrl, "_blank", "noopener,noreferrer");
    }

    // 5. Incrementar métrica sharesCount e salvar histórico na subcoleção do Firestore
    try {
      const prodRef = doc(db, "products", productId);
      await updateDoc(prodRef, {
        sharesCount: increment(1),
        lastSharedAt: new Date().toISOString(),
      });

      await ShareHistoryService.recordShare(productId, {
        productId,
        channel: platform,
        sharedAt: new Date().toISOString(),
        user: userName,
        messageTemplate: postText,
        affiliateLink: data.affiliateLink,
        success: true,
        platform: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      });
    } catch (e) {
      console.warn("Erro ao registrar estatísticas de compartilhamento:", e);
    }

    return {
      success: true,
      data: {
        postText,
        actionUrl,
        copied,
      },
    };
  }
}
