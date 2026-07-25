import { MarketplaceChannel, MarketplaceRegistryConfig } from "@/features/integrations/types/marketplaces";

/**
 * Registro Central de Marketplaces (Single Source of Truth - Ponto 17 & Enterprise Registry).
 * Elimina blocos IF aninhados permitindo que o Editor de Anúncios e Validador de Produtos
 * se adaptem dinamicamente às regras e especificações de cada plataforma de vendas.
 */
class MarketplaceRegistryService {
  private readonly configs: Map<MarketplaceChannel, MarketplaceRegistryConfig> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Mercado Livre (Meli API)
    this.configs.set("mercado_libre", {
      channel: "mercado_libre",
      name: "Mercado Livre (Meli API)",
      defaultApiVersion: "v2",
      acceptsVideo: true,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: true,
      acceptsVariations: true,
      maxImages: 12,
      maxVideos: 1,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["BRAND", "MODEL", "COLOR", "SIZE", "MATERIAL", "WARRANTY_TYPE", "WARRANTY_TIME"],
      rateLimitConfig: {
        maxCallsPerMinute: 600,
        defaultPriority: "high",
        maxRetries: 5,
        baseBackoffMs: 1000,
      }
    });

    // 2. Shopee (Open Platform v2)
    this.configs.set("shopee", {
      channel: "shopee",
      name: "Shopee Open Platform",
      defaultApiVersion: "v2",
      acceptsVideo: true,
      acceptsGtin: false,
      acceptsNcm: false,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 9,
      maxVideos: 1,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["BRAND", "MATERIAL", "ORIGIN", "SHIPPING_FROM"],
      rateLimitConfig: {
        maxCallsPerMinute: 300,
        defaultPriority: "high",
        maxRetries: 4,
        baseBackoffMs: 1500,
      }
    });

    // 3. Amazon SP-API
    this.configs.set("amazon", {
      channel: "amazon",
      name: "Amazon Seller Central SP-API",
      defaultApiVersion: "v3",
      acceptsVideo: true,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: true,
      acceptsVariations: true,
      maxImages: 9,
      maxVideos: 2,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["BULLET_POINT_1", "BULLET_POINT_2", "BULLET_POINT_3", "MANUFACTURER", "PART_NUMBER"],
      rateLimitConfig: {
        maxCallsPerMinute: 180,
        defaultPriority: "urgent",
        maxRetries: 6,
        baseBackoffMs: 2000,
      }
    });

    // 4. Magazine Luiza (Integração Magalu / Integração Parceiro)
    this.configs.set("magalu", {
      channel: "magalu",
      name: "Magazine Luiza (Magalu Marketplace)",
      defaultApiVersion: "v2",
      acceptsVideo: false,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 6,
      maxVideos: 0,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["MARCA", "MODELO", "LINHA", "GARANTIA_FORNECEDOR"],
      rateLimitConfig: {
        maxCallsPerMinute: 240,
        defaultPriority: "normal",
        maxRetries: 3,
        baseBackoffMs: 1200,
      }
    });

    // 5. Via Marketplace (Casas Bahia, Ponto, Extra)
    this.configs.set("via_varejo", {
      channel: "via_varejo",
      name: "Via Marketplace (Casas Bahia / Ponto / Extra)",
      defaultApiVersion: "v2",
      acceptsVideo: false,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 5,
      maxVideos: 0,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["MARCA", "EAN", "COR", "TAMANHO"],
      rateLimitConfig: {
        maxCallsPerMinute: 200,
        defaultPriority: "normal",
        maxRetries: 3,
        baseBackoffMs: 1500,
      }
    });

    // 6. Americanas Marketplace (B2W / SkyHub)
    this.configs.set("americanas", {
      channel: "americanas",
      name: "Americanas Marketplace (B2W)",
      defaultApiVersion: "v2",
      acceptsVideo: false,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 8,
      maxVideos: 0,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["FABRICANTE", "MODELO", "GARANTIA"],
      rateLimitConfig: {
        maxCallsPerMinute: 250,
        defaultPriority: "normal",
        maxRetries: 3,
        baseBackoffMs: 1000,
      }
    });

