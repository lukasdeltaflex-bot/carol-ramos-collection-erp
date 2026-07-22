"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { Product, Category, Brand, StockLocation, ProductKit, ProductKitItem } from "@/features/products/types";
import { CategorySchema, BrandSchema, StockLocationSchema, ProductSchema } from "@/features/products/schemas";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Tag,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  Bookmark,
  MapPin,
  X,
  Upload,
  Layers,
  Coins,
  Calculator,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  RotateCcw,
  CheckSquare
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PricingSimulator from "@/features/pricing/components/PricingSimulator";
import { ProductPricingData } from "@/features/pricing/types";
import { processImageUpload, MAX_IMAGE_SIZE_MB, safeLocalStorageSetItem } from "@/lib/imageUpload";

// Mock Inicial de Categorias
const INITIAL_CATEGORIES = [
  { name: "Perfumes", description: "Linha de perfumes importados e nacionais", slug: "perfumes" },
  { name: "Body Splash", description: "Fragrâncias leves para o dia a dia", slug: "body-splash" },
  { name: "Skincare", description: "Produtos para hidratação e cuidado facial", slug: "skincare" },
  { name: "Maquiagem", description: "Batons, bases, blushes e delineadores", slug: "maquiagem" }
];

// Mock Inicial de Marcas
const INITIAL_BRANDS = [
  { name: "Carol Ramos Collection", description: "Marca autoral premium" },
  { name: "Natura", description: "Linha oficial Natura Brasil" },
  { name: "Eudora", description: "Linha oficial Grupo Boticário" }
];

// Mock Inicial de Locais de Estoque
const INITIAL_LOCATIONS = [
  { name: "Loja Física", description: "Gôndolas e mostruário central", isVirtual: false, status: "active" },
  { name: "Depósito Central", description: "Estoque de retaguarda em caixas", isVirtual: false, status: "active" },
  { name: "Estoque Shopee", description: "Reservado para canal virtual Shopee", isVirtual: true, status: "active" }
];