    // 7. MadeiraMadeira
    this.configs.set("madeiramadeira", {
      channel: "madeiramadeira",
      name: "MadeiraMadeira Marketplace",
      defaultApiVersion: "v1",
      acceptsVideo: false,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: true,
      acceptsVariations: true,
      maxImages: 10,
      maxVideos: 0,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["ACABAMENTO", "MATERIAL_PRINCIPAL", "NECESSITA_MONTAGEM", "GARANTIA_MESES"],
      rateLimitConfig: {
        maxCallsPerMinute: 150,
        defaultPriority: "normal",
        maxRetries: 3,
        baseBackoffMs: 2000,
      }
    });

    // 8. TikTok Shop
    this.configs.set("tiktok_shop", {
      channel: "tiktok_shop",
      name: "TikTok Shop Brazil",
      defaultApiVersion: "v2",
      acceptsVideo: true,
      acceptsGtin: false,
      acceptsNcm: false,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 9,
      maxVideos: 3,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["BRAND", "MATERIAL", "STYLE", "OCCASION"],
      rateLimitConfig: {
        maxCallsPerMinute: 300,
        defaultPriority: "high",
        maxRetries: 4,
        baseBackoffMs: 1000,
      }
    });

    // 9. Shein Marketplace
    this.configs.set("shein", {
      channel: "shein",
      name: "Shein Marketplace Open Platform",
      defaultApiVersion: "v2",
      acceptsVideo: true,
      acceptsGtin: false,
      acceptsNcm: false,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 9,
      maxVideos: 1,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["BRAND", "COLOR", "SIZE", "MATERIAL", "PATTERN_TYPE", "FIT_TYPE"],
      rateLimitConfig: {
        maxCallsPerMinute: 200,
        defaultPriority: "normal",
        maxRetries: 4,
        baseBackoffMs: 1500,
      }
    });

    // Canais Legado do ERP
    this.configs.set("nuvemshop", {
      channel: "nuvemshop",
      name: "Nuvemshop API",
      defaultApiVersion: "v1",
      acceptsVideo: false,
      acceptsGtin: true,
      acceptsNcm: false,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 10,
      maxVideos: 0,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["MARCA", "SEO_TITLE"],
      rateLimitConfig: { maxCallsPerMinute: 120, defaultPriority: "normal", maxRetries: 3, baseBackoffMs: 1000 }
    });

    this.configs.set("shopify", {
      channel: "shopify",
      name: "Shopify Admin API",
      defaultApiVersion: "v2",
      acceptsVideo: true,
      acceptsGtin: true,
      acceptsNcm: false,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 20,
      maxVideos: 1,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["VENDOR", "PRODUCT_TYPE", "TAGS"],
      rateLimitConfig: { maxCallsPerMinute: 120, defaultPriority: "normal", maxRetries: 3, baseBackoffMs: 1000 }
    });

    this.configs.set("woocommerce", {
      channel: "woocommerce",
      name: "WooCommerce REST API",
      defaultApiVersion: "v3",
      acceptsVideo: false,
      acceptsGtin: false,
      acceptsNcm: false,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 10,
      maxVideos: 0,
      requireDimensions: false,
      requireWeight: false,
      requireCategory: false,
      specificAttributes: ["CATALOG_VISIBILITY"],
      rateLimitConfig: { maxCallsPerMinute: 60, defaultPriority: "low", maxRetries: 3, baseBackoffMs: 2000 }
    });

    this.configs.set("tray", {
      channel: "tray",
      name: "Tray E-commerce API",
      defaultApiVersion: "v1",
      acceptsVideo: true,
      acceptsGtin: true,
      acceptsNcm: true,
      acceptsKits: false,
      acceptsVariations: true,
      maxImages: 10,
      maxVideos: 1,
      requireDimensions: true,
      requireWeight: true,
      requireCategory: true,
      specificAttributes: ["MARCA", "GARANTIA"],
      rateLimitConfig: { maxCallsPerMinute: 100, defaultPriority: "normal", maxRetries: 3, baseBackoffMs: 1500 }
    });
  }

  /**
   * Obtém a configuração oficial de um canal de Marketplace.
   */
  public getConfig(channel: MarketplaceChannel): MarketplaceRegistryConfig {
    const config = this.configs.get(channel);
    if (!config) {
      throw new Error(`Configuração não encontrada no Registry para o marketplace: ${channel}`);
    }
    return config;
  }

  /**
   * Retorna todas as configurações dos canais registrados no ERP.
   */
  public getAllConfigs(): MarketplaceRegistryConfig[] {
    return Array.from(this.configs.values());
  }
}

export const MarketplaceRegistry = new MarketplaceRegistryService();
export default MarketplaceRegistry;