// Mock Inicial de Produtos
const INITIAL_PRODUCTS = (catIds: string[], brandIds: string[], supplierIds: string[]) => [
  {
    sku: "PE-CR-SIGN",
    name: "Perfume Carol Ramos Signature 100ml",
    description: "Nossa fragrância assinatura com notas florais e baunilha premium.",
    categoryId: catIds[0] || "shared",
    brandId: brandIds[0] || "shared",
    supplierId: supplierIds[0] || "",
    costPrice: 85.00,
    sellPrice: 189.90,
    promoPrice: 179.90,
    averageCost: 85.00,
    lastPurchasePrice: 85.00,
    profitMargin: 55.2, // ((189.9 - 85) / 189.9) * 100
    currentStock: 15,
    reservedStock: 2,
    availableStock: 13,
    minStock: 5,
    weightGrams: 300,
    dimensions: { width: 10, height: 15, depth: 8 },
    images: [{ url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=300", path: "mock", isPrimary: true }],
    channels: { ecommerce: { id: "1", active: true } },
    status: "active"
  },
  {
    sku: "BS-CR-ROSE",
    name: "Body Splash Gold Rose 200ml",
    description: "Névoa perfumada refrescante com toque de glitter ouro rosé.",
    categoryId: catIds[1] || "shared",
    brandId: brandIds[0] || "shared",
    supplierId: supplierIds[0] || "",
    costPrice: 32.00,
    sellPrice: 79.90,
    averageCost: 32.00,
    lastPurchasePrice: 32.00,
    profitMargin: 59.9,
    currentStock: 8,
    reservedStock: 0,
    availableStock: 8,
    minStock: 10, // Alerta: abaixo do estoque mínimo
    weightGrams: 220,
    dimensions: { width: 6, height: 18, depth: 6 },
    images: [{ url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=300", path: "mock", isPrimary: true }],
    channels: {},
    status: "active"
  },
  {
    sku: "SK-NT-HYDRA",
    name: "Sérum Hidratante Hidra Chronos",
    description: "Preenchedor de rugas finas com ácido hialurônico duplo.",
    categoryId: catIds[2] || "shared",
    brandId: brandIds[1] || "shared",
    supplierId: supplierIds[0] || "",
    costPrice: 58.00,
    sellPrice: 129.00,
    averageCost: 58.00,
    lastPurchasePrice: 58.00,
    profitMargin: 55.0,
    currentStock: 3,
    reservedStock: 1,
    availableStock: 2,
    minStock: 2,
    weightGrams: 90,
    dimensions: { width: 5, height: 10, depth: 5 },
    images: [{ url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300", path: "mock", isPrimary: true }],
    channels: {},
    status: "active"
  }
];

export default function ProductsPage() {
  const { tenantId, isMock } = useAuth();
  const { createDoc, getDocs, updateDoc, deleteDoc, softDeleteDoc, invalidateCache } = useDb();

  const [activeTab, setActiveTab] = useState<"products" | "kits" | "categories" | "brands" | "locations">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Ordenação e Ordem Personalizada para Produtos
  const [sortField, setSortField] = useState<"none" | "name" | "sku" | "costPrice" | "sellPrice" | "currentStock" | "potentialProfit">("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [customProductOrder, setCustomProductOrder] = useState<string[]>([]);

  // Ordenação e Ordem Personalizada para Kits
  const [kitSortOption, setKitSortOption] = useState<"manual" | "name_asc" | "name_desc" | "created_at" | "updated_at">("manual");
  const [customKitOrder, setCustomKitOrder] = useState<string[]>([]);
  const [draggedKitId, setDraggedKitId] = useState<string | null>(null);

  // Modo de Exibição das Colunas Extras ("normal" | "select" | "organize")
  const [catalogViewMode, setCatalogViewMode] = useState<"normal" | "select" | "organize">("normal");

  useEffect(() => {
    if (typeof window !== "undefined" && tenantId) {
      const savedMode = localStorage.getItem(`catalog_view_mode_${tenantId}`);
      if (savedMode === "select" || savedMode === "organize" || savedMode === "normal") {
        setCatalogViewMode(savedMode);
      }
    }
  }, [tenantId]);

  const handleToggleCatalogViewMode = (mode: "select" | "organize") => {
    const nextMode = catalogViewMode === mode ? "normal" : mode;
    setCatalogViewMode(nextMode);
    if (typeof window !== "undefined") {
      safeLocalStorageSetItem(`catalog_view_mode_${tenantId}`, nextMode);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedOrder = localStorage.getItem("products_custom_order");
      if (savedOrder) {
        try {
          const parsed = JSON.parse(savedOrder);
          if (Array.isArray(parsed)) setCustomProductOrder(parsed);
        } catch (e) {
          console.error("Erro ao carregar ordem de produtos:", e);
        }
      }
      const savedKitOrder = localStorage.getItem(`kits_custom_order_${tenantId}`);
      if (savedKitOrder) {
        try {
          const parsedKitOrder = JSON.parse(savedKitOrder);
          if (Array.isArray(parsedKitOrder)) setCustomKitOrder(parsedKitOrder);
        } catch (e) {
          console.error("Erro ao carregar ordem dos kits:", e);
        }
      }
    }
  }, [tenantId]);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, stockFilter, selectedCategory, selectedStatusFilter, itemsPerPage, sortField, sortDir]);

  // DB Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrandList] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Product Form Fields
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [barcode, setBarcode] = useState("");
  const [ean, setEan] = useState("");
  const [ncm, setNcm] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [costPrice, setCostPrice] = useState(0);
  // Custos de Aquisição Compostos
  const [freightCost, setFreightCost] = useState(0);
  const [insuranceCost, setInsuranceCost] = useState(0);
  const [taxCost, setTaxCost] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [freightMode, setFreightMode] = useState<"unit" | "apportionment">("unit");
  const [totalFreightCost, setTotalFreightCost] = useState(0);
  const [totalFreightUnits, setTotalFreightUnits] = useState(1);

  // Frete Efetivo Unitário
  const effectiveFreight = freightMode === "apportionment"
    ? (totalFreightUnits > 0 ? totalFreightCost / totalFreightUnits : 0)
    : freightCost;

  // Custo Total de Aquisição (Fornecedor + Frete Efetivo + Seguro + Impostos + Outras Despesas)
  const computedTotalAcquisition = (costPrice || 0) + (effectiveFreight || 0) + (insuranceCost || 0) + (taxCost || 0) + (otherExpenses || 0);

  const [sellPrice, setSellPrice] = useState(0);
  const [promoPrice, setPromoPrice] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [weightGrams, setWeightGrams] = useState(0);
  
  // Dimensions
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [depth, setDepth] = useState(0);
  const [hasDimensions, setHasDimensions] = useState(false);

  // Stocks
  const [currentStock, setCurrentStock] = useState(0);
  const [reservedStock, setReservedStock] = useState(0);

  // Image Upload simulated Base64
  const [imageBase64, setImageBase64] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pricing Simulator State
  const [pricingData, setPricingData] = useState<ProductPricingData | undefined>(undefined);
  const [showSimulatorInDrawer, setShowSimulatorInDrawer] = useState<boolean>(false);

  // Categoria/Marca auxiliary simple forms
  const [editingAuxId, setEditingAuxId] = useState<string | null>(null);
  const [auxName, setAuxName] = useState("");
  const [auxDesc, setAuxDesc] = useState("");
  const [auxStatus, setAuxStatus] = useState<"active" | "inactive">("active");
  const [auxIsVirtual, setAuxIsVirtual] = useState(false);

  // Product Kits State
  const [kits, setKits] = useState<ProductKit[]>([]);
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [kitName, setKitName] = useState("");
  const [kitSku, setKitSku] = useState("");
  const [kitDescription, setKitDescription] = useState("");
  const [kitPrice, setKitPrice] = useState(0);
  const [kitImage, setKitImage] = useState("");
  const [kitItems, setKitItems] = useState<ProductKitItem[]>([]);

  // Carregar todos os dados do banco (Paralelizado e Reativo)
  const loadAllData = async () => {
    console.log("⏱️ [DEBUG ProductsPage] 1. Início do carregamento da página (loadAllData)... tenantId =", tenantId);
    console.log("⏱️ [DEBUG ProductsPage] 2. Antes de alterar loading=true");
    setLoading(true);
    try {
      console.log("⏱️ [DEBUG ProductsPage] 3. Antes da consulta inicial ao Firestore (Promise.all getDocs)...");
      let [cats, brs, locs, supps, prods, fetchedKits] = await Promise.all([
        getDocs("categories"),
        getDocs("brands"),
        getDocs("stock_locations"),
        getDocs("suppliers"),
        getDocs("products"),
        getDocs("product_kits")
      ]);
      console.log("⏱️ [DEBUG ProductsPage] 4. Após a consulta inicial ao Firestore.");
      console.log("⏱️ [DEBUG ProductsPage] Resumo retornado:", {
        catsLength: (cats as any[])?.length,
        brsLength: (brs as any[])?.length,
        locsLength: (locs as any[])?.length,
        suppsLength: (supps as any[])?.length,
        prodsLength: (prods as any[])?.length,
        kitsLength: (fetchedKits as any[])?.length,
      });

      cats = (cats as Category[]) || [];
      brs = (brs as Brand[]) || [];
      locs = (locs as StockLocation[]) || [];
      supps = (supps as any[]) || [];
      prods = (prods as Product[]) || [];
      setKits((fetchedKits as ProductKit[]) || []);

      // Pre-seed se o mock ou banco estiver zerado (Apenas na primeira vez)
      const isCatsSeeded = typeof window !== "undefined" && localStorage.getItem("seeded_categories_v2") === "true";
      const isProdsSeeded = typeof window !== "undefined" && localStorage.getItem("seeded_products_v2") === "true";

      let needsRefetch = false;
      if (cats.length === 0 && !isCatsSeeded) {
        console.log("⏱️ [DEBUG ProductsPage] 5. Categorias zeradas. Criando categorias iniciais no Firestore...");
        await Promise.all(INITIAL_CATEGORIES.map(c => createDoc("categories", c)));
        if (typeof window !== "undefined") localStorage.setItem("seeded_categories_v2", "true");
        needsRefetch = true;
      }
      if (brs.length === 0) {
        console.log("⏱️ [DEBUG ProductsPage] 6. Marcas zeradas. Criando marcas iniciais no Firestore...");
        await Promise.all(INITIAL_BRANDS.map(b => createDoc("brands", b)));
        needsRefetch = true;
      }
      if (locs.length === 0) {
        console.log("⏱️ [DEBUG ProductsPage] 7. Locais zerados. Criando locais iniciais no Firestore...");
        await Promise.all(INITIAL_LOCATIONS.map(l => createDoc("stock_locations", l)));
        needsRefetch = true;
      }

      if (needsRefetch) {
        console.log("⏱️ [DEBUG ProductsPage] 8. Recarregando categorias/marcas/locais recém-criados...");
        const [freshCats, freshBrs, freshLocs] = await Promise.all([
          getDocs("categories"),
          getDocs("brands"),
          getDocs("stock_locations")
        ]);
        cats = (freshCats as Category[]) || [];
        brs = (freshBrs as Brand[]) || [];
        locs = (freshLocs as StockLocation[]) || [];
      }

      const catIds = (cats as any[]).filter(Boolean).map((c: any) => c.id || "");
      const brandIds = (brs as any[]).filter(Boolean).map((b: any) => b.id || "");
      const suppIds = (supps as any[]).filter(Boolean).map((s: any) => s.id || "");

      if (prods.length === 0 && !isProdsSeeded) {
        console.log("⏱️ [DEBUG ProductsPage] 9. Produtos zerados. Criando produtos iniciais no Firestore...");
        await Promise.all(INITIAL_PRODUCTS(catIds, brandIds, suppIds).map(p => createDoc("products", p)));
        if (typeof window !== "undefined") localStorage.setItem("seeded_products_v2", "true");
        prods = (await getDocs("products") as Product[]) || [];
      }

      // 1. Deduplicação em product_kits (Purga documentos duplicados com mesmo SKU ou ID)
      const rawKits = (fetchedKits as ProductKit[]) || [];
      const uniqueKits: ProductKit[] = [];
      const seenKitKeys = new Set<string>();

      for (const k of rawKits) {
        if (!k || !k.id) continue;
        const key = k.sku ? `sku:${k.sku}` : `id:${k.id}`;
        if (seenKitKeys.has(key)) {
          deleteDoc("product_kits", k.id).catch(() => {});
        } else {
          seenKitKeys.add(key);
          seenKitKeys.add(`id:${k.id}`);
          uniqueKits.push(k);
        }
      }

      // 2. Deduplicação em products (Purga documentos de produtos e espelhos de kits duplicados)
      const uniqueProducts: Product[] = [];
      const seenProductKeys = new Set<string>();

      for (const p of prods) {
        if (!p || !p.id) continue;
        const key = p.isKit && p.kitId 
          ? `kit:${p.kitId}` 
          : p.sku ? `sku:${p.sku}` : `id:${p.id}`;

        if (seenProductKeys.has(key)) {
          if (p.isKit) {
            deleteDoc("products", p.id).catch(() => {});
          }
        } else {
          seenProductKeys.add(key);
          seenProductKeys.add(`id:${p.id}`);
          uniqueProducts.push(p);
        }
      }

      prods = uniqueProducts;

      setCategories(cats);
      setBrandList(brs);
      setLocations(locs);
      setSuppliers(supps);
      setProducts(prods);

      // Auditoria & Sincronização Automática dos Custos dos Kits existentes
      const auditedKits = [...uniqueKits];
      for (let i = 0; i < auditedKits.length; i++) {
        const kit = auditedKits[i];
        const realCalculatedCost = (kit.items || []).reduce((sum, item) => {
          const prod = prods.find(p => p.id === item.productId);
          if (!prod) return sum;
          const prodCost = (prod.totalAcquisitionCost && prod.totalAcquisitionCost > 0) ? prod.totalAcquisitionCost : (prod.costPrice || 0);
          return sum + (prodCost * (item.quantity || 1));
        }, 0);

        const realMargin = kit.price > 0 ? parseFloat((((kit.price - realCalculatedCost) / kit.price) * 100).toFixed(1)) : 0;

        if (Math.abs((kit.costPrice || 0) - realCalculatedCost) > 0.01 || Math.abs((kit.profitMargin || 0) - realMargin) > 0.1) {
          auditedKits[i] = {
            ...kit,
            costPrice: realCalculatedCost,
            totalAcquisitionCost: realCalculatedCost,
            profitMargin: realMargin
          };
          updateDoc("product_kits", kit.id, {
            costPrice: realCalculatedCost,
            totalAcquisitionCost: realCalculatedCost,
            profitMargin: realMargin
          }).catch(err => console.error("Erro ao sincronizar custo do kit:", err));

          const mirrorProd = prods.find(p => p.isKit && p.kitId === kit.id);
          if (mirrorProd) {
            updateDoc("products", mirrorProd.id, {
              costPrice: realCalculatedCost,
              totalAcquisitionCost: realCalculatedCost,
              profitMargin: realMargin
            }).catch(err => console.error("Erro ao sincronizar espelho do kit:", err));
          }
        }
      }
      setKits(auditedKits);
    } catch (e: any) {
      console.error("❌ [DEBUG ProductsPage] ERRO em loadAllData:");
      console.error("❌ Error Code:", e?.code);
      console.error("❌ Error Message:", e?.message);
      console.error("❌ Error Stack:", e?.stack);
      setCategories([]);
      setBrandList([]);
      setLocations([]);
      setSuppliers([]);
      setProducts([]);
    } finally {
      console.log("⏱️ [DEBUG ProductsPage] 10. Antes de alterar loading=false");
      setLoading(false);
      console.log("⏱️ [DEBUG ProductsPage] 11. Fim do carregamento da página (loadAllData).");
    }
  };

  useEffect(() => {
    loadAllData();
  }, [tenantId]);

  // Progress & Error states for Uploads
  const [uploadProgressProduct, setUploadProgressProduct] = useState<number | null>(null);
  const [uploadErrorProduct, setUploadErrorProduct] = useState<string | null>(null);
  const [uploadProgressKit, setUploadProgressKit] = useState<number | null>(null);
  const [uploadErrorKit, setUploadErrorKit] = useState<string | null>(null);

  // Upload de Imagem de Produto (Até 20MB com Canvas Resize + Progress Bar)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErrorProduct(null);
    setUploadProgressProduct(0);

    const res = await processImageUpload(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      onProgress: (percent) => setUploadProgressProduct(percent)
    });

    if (res.success && res.dataUrl) {
      setImageBase64(res.dataUrl);
      setTimeout(() => setUploadProgressProduct(null), 1000);
    } else {
      setUploadErrorProduct(res.errorMessage || "Erro ao carregar a imagem.");
      setUploadProgressProduct(null);
    }
  };

  // Upload de Imagem de Kit (Até 20MB com Canvas Resize + Progress Bar)
  const handleKitImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErrorKit(null);
    setUploadProgressKit(0);

    const res = await processImageUpload(file, {
      maxWidth: 1000,
      maxHeight: 1000,
      onProgress: (percent) => setUploadProgressKit(percent)
    });

    if (res.success && res.dataUrl) {
      setKitImage(res.dataUrl);
      setTimeout(() => setUploadProgressKit(null), 1000);
    } else {
      setUploadErrorKit(res.errorMessage || "Erro ao carregar a imagem do kit.");
      setUploadProgressKit(null);
    }
  };

  // Abrir Drawer para Novo Produto
  const handleNewProduct = () => {
    setEditingId(null);
    setSku("");
    setName("");
    setDescription("");
    setBarcode("");
    setEan("");
    setNcm("");
    setCategoryId(categories[0]?.id || "");
    setBrandId(brands[0]?.id || "");
    setSupplierId(suppliers[0]?.id || "");
    setCostPrice(0);
    setFreightCost(0);
    setInsuranceCost(0);
    setTaxCost(0);
    setOtherExpenses(0);
    setFreightMode("unit");
    setTotalFreightCost(0);
    setTotalFreightUnits(1);
    setSellPrice(0);
    setPromoPrice(0);
    setMinStock(0);
    setWeightGrams(0);
    setWidth(0);
    setHeight(0);
    setDepth(0);
    setHasDimensions(false);
    setCurrentStock(0);
    setReservedStock(0);
    setImageBase64("");
    setPricingData(undefined);
    setShowSimulatorInDrawer(false);
    setErrors({});
    setDrawerOpen(true);
  };

  // Abrir Drawer para Editar Produto
  const handleEditProduct = (item: Product) => {
    setEditingId(item.id);
    setSku(item.sku || "");
    setName(item.name || "");
    setDescription(item.description || "");
    setBarcode(item.barcode || "");
    setEan(item.EAN || "");
    setNcm(item.NCM || "");
    setCategoryId(item.categoryId || "");
    setBrandId(item.brandId || "");
    setSupplierId(item.supplierId || "");
    setCostPrice(item.costPrice || 0);
    setFreightCost(item.freightCost || 0);
    setInsuranceCost(item.insuranceCost || 0);
    setTaxCost(item.taxCost || 0);
    setOtherExpenses(item.otherExpenses || 0);
    setFreightMode(item.freightMode || "unit");
    setTotalFreightCost(item.totalFreightCost || 0);
    setTotalFreightUnits(item.totalFreightUnits || 1);
    setSellPrice(item.sellPrice || 0);
    setPromoPrice(item.promoPrice || 0);
    setMinStock(item.minStock || 0);
    setWeightGrams(item.weightGrams || 0);
    setPricingData(item.pricingData);
    setShowSimulatorInDrawer(false);
    
    if (item.dimensions) {
      setWidth(item.dimensions.width || 0);
      setHeight(item.dimensions.height || 0);
      setDepth(item.dimensions.depth || 0);
      setHasDimensions(true);
    } else {
      setWidth(0);
      setHeight(0);
      setDepth(0);
      setHasDimensions(false);
    }

    setCurrentStock(item.currentStock || 0);
    setReservedStock(item.reservedStock || 0);
    setImageBase64(item.images?.[0]?.url || "");
    setErrors({});
    setDrawerOpen(true);
  };

  // Excluir Produto
  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Deseja mover o produto "${name}" para a Lixeira Inteligente?`)) {
      try {
        if (typeof window !== "undefined") localStorage.setItem("seeded_products_v2", "true");
        await softDeleteDoc("products", id, "Produtos", name);
        invalidateCache("products");
        setProducts(prev => prev.filter(p => p.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        await loadAllData();
      } catch (err: any) {
        alert(err.message || "Erro ao deletar.");
      }
    }
  };

  // Batch Handlers
  const toggleSelectAllProducts = (filteredList: Product[]) => {
    if (selectedIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(p => p.id));
    }
  };

  const toggleSelectDocProduct = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBatchDeleteProducts = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja mover os ${selectedIds.length} produtos selecionados para a Lixeira Inteligente?`)) {
      try {
        if (typeof window !== "undefined") localStorage.setItem("seeded_products_v2", "true");
        for (const id of selectedIds) {
          const prod = products.find(p => p.id === id);
          await softDeleteDoc("products", id, "Produtos", prod?.name || "Produto");
        }
        invalidateCache("products");
        setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        await loadAllData();
        alert(`${selectedIds.length} produtos movidos para a Lixeira com sucesso.`);
      } catch (err: any) {
        alert(err.message || "Erro ao excluir produtos em lote.");
      }
    }
  };

  const handleBatchStatusChangeProducts = async (newStatus: "active" | "inactive") => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => updateDoc("products", id, { status: newStatus })));
      invalidateCache("products");
      setProducts(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, status: newStatus } : p));
      setSelectedIds([]);
      alert(`Status de ${selectedIds.length} produtos alterado para ${newStatus === "active" ? "Ativo" : "Inativo"}.`);
    } catch (err: any) {
      alert(err.message || "Erro ao alterar status em lote.");
    }
  };

  const handleBatchExportProducts = () => {
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
    if (selectedProducts.length === 0) return;
    let csvContent = `data:text/csv;charset=utf-8,SKU;Nome;PrecoCusto;PrecoVenda;EstoqueAtual;Status\n`;
    selectedProducts.forEach(p => {
      csvContent += `"${p.sku}";"${p.name}";"${p.costPrice}";"${p.sellPrice}";"${p.currentStock}";"${p.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Produtos_Selecionados_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Salvar Produto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    // Calcular margem baseada no Custo Total de Aquisição: ((sellPrice - computedTotalAcquisition) / sellPrice) * 100
    const calculatedMargin = sellPrice > 0 ? parseFloat((((sellPrice - computedTotalAcquisition) / sellPrice) * 100).toFixed(1)) : 0;
    
    // Calcular estoque disponível: currentStock - reservedStock
    const calculatedAvailable = currentStock - reservedStock;

    const dimensionsPayload = hasDimensions ? {
      width,
      height,
      depth
    } : undefined;

    const imagesPayload = imageBase64 ? [{
      url: imageBase64,
      path: "products/image",
      isPrimary: true
    }] : [];

    const payload = {
      sku,
      name,
      description: description || undefined,
      barcode: barcode || undefined,
      EAN: ean || undefined,
      NCM: ncm || undefined,
      categoryId,
      brandId,
      supplierId: supplierId || undefined,
      costPrice,
      freightCost: effectiveFreight,
      insuranceCost,
      taxCost,
      otherExpenses,
      freightMode,
      totalFreightCost,
      totalFreightUnits,
      totalAcquisitionCost: computedTotalAcquisition,
      sellPrice,
      promoPrice: promoPrice || undefined,
      profitMargin: calculatedMargin,
      currentStock,
      reservedStock,
      availableStock: calculatedAvailable,
      minStock,
      weightGrams: weightGrams || undefined,
      dimensions: dimensionsPayload,
      images: imagesPayload,
      pricingData,
      status: "active" as const
    };

    // Validação Zod
    const result = ProductSchema.safeParse(payload);
    if (!result.success) {
      const errorMap: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const path = issue.path.join(".");
        errorMap[path] = issue.message;
      });
      setErrors(errorMap);
      return;
    }

    try {
      if (typeof window !== "undefined") localStorage.setItem("seeded_products_v2", "true");
      let savedProdId = editingId;
      if (editingId) {
        await updateDoc("products", editingId, payload);
      } else {
        const newDoc = await createDoc("products", payload);
        savedProdId = newDoc.id;
      }

      // Auto-recalcular custos de todos os Kits que contêm este produto
      if (savedProdId) {
        const affectedKits = kits.filter(k => k.items?.some(item => item.productId === savedProdId));
        for (const kit of affectedKits) {
          const newKitCost = kit.items.reduce((sum, item) => {
            const p = item.productId === savedProdId 
              ? { ...payload, id: savedProdId } 
              : products.find(prod => prod.id === item.productId);
            const pCost = (p?.totalAcquisitionCost && p.totalAcquisitionCost > 0) ? p.totalAcquisitionCost : (p?.costPrice || 0);
            return sum + (pCost * (item.quantity || 1));
          }, 0);

          const newKitMargin = kit.price > 0 ? parseFloat((((kit.price - newKitCost) / kit.price) * 100).toFixed(1)) : 0;

          await updateDoc("product_kits", kit.id, {
            costPrice: newKitCost,
            totalAcquisitionCost: newKitCost,
            profitMargin: newKitMargin
          });

          const prodKitMirror = products.find(p => p.isKit && p.kitId === kit.id);
          if (prodKitMirror) {
            await updateDoc("products", prodKitMirror.id, {
              costPrice: newKitCost,
              totalAcquisitionCost: newKitCost,
              profitMargin: newKitMargin
            });
          }
        }
      }

      invalidateCache("products");
      invalidateCache("product_kits");
      setDrawerOpen(false);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar.");
    }
  };

  // Editar Registro Auxiliar (Categorias, Marcas, Locais)
  const handleEditAuxiliary = (item: any) => {
    setEditingAuxId(item.id);
    setAuxName(item.name || "");
    setAuxDesc(item.description || "");
    setAuxStatus(item.status || "active");
    setAuxIsVirtual(item.isVirtual || false);
  };

  // Salvar Registro Auxiliar (Criar ou Editar Categorias, Marcas, Locais)
  const handleSaveAuxiliary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auxName.trim()) return;

    try {
      const colName = activeTab === "locations" ? "stock_locations" : activeTab;
      if (typeof window !== "undefined") {
        if (activeTab === "categories") localStorage.setItem("seeded_categories_v2", "true");
      }

      if (activeTab === "categories") {
        const slug = auxName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
        const payload = { name: auxName, description: auxDesc, slug, status: auxStatus };
        if (editingAuxId) {
          await updateDoc("categories", editingAuxId, payload);
        } else {
          const result = CategorySchema.safeParse(payload);
          if (!result.success) { alert(result.error.issues[0].message); return; }
          await createDoc("categories", payload);
        }
      } else if (activeTab === "brands") {
        const payload = { name: auxName, description: auxDesc };
        if (editingAuxId) {
          await updateDoc("brands", editingAuxId, payload);
        } else {
          const result = BrandSchema.safeParse(payload);
          if (!result.success) { alert(result.error.issues[0].message); return; }
          await createDoc("brands", payload);
        }
      } else if (activeTab === "locations") {
        const payload = { name: auxName, description: auxDesc, isVirtual: auxIsVirtual, status: "active" as const };
        if (editingAuxId) {
          await updateDoc("stock_locations", editingAuxId, payload);
        } else {
          const result = StockLocationSchema.safeParse(payload);
          if (!result.success) { alert(result.error.issues[0].message); return; }
          await createDoc("stock_locations", payload);
        }
      }

      invalidateCache(colName);
      setEditingAuxId(null);
      setAuxName("");
      setAuxDesc("");
      setAuxStatus("active");
      setAuxIsVirtual(false);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar registro.");
    }
  };

  // Deletar Auxiliares
  const handleDeleteAuxiliary = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir "${name}"?`)) {
      try {
        const colName = activeTab === "locations" ? "stock_locations" : activeTab;
        if (typeof window !== "undefined" && activeTab === "categories") {
          localStorage.setItem("seeded_categories_v2", "true");
        }
        await deleteDoc(colName, id);
        invalidateCache(colName);
        if (activeTab === "categories") {
          setCategories(prev => prev.filter(c => c.id !== id));
        } else if (activeTab === "brands") {
          setBrandList(prev => prev.filter(b => b.id !== id));
        } else {
          setLocations(prev => prev.filter(l => l.id !== id));
        }
        await loadAllData();
      } catch (e: any) {
        alert(e.message || "Erro ao excluir.");
      }
    }
  };

  // Handlers para Kits de Produtos
  const handleOpenKitModal = (kit?: ProductKit) => {
    if (kit) {
      setEditingKitId(kit.id);
      setKitName(kit.name);
      setKitSku(kit.sku);
      setKitDescription(kit.description || "");
      setKitPrice(kit.price);
      setKitImage(kit.image || "");
      setKitItems(kit.items || []);
    } else {
      setEditingKitId(null);
      setKitName("");
      setKitSku(`KIT-${Date.now().toString().slice(-5)}`);
      setKitDescription("");
      setKitPrice(0);
      setKitImage("");
      setKitItems([]);
    }
    setKitModalOpen(true);
  };

  const handleSaveKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitName || kitItems.length === 0 || kitPrice <= 0) {
      alert("Por favor, preencha o nome do kit, valor e selecione ao menos 1 produto componente.");
      return;
    }

    const calculatedKitCost = kitItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return sum;
      const prodCost = (prod.totalAcquisitionCost && prod.totalAcquisitionCost > 0) ? prod.totalAcquisitionCost : (prod.costPrice || 0);
      return sum + (prodCost * (item.quantity || 1));
    }, 0);

    const calculatedMargin = kitPrice > 0 ? parseFloat((((kitPrice - calculatedKitCost) / kitPrice) * 100).toFixed(1)) : 0;

    try {
      const kitPayload = {
        name: kitName,
        sku: kitSku,
        description: kitDescription,
        price: kitPrice,
        costPrice: calculatedKitCost,
        totalAcquisitionCost: calculatedKitCost,
        profitMargin: calculatedMargin,
        image: kitImage,
        items: kitItems,
        status: "active" as const
      };

      let savedKitId = editingKitId;
      const existingKitDoc = kits.find(k => (editingKitId && k.id === editingKitId) || (kitSku && k.sku === kitSku));

      if (existingKitDoc) {
        savedKitId = existingKitDoc.id;
        await updateDoc("product_kits", existingKitDoc.id, kitPayload);
      } else {
        const newKitDoc = await createDoc("product_kits", kitPayload);
        savedKitId = newKitDoc.id;
      }

      // Sync correspondente como produto especial no catálogo (para o PDV)
      const kitProductPayload = {
        sku: kitSku,
        name: `[KIT] ${kitName}`,
        description: kitDescription,
        categoryId: categories[0]?.id || "kits",
        brandId: brands[0]?.id || "kits",
        costPrice: calculatedKitCost,
        totalAcquisitionCost: calculatedKitCost,
        sellPrice: kitPrice,
        profitMargin: calculatedMargin,
        currentStock: 999, // Estoque virtual gerenciado dinamicamente pelos componentes
        availableStock: 999,
        reservedStock: 0,
        minStock: 1,
        images: kitImage ? [{ url: kitImage, path: "kit", isPrimary: true }] : [],
        channels: { ecommerce: { id: "1", active: true } },
        status: "active" as const,
        isKit: true,
        kitId: savedKitId
      };

      // Localizar TODOS os espelhos deste kit no catálogo de produtos para evitar duplicações
      const matchingProdKits = products.filter(p => p.isKit && (p.kitId === savedKitId || (p.sku && p.sku === kitSku)));
      if (matchingProdKits.length > 0) {
        // Atualizar o primeiro documento oficial
        await updateDoc("products", matchingProdKits[0].id, kitProductPayload);
        // Deletar silenciosamente quaisquer duplicatas extras
        for (let i = 1; i < matchingProdKits.length; i++) {
          await deleteDoc("products", matchingProdKits[i].id).catch(() => {});
        }
      } else {
        await createDoc("products", kitProductPayload);
      }

      invalidateCache("product_kits");
      invalidateCache("products");
      setKitModalOpen(false);
      await loadAllData();
      alert("Kit de produtos salvo com sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar kit.");
    }
  };

  const handleDeleteKit = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o Kit "${name}"?`)) {
      try {
        await deleteDoc("product_kits", id);
        const kitProd = products.find(p => p.isKit && p.kitId === id);
        if (kitProd) {
          await deleteDoc("products", kitProd.id);
        }
        invalidateCache("product_kits");
        invalidateCache("products");
        await loadAllData();
        alert("Kit excluído com sucesso.");
      } catch (err: any) {
        alert(err.message || "Erro ao excluir Kit.");
      }
    }
  };

  // Handlers para Ordenação e Ordem Personalizada dos Produtos
  const handleSort = (field: "name" | "sku" | "costPrice" | "sellPrice" | "currentStock" | "potentialProfit") => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleMoveProduct = (index: number, direction: "up" | "down") => {
    const list = [...sortedAndFilteredProducts];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const newOrderIds = list.map(p => p.id);
    setCustomProductOrder(newOrderIds);
    if (typeof window !== "undefined") {
      localStorage.setItem("products_custom_order", JSON.stringify(newOrderIds));
    }
  };

  const handleResetProductOrder = () => {
    setCustomProductOrder([]);
    setSortField("none");
    if (typeof window !== "undefined") {
      localStorage.removeItem("products_custom_order");
    }
  };

  // Salvar Ordem dos Kits no Storage Local
  const handleSaveKitOrder = (newOrderIds: string[]) => {
    setCustomKitOrder(newOrderIds);
    if (typeof window !== "undefined") {
      safeLocalStorageSetItem(`kits_custom_order_${tenantId}`, JSON.stringify(newOrderIds));
    }
  };

  const handleMoveKit = (index: number, direction: "up" | "down") => {
    const list = [...sortedAndFilteredKits];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const newOrderIds = list.map(k => k.id);
    handleSaveKitOrder(newOrderIds);
  };

  const handleResetKitOrder = () => {
    setCustomKitOrder([]);
    setKitSortOption("manual");
    if (typeof window !== "undefined") {
      localStorage.removeItem(`kits_custom_order_${tenantId}`);
    }
  };

  // Funções de Arrastar e Soltar (Drag & Drop) para Kits
  const handleKitDragStart = (e: React.DragEvent, id: string) => {
    setDraggedKitId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleKitDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleKitDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedKitId || draggedKitId === targetId) return;

    const list = [...sortedAndFilteredKits];
    const sourceIndex = list.findIndex(k => k.id === draggedKitId);
    const targetIndex = list.findIndex(k => k.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedKit] = list.splice(sourceIndex, 1);
    list.splice(targetIndex, 0, movedKit);

    const newOrderIds = list.map(k => k.id);
    handleSaveKitOrder(newOrderIds);
    setDraggedKitId(null);
  };

  // Filtragem e Ordenação dos Kits
  const sortedAndFilteredKits = React.useMemo(() => {
    let list = (kits || []).filter(k => {
      if (!k) return false;
      const searchStr = (searchQuery || "").toLowerCase();
      const matchName = (k.name || "").toLowerCase().includes(searchStr);
      const matchSku = (k.sku || "").toLowerCase().includes(searchStr);
      return matchName || matchSku;
    });

    if (kitSortOption === "name_asc") {
      return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (kitSortOption === "name_desc") {
      return list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    }
    if (kitSortOption === "created_at") {
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    if (kitSortOption === "updated_at") {
      return list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    }

    // Ordenação Manual por Drag and Drop
    if (customKitOrder.length > 0) {
      return list.sort((a, b) => {
        const idxA = customKitOrder.indexOf(a.id);
        const idxB = customKitOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return list;
  }, [kits, searchQuery, kitSortOption, customKitOrder]);

  // Filtragem e Ordenação de Produtos
  const sortedAndFilteredProducts = React.useMemo(() => {
    const seenKeys = new Set<string>();
    const list = (products || []).filter(p => {
      if (!p || !p.id) return false;

      // Garantir que nenhum produto ou kit duplicado seja renderizado
      const uniqueKey = p.isKit && p.kitId ? `kit:${p.kitId}` : `id:${p.id}`;
      if (seenKeys.has(uniqueKey)) return false;
      seenKeys.add(uniqueKey);

      const nameStr = (p.name || "").toLowerCase();
      const skuStr = (p.sku || "").toLowerCase();
      const searchStr = (searchQuery || "").toLowerCase();
      const matchQuery = nameStr.includes(searchStr) || skuStr.includes(searchStr);
      
      let matchCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
      let matchStatus = selectedStatusFilter === "all" || p.status === selectedStatusFilter;

      let matchStock = true;
      const avail = p.availableStock ?? 0;
      const min = p.minStock ?? 0;
      if (stockFilter === "low") {
        matchStock = avail <= min;
      } else if (stockFilter === "out") {
        matchStock = avail === 0;
      }

      return matchQuery && matchCategory && matchStatus && matchStock;
    });

    if (sortField !== "none") {
      return list.sort((a, b) => {
        let valA: any = 0;
        let valB: any = 0;

        if (sortField === "potentialProfit") {
          const costA = a.totalAcquisitionCost && a.totalAcquisitionCost > 0 ? a.totalAcquisitionCost : a.costPrice;
          const costB = b.totalAcquisitionCost && b.totalAcquisitionCost > 0 ? b.totalAcquisitionCost : b.costPrice;
          valA = Math.max(0, (a.sellPrice - costA) * a.currentStock);
          valB = Math.max(0, (b.sellPrice - costB) * b.currentStock);
        } else {
          valA = a[sortField] ?? 0;
          valB = b[sortField] ?? 0;
        }

        if (typeof valA === "string") {
          return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
      });
    }

    if (customProductOrder.length > 0) {
      return list.sort((a, b) => {
        const idxA = customProductOrder.indexOf(a.id);
        const idxB = customProductOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return list;
  }, [products, searchQuery, selectedCategory, selectedStatusFilter, stockFilter, sortField, sortDir, customProductOrder]);

  const filteredProducts = sortedAndFilteredProducts;

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Mapeamento de Categoria e Marca para exibição (Otimizado)
  const categoryMap = React.useMemo(() => {
    return (categories || []).reduce((acc, cat) => {
      if (cat && cat.id) acc[cat.id] = cat.name || "";
      return acc;
    }, {} as Record<string, string>);
  }, [categories]);

  const brandMap = React.useMemo(() => {
    return (brands || []).reduce((acc, br) => {
      if (br && br.id) acc[br.id] = br.name || "";
      return acc;
    }, {} as Record<string, string>);
  }, [brands]);

  const liveKitCost = React.useMemo(() => {
    return kitItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return sum;
      const prodCost = (prod.totalAcquisitionCost && prod.totalAcquisitionCost > 0) ? prod.totalAcquisitionCost : (prod.costPrice || 0);
      return sum + (prodCost * (item.quantity || 1));
    }, 0);
  }, [kitItems, products]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-light">Controle de <span className="font-semibold text-rosegold-500">Produtos & Estoque</span></h1>
          <p className="text-xs text-muted-foreground">Catálogo unificado de SKU's, categorias, marcas e controle físico de galpões.</p>
        </div>
        
        {activeTab === "products" && (
          <button
            onClick={handleNewProduct}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Produto</span>
          </button>
        )}

        {activeTab === "kits" && (
          <button
            onClick={() => handleOpenKitModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Kit de Produtos</span>
          </button>
        )}
      </div>

      {/* 2. Seleção de Abas & Filtros */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Abas */}
        <div className="flex border border-border bg-card/40 rounded-xl p-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "products", label: "Catálogo de Produtos", icon: Package },
            { id: "kits", label: "Kits de Produtos", icon: Layers },
            { id: "categories", label: "Categorias", icon: Tag },
            { id: "brands", label: "Marcas", icon: Bookmark },
            { id: "locations", label: "Locais de Estoque", icon: MapPin }
          ].map((tab) => {
            const Icon = tab.icon;
            const count = tab.id === "products" ? products.length : tab.id === "kits" ? kits.length : tab.id === "categories" ? categories.length : tab.id === "brands" ? brands.length : locations.length;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchQuery(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label} ({count})</span>
              </button>
            );
          })}
        </div>

        {/* Barra de Filtros e Controles de Visualização (Apenas para Produtos) */}
        {activeTab === "products" && (
          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 max-w-3xl">
            {/* Botões de Modo de Exibição de Colunas (Ocultar / Selecionar / Organizar) */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border bg-card/60 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleCatalogViewMode("select")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  catalogViewMode === "select"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Ativar modo de seleção por Checkbox"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Selecionar</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleCatalogViewMode("organize")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  catalogViewMode === "organize"
                    ? "bg-amber-500 text-white shadow-xs dark:bg-amber-600"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Ativar modo de reorganização de Ordem (Drag & Drop + Checkbox)"
              >
                <GripVertical className="h-3.5 w-3.5" />
                <span>Organizar</span>
              </button>
            </div>

            {/* Filtro de Estoque */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card"
            >
              <option value="all">Todos os Níveis de Estoque</option>
              <option value="low">Apenas Estoque Baixo (Mín.)</option>
              <option value="out">Sem Estoque (Esgotado)</option>
            </select>

            {/* Caixa de Busca */}
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, SKU, código de barras..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Renderização das Listagens */}
      <div className="border border-border bg-card/40 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Carregando catálogo...</div>
        ) : (
          <div className="overflow-x-auto">
            
            {/* Tabela de Produtos */}
            {activeTab === "products" && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground select-none">
                    {(catalogViewMode === "select" || catalogViewMode === "organize") && (
                      <th className="p-4 w-10 text-center transition-all animate-fade-in">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                          onChange={() => toggleSelectAllProducts(paginatedProducts)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </th>
                    )}
                    {catalogViewMode === "organize" && (
                      <th className="p-4 w-16 text-center transition-all animate-fade-in">Ordem</th>
                    )}
                    <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        <span>Produto</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => handleSort("sku")}>
                      <div className="flex items-center gap-1">
                        <span>SKU / Marca</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => handleSort("sellPrice")}>
                      <div className="flex items-center gap-1">
                        <span>Preços (Custo/Venda)</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4">Margem Lucro</th>
                    <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => handleSort("currentStock")}>
                      <div className="flex items-center gap-1">
                        <span>Estoque (Disp./Mín)</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:text-foreground text-emerald-600 dark:text-emerald-400 font-bold" onClick={() => handleSort("potentialProfit")}>
                      <div className="flex items-center gap-1">
                        <span>Lucro Potencial do Estoque</span>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </div>
                    </th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum produto cadastrado ou encontrado.</td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p, index) => {
                      const globalIdx = (currentPage - 1) * itemsPerPage + index;
                      const isLowStock = p.availableStock <= p.minStock;
                      const isSelected = selectedIds.includes(p.id);
                      const realAcqCost = p.totalAcquisitionCost && p.totalAcquisitionCost > 0 ? p.totalAcquisitionCost : p.costPrice;
                      const unitProfit = p.sellPrice - realAcqCost;
                      const potentialProfit = Math.max(0, unitProfit * p.currentStock);

                      return (
                        <tr key={p.id} className={cn("transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/10")}>
                          {(catalogViewMode === "select" || catalogViewMode === "organize") && (
                            <td className="p-4 text-center transition-all animate-fade-in">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectDocProduct(p.id)}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </td>
                          )}
                          {catalogViewMode === "organize" && (
                            <td className="p-4 text-center transition-all animate-fade-in">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveProduct(globalIdx, "up")}
                                  disabled={globalIdx === 0}
                                  className="p-1 rounded hover:bg-muted border border-border/50 disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveProduct(globalIdx, "down")}
                                  disabled={globalIdx === sortedAndFilteredProducts.length - 1}
                                  className="p-1 rounded hover:bg-muted border border-border/50 disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          )}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                                {p.images?.[0]?.url ? (
                                  <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-4.5 w-4.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-semibold text-foreground">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">{categoryMap[p.categoryId] || "Sem Categoria"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-mono font-semibold text-foreground">{p.sku}</div>
                            <div className="text-[10px] text-muted-foreground">{brandMap[p.brandId] || "Sem Marca"}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{formatCurrency(p.sellPrice)}</span>
                              <span className="text-[10px] text-muted-foreground" title={`Custo Fornecedor: ${formatCurrency(p.costPrice)} | Frete/Outros: ${formatCurrency(realAcqCost - p.costPrice)}`}>
                                Custo Real: {formatCurrency(realAcqCost)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-0.5 w-fit",
                              p.profitMargin >= 50 
                                ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/50" 
                                : "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/50"
                            )}>
                              <TrendingUp className="h-3 w-3" />
                              <span>{p.profitMargin}%</span>
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className={cn("font-bold text-sm", isLowStock ? "text-red-500" : "text-foreground")}>
                                  {p.availableStock} un.
                                </span>
                                <span className="text-[10px] text-muted-foreground">Min: {p.minStock} un.</span>
                              </div>
                              {isLowStock && (
                                <div className="p-1 rounded bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400" title="Estoque abaixo do mínimo!">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Coluna: Lucro Potencial do Estoque */}
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                                {formatCurrency(potentialProfit)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                (R$ {unitProfit.toFixed(2)} × {p.currentStock} un.)
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border",
                              p.status === "active" 
                                ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/30" 
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200/30"
                            )}>
                              {p.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  window.location.href = `/pricing?productId=${p.id}`;
                                }}
                                className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                                title="Simular precificação e taxas de marketplace"
                              >
                                <Calculator className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleEditProduct(p)} className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Editar">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id, p.name)} className="p-1.5 rounded-lg border border-border bg-card/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* Pagination Controls Melhorados */}
            {activeTab === "products" && filteredProducts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/10 select-none text-xs">
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>Exibir:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-border bg-card font-semibold focus:outline-none"
                    >
                      <option value={10}>10 por página</option>
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                    </select>
                  </div>

                  <span className="text-muted-foreground">
                    Exibindo <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length)}</strong>–<strong>{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> de <strong>{filteredProducts.length}</strong> registros
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Primeira Página"
                  >
                    « Primeira
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ‹ Anterior
                  </button>

                  <span className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
                    {currentPage} / {totalPages || 1}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Última Página"
                  >
                    Última »
                  </button>
                </div>

              </div>
            )}

            {/* Listagem de Kits de Produtos */}
            {activeTab === "kits" && (
              <div className="p-6 space-y-4">
                {/* Header de Controle de Ordenação dos Kits */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Gerenciar Ordem dos Kits ({sortedAndFilteredKits.length})
                    </span>
                    {customKitOrder.length > 0 && kitSortOption === "manual" && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        Ordem Personalizada Ativa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-[11px] text-muted-foreground font-semibold">Ordenar Por:</label>
                    <select
                      value={kitSortOption}
                      onChange={(e) => setKitSortOption(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="manual">✨ Ordenação Manual (Drag & Drop)</option>
                      <option value="name_asc">Nome (A-Z)</option>
                      <option value="name_desc">Nome (Z-A)</option>
                      <option value="created_at">Data de Cadastro (Mais Recentes)</option>
                      <option value="updated_at">Última Atualização</option>
                    </select>

                    {customKitOrder.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetKitOrder}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-[11px] font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        title="Restaurar Ordem Padrão"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restaurar Ordem</span>
                      </button>
                    )}
                  </div>
                </div>

                {sortedAndFilteredKits.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <div className="text-sm font-semibold text-foreground">Nenhum Kit de produtos cadastrado ou encontrado</div>
                    <p className="text-xs text-muted-foreground">Crie kits combinando produtos (ex: Kit Victoria Secret com Body Splash + Hidratante).</p>
                    <button
                      onClick={() => handleOpenKitModal()}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95"
                    >
                      + Criar Primeiro Kit
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedAndFilteredKits.map((kit, index) => {
                      const isDragging = draggedKitId === kit.id;

                      return (
                        <div
                          key={kit.id}
                          draggable={kitSortOption === "manual"}
                          onDragStart={(e) => handleKitDragStart(e, kit.id)}
                          onDragOver={handleKitDragOver}
                          onDrop={(e) => handleKitDrop(e, kit.id)}
                          className={cn(
                            "p-5 rounded-2xl border bg-card/60 space-y-4 transition-all shadow-xs relative group",
                            kitSortOption === "manual" ? "cursor-grab active:cursor-grabbing" : "",
                            isDragging ? "opacity-40 border-dashed border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {kitSortOption === "manual" && (
                                <div className="p-1 rounded text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab" title="Arrastar para reordenar">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              )}

                              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                                {kit.image ? (
                                  <img src={kit.image} alt={kit.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Layers className="h-6 w-6 text-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                  <span>{kit.name}</span>
                                  {kitSortOption === "manual" && (
                                    <span className="text-[10px] font-mono text-muted-foreground font-normal">#{index + 1}</span>
                                  )}
                                </h3>
                                <span className="text-[10px] font-mono text-muted-foreground">SKU: {kit.sku}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {kitSortOption === "manual" && (
                                <div className="flex items-center gap-0.5 border-r border-border/60 pr-1 mr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveKit(index, "up")}
                                    disabled={index === 0}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Mover para cima"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveKit(index, "down")}
                                    disabled={index === sortedAndFilteredKits.length - 1}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={() => handleOpenKitModal(kit)}
                                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Editar Kit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteKit(kit.id, kit.name)}
                                className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                title="Excluir Kit"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {kit.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{kit.description}</p>
                          )}

                          <div className="border-t border-border/40 pt-3 space-y-2">
                            <div className="text-[11px] font-semibold text-foreground">Composição do Kit:</div>
                            <div className="space-y-1">
                              {kit.items.map((item, idx) => {
                                const prod = products.find(p => p.id === item.productId);
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg">
                                    <span>{prod?.name || "Produto Removido"}</span>
                                    <span className="font-bold text-foreground">{item.quantity}x</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <span className="text-xs font-semibold text-muted-foreground">Preço do Kit</span>
                            <span className="text-base font-bold text-primary font-mono">{formatCurrency(kit.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Listagem Auxiliares (Categorias / Marcas / Locais) */}
            {activeTab !== "products" && activeTab !== "kits" && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Adicionar/Editar Rápido */}
                <div className="p-5 rounded-xl border border-border bg-card/50 h-fit space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {editingAuxId ? <Edit2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-rosegold-500" />}
                      <span>{editingAuxId ? `Editar ${activeTab === "categories" ? "Categoria" : activeTab === "brands" ? "Marca" : "Local"}` : `Adicionar ${activeTab === "categories" ? "Categoria" : activeTab === "brands" ? "Marca" : "Local"}`}</span>
                    </h3>
                    {editingAuxId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAuxId(null);
                          setAuxName("");
                          setAuxDesc("");
                          setAuxStatus("active");
                          setAuxIsVirtual(false);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-semibold underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                  
                  <form onSubmit={handleSaveAuxiliary} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Nome</label>
                      <input
                        type="text"
                        required
                        value={auxName}
                        onChange={(e) => setAuxName(e.target.value)}
                        placeholder="Ex: Skincare Facial"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Descrição (Opcional)</label>
                      <textarea
                        value={auxDesc}
                        onChange={(e) => setAuxDesc(e.target.value)}
                        placeholder="Breve descrição informativa..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card resize-none"
                      />
                    </div>

                    {activeTab === "categories" && (
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground">Status</label>
                        <select
                          value={auxStatus}
                          onChange={(e) => setAuxStatus(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card font-semibold text-xs"
                        >
                          <option value="active">Ativa</option>
                          <option value="inactive">Inativa</option>
                        </select>
                      </div>
                    )}

                    {activeTab === "locations" && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="auxIsVirtual"
                          checked={auxIsVirtual}
                          onChange={(e) => setAuxIsVirtual(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="auxIsVirtual" className="font-semibold text-muted-foreground select-none cursor-pointer">
                          Local Virtual (Representa Canal Integrado)
                        </label>
                      </div>
                    )}

                    <button type="submit" className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/95 transition-all">
                      {editingAuxId ? "Salvar Alterações" : "Criar Registro"}
                    </button>
                  </form>
                </div>

                {/* Lista Cadastrada */}
                <div className="lg:col-span-2 space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registros Ativos</h3>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {(activeTab === "categories" ? categories : activeTab === "brands" ? brands : locations).map((item) => (
                      <div key={item.id} className="p-3.5 rounded-xl border border-border bg-card/30 flex items-center justify-between hover:bg-muted/10 transition-all">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground text-xs">{item.name}</h4>
                            {activeTab === "categories" && (item as any).status === "inactive" && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                Inativa
                              </span>
                            )}
                          </div>
                          {item.description && <p className="text-[10px] text-muted-foreground">{item.description}</p>}
                          {activeTab === "locations" && (
                            <span className={cn(
                              "inline-block px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider mt-1 border",
                              (item as any).isVirtual 
                                ? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 border-orange-200/50" 
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 border-blue-200/50"
                            )}>
                              {(item as any).isVirtual ? "Virtual (Shopee/ML)" : "Físico"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleEditAuxiliary(item)}
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAuxiliary(item.id, item.name)}
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(activeTab === "categories" ? categories : activeTab === "brands" ? brands : locations).length === 0 && (
                      <div className="py-12 text-center text-xs text-muted-foreground">Nenhum registro cadastrado.</div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}
      </div>

      {/* 4. Form Modal Centralizado e Responsivo (Novo/Editar Produto) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rosegold-500/10 border border-rosegold-500/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-rosegold-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingId ? "Editar Produto" : "Novo Produto"}
                  </h3>
                  <p className="text-xs text-muted-foreground">Preencha as informações do produto, precificação e regras logísticas.</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="space-y-6 text-xs">
              
              {/* Seção 1: Mídia e Identificação do Produto (Grid 3 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Coluna 1: Foto do Produto */}
                <div className="space-y-2">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Foto do Produto</label>
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-2xl bg-muted/10 space-y-3 h-full min-h-[160px]">
                    <div className="h-24 w-24 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      {imageBase64 ? (
                        <img src={imageBase64} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <span className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-xl bg-card hover:bg-muted text-xs font-semibold cursor-pointer transition-all shadow-xs w-full text-center">
                          <Upload className="h-3.5 w-3.5" />
                          <span>{imageBase64 ? "Trocar Foto" : "Carregar Foto"}</span>
                        </span>
                      </label>
                      {uploadProgressProduct !== null && (
                        <div className="w-full space-y-1 my-1">
                          <div className="flex items-center justify-between text-[10px] text-primary font-bold">
                            <span>Processando...</span>
                            <span>{uploadProgressProduct}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-200" style={{ width: `${uploadProgressProduct}%` }} />
                          </div>
                        </div>
                      )}
                      {uploadErrorProduct && (
                        <p className="text-[10px] text-destructive font-semibold text-center mt-1">{uploadErrorProduct}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground text-center">JPG, PNG, WebP (Máx {MAX_IMAGE_SIZE_MB}MB)</p>
                    </div>
                  </div>
                </div>

                {/* Colunas 2 e 3: Dados Principais */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">SKU / Código *</label>
                      <input
                        type="text"
                        required
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Ex: PE-CR-SIGN"
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card font-mono text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                      {errors.sku && <p className="text-[10px] text-destructive mt-0.5">{errors.sku}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome do Produto *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Perfume Carol Ramos Signature 100ml"
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                      {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Descrição do Produto</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva fragrância, notas olfativas, modo de uso ou características..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs resize-none focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Categoria</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Marca</label>
                      <select
                        value={brandId}
                        onChange={(e) => setBrandId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
                      >
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Fornecedor</label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
                      >
                        <option value="">Nenhum</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Seção 2: Códigos Fiscais & Barras (Grid 2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Código EAN (Código de Barras Oficial)</label>
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    placeholder="Ex: 7891234567890"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card font-mono text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">NCM (Fisco / Tributos)</label>
                  <input
                    type="text"
                    value={ncm}
                    onChange={(e) => setNcm(e.target.value)}
                    placeholder="Ex: 33030010"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card font-mono text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção 3: Custos de Aquisição (Composição do Custo Real) */}
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Coins className="h-4 w-4" />
                    <span>Custos de Aquisição (Composição do Custo Real)</span>
                  </h4>
                  <span className="text-[11px] font-bold font-mono text-amber-700 dark:text-amber-300">
                    Custo Total de Aquisição: {formatCurrency(computedTotalAcquisition)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  {/* 1. Custo Fornecedor */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Custo Fornecedor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-2.5 rounded-xl border border-border bg-card font-mono font-bold text-xs"
                    />
                  </div>

                  {/* 2. Frete de Compra */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Frete Compra (R$)</label>
                      <button
                        type="button"
                        onClick={() => setFreightMode(prev => prev === "unit" ? "apportionment" : "unit")}
                        className="text-[9px] text-primary font-bold hover:underline"
                      >
                        {freightMode === "unit" ? "Modo: Unidade" : "Modo: Rateio"}
                      </button>
                    </div>
                    {freightMode === "unit" ? (
                      <input
                        type="number"
                        step="0.01"
                        value={freightCost}
                        onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)}
                        placeholder="0.00 / un"
                        className="w-full p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={totalFreightCost}
                          onChange={(e) => setTotalFreightCost(parseFloat(e.target.value) || 0)}
                          placeholder="Total R$"
                          className="w-1/2 p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                          title="Valor Total do Frete da Compra"
                        />
                        <span className="text-[10px] text-muted-foreground">÷</span>
                        <input
                          type="number"
                          min="1"
                          value={totalFreightUnits}
                          onChange={(e) => setTotalFreightUnits(parseInt(e.target.value) || 1)}
                          placeholder="Qtd un"
                          className="w-1/2 p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                          title="Quantidade Total de Unidades no Lote"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Seguro */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Seguro (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={insuranceCost}
                      onChange={(e) => setInsuranceCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                    />
                  </div>

                  {/* 4. Impostos de Compra */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Impostos Compra (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={taxCost}
                      onChange={(e) => setTaxCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                    />
                  </div>

                  {/* 5. Outras Despesas */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Outras Despesas (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={otherExpenses}
                      onChange={(e) => setOtherExpenses(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Resumo visual da composição */}
                <div className="bg-card/80 p-3 rounded-xl border border-border/60 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
                  <span>Fornecedor: {formatCurrency(costPrice)}</span>
                  <span>+ Frete: {formatCurrency(effectiveFreight)}</span>
                  <span>+ Seguro: {formatCurrency(insuranceCost)}</span>
                  <span>+ Impostos: {formatCurrency(taxCost)}</span>
                  <span>+ Outros: {formatCurrency(otherExpenses)}</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 border-l border-border pl-2">
                    = Custo Total: {formatCurrency(computedTotalAcquisition)}
                  </span>
                </div>
              </div>

              {/* Seção 4: Precificação & Margem (Card Destacado) */}
              <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
                <h4 className="font-bold uppercase tracking-wider text-[10px] text-primary flex items-center gap-1.5">
                  <Coins className="h-4 w-4" />
                  <span>Precificação & Margem sobre Custo Real</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl border border-border bg-card font-mono font-bold text-primary text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Preço Promocional (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(parseFloat(e.target.value) || 0)}
                      placeholder="Opcional"
                      className="w-full p-2.5 rounded-xl border border-border bg-card font-mono text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Margem Bruta Calculada</label>
                    <div className="p-2.5 border border-border rounded-xl bg-card font-bold font-mono text-center text-xs text-rosegold-500 shadow-xs flex items-center justify-center h-[38px]">
                      {sellPrice > 0 ? (((sellPrice - computedTotalAcquisition) / sellPrice) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 4: Quantidade & Controle de Estoque */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/40 pt-4">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Estoque Atual *</label>
                  <input
                    type="number"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card font-mono text-xs font-bold focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Estoque Reservado</label>
                  <input
                    type="number"
                    required
                    value={reservedStock}
                    onChange={(e) => setReservedStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card font-mono text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card font-mono text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção 5: Peso e Dimensões Logísticas */}
              <div className="space-y-3 border-t border-border/40 pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasDimensions"
                    checked={hasDimensions}
                    onChange={(e) => setHasDimensions(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="hasDimensions" className="font-semibold text-foreground text-xs cursor-pointer select-none">
                    Cadastrar Peso e Dimensões Logísticas (Cálculo de Frete / Transportadora)
                  </label>
                </div>

                {hasDimensions && (
                  <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3.5 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Peso (em Gramas)</label>
                        <input
                          type="number"
                          value={weightGrams}
                          onChange={(e) => setWeightGrams(parseInt(e.target.value) || 0)}
                          placeholder="Ex: 250"
                          className="w-full p-2.5 rounded-xl border border-border bg-card font-mono text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Largura (cm)</label>
                        <input
                          type="number"
                          value={width}
                          onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                          placeholder="cm"
                          className="w-full p-2.5 rounded-xl border border-border bg-card text-center font-mono text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Altura (cm)</label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                          placeholder="cm"
                          className="w-full p-2.5 rounded-xl border border-border bg-card text-center font-mono text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Profundidade (cm)</label>
                        <input
                          type="number"
                          value={depth}
                          onChange={(e) => setDepth(parseInt(e.target.value) || 0)}
                          placeholder="cm"
                          className="w-full p-2.5 rounded-xl border border-border bg-card text-center font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção 6: Simulador de Precificação de Marketplaces */}
              <div className="pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowSimulatorInDrawer(!showSimulatorInDrawer)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-xs font-bold text-primary select-none"
                >
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span>Simulador de Custos & Precificação (Shopee, Mercado Livre, Amazon)</span>
                  </div>
                  {showSimulatorInDrawer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showSimulatorInDrawer && (
                  <div className="mt-3 p-4 rounded-2xl border border-border bg-card space-y-4 animate-in fade-in duration-200">
                    <p className="text-[11px] text-muted-foreground">
                      Simule taxas, despesas e margens reais deste produto para Shopee, Mercado Livre, Amazon e outros canais.
                    </p>
                    <PricingSimulator
                      initialCostPrice={costPrice}
                      initialSellPrice={sellPrice}
                      initialPricingData={pricingData}
                      isEmbeddedInProductModal={true}
                      onSaveToProduct={(data, calculatedSellPrice) => {
                        setPricingData(data);
                        if (calculatedSellPrice && calculatedSellPrice > 0) {
                          setSellPrice(calculatedSellPrice);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-5 py-2.5 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                >
                  {editingId ? "Salvar Alterações" : "Cadastrar Produto"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Batch Action Bar (Produtos) */}
      {activeTab === "products" && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-2xl border border-primary/40 shadow-2xl rounded-2xl p-3 px-5 flex flex-wrap items-center gap-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-extrabold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-foreground">
              {selectedIds.length === 1 ? "1 produto selecionado" : `${selectedIds.length} produtos selecionados`}
            </span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchStatusChangeProducts("active")}
              className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all"
            >
              Marcar como Ativos
            </button>

            <button
              onClick={() => handleBatchStatusChangeProducts("inactive")}
              className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all"
            >
              Marcar como Inativos
            </button>

            <button
              onClick={handleBatchExportProducts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all"
            >
              Exportar CSV
            </button>

            <button
              onClick={handleBatchDeleteProducts}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold transition-all shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir Selecionados</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-all"
              title="Cancelar Seleção"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Kit de Produtos */}
      {kitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingKitId ? "Editar Kit de Produtos" : "Novo Kit de Produtos"}
                  </h2>
                  <p className="text-xs text-muted-foreground">Combine múltiplos produtos e defina um preço de oferta para o kit.</p>
                </div>
              </div>
              <button
                onClick={() => setKitModalOpen(false)}
                className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKit} className="space-y-5 text-xs">
              
              {/* Foto do Kit & Dados Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Upload Foto do Kit */}
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-foreground">Foto do Kit</label>
                  <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-2xl bg-muted/10 space-y-2 h-full min-h-[140px]">
                    <div className="h-20 w-20 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                      {kitImage ? (
                        <img src={kitImage} alt="Kit Preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1 w-full">
                      <label className="w-full">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleKitImageChange}
                          className="hidden"
                        />
                        <span className="flex items-center justify-center gap-1 px-3 py-1.5 border border-border rounded-xl bg-card hover:bg-muted text-[11px] font-semibold cursor-pointer transition-all shadow-xs w-full text-center">
                          <Upload className="h-3 w-3" />
                          <span>{kitImage ? "Trocar Foto" : "Carregar Foto"}</span>
                        </span>
                      </label>
                      {uploadProgressKit !== null && (
                        <div className="w-full space-y-1 my-1">
                          <div className="flex items-center justify-between text-[10px] text-primary font-bold">
                            <span>Processando...</span>
                            <span>{uploadProgressKit}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-200" style={{ width: `${uploadProgressKit}%` }} />
                          </div>
                        </div>
                      )}
                      {uploadErrorKit && (
                        <p className="text-[10px] text-destructive font-semibold text-center mt-1">{uploadErrorKit}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground text-center">JPG, PNG, WebP (Máx {MAX_IMAGE_SIZE_MB}MB)</p>
                    </div>
                  </div>
                </div>

                {/* Nome, SKU e Descrição */}
                <div className="space-y-3 sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Nome do Kit *</label>
                      <input
                        type="text"
                        required
                        value={kitName}
                        onChange={(e) => setKitName(e.target.value)}
                        placeholder="Ex: Combo Perfume + Loção Hidratante"
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">SKU do Kit</label>
                      <input
                        type="text"
                        value={kitSku}
                        onChange={(e) => setKitSku(e.target.value)}
                        placeholder="Ex: KIT-PERF-01"
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-mono focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Descrição do Kit</label>
                    <textarea
                      value={kitDescription}
                      onChange={(e) => setKitDescription(e.target.value)}
                      placeholder="Descreva itens inclusos, frascos ou promoção do combo..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Composição de Produtos */}
              <div className="space-y-3 border-t border-border/40 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Produtos Componentes do Kit *</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length > 0) {
                        setKitItems(prev => [...prev, { productId: products[0].id, quantity: 1 }]);
                      } else {
                        alert("Cadastre produtos normais no catálogo primeiro para adicioná-los ao Kit.");
                      }
                    }}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    + Adicionar Produto ao Kit
                  </button>
                </div>

                {kitItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-2xl text-center border border-dashed border-border">
                    Nenhum produto adicionado ao Kit ainda. Clique em '+ Adicionar Produto ao Kit' para montar o combo.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {kitItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setKitItems(prev => prev.map((it, i) => i === index ? { ...it, productId: newId } : it));
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none"
                        >
                          {!products.some(p => p.id === item.productId) && (
                            <option value={item.productId}>
                              Produto (ID: {item.productId.slice(0, 8)})
                            </option>
                          )}
                          {products.filter(p => !p.isKit).map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Estoque Atual: {p.currentStock})</option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 w-28">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const q = parseInt(e.target.value) || 1;
                              setKitItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: q } : it));
                            }}
                            className="w-full text-center px-2 py-1.5 rounded-xl border border-border bg-card text-xs font-bold font-mono"
                          />
                          <span className="text-[11px] text-muted-foreground font-medium">un.</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setKitItems(prev => prev.filter((_, i) => i !== index))}
                          className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Precificação e Custo do Kit */}
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                      Custo Total Real dos Componentes
                    </span>
                    <span className="text-lg font-extrabold font-mono text-foreground">
                      {formatCurrency(liveKitCost)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const freshCost = kitItems.reduce((sum, item) => {
                        const prod = products.find(p => p.id === item.productId);
                        if (!prod) return sum;
                        const prodCost = (prod.totalAcquisitionCost && prod.totalAcquisitionCost > 0) ? prod.totalAcquisitionCost : (prod.costPrice || 0);
                        return sum + (prodCost * (item.quantity || 1));
                      }, 0);
                      alert(`Custo recalculado com sucesso! Valor total dos componentes: ${formatCurrency(freshCost)}`);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Recalcular custo</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Preço Total do Kit (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={kitPrice}
                      onChange={(e) => setKitPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-2.5 rounded-xl border border-border bg-card text-xs font-mono font-bold text-primary focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Lucro Estimado (R$)</label>
                    <div className="p-2.5 rounded-xl border border-border bg-card font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center h-[38px]">
                      {formatCurrency(Math.max(0, kitPrice - liveKitCost))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Margem Bruta (%)</label>
                    <div className="p-2.5 rounded-xl border border-border bg-card font-mono font-bold text-xs text-rosegold-500 flex items-center justify-center h-[38px]">
                      {kitPrice > 0 ? (((kitPrice - liveKitCost) / kitPrice) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé com Botões */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setKitModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 shadow transition-all"
                >
                  Salvar Kit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
