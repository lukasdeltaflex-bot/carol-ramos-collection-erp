"use client";

import React, { useState, useEffect } from "react";
import { useDb } from "@/hooks/useDb";
import { Product, Category, Brand, StockLocation } from "@/features/products/types";
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
  Coins
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

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
  const { createDoc, getDocs, updateDoc, deleteDoc } = useDb();

  const [activeTab, setActiveTab] = useState<"products" | "categories" | "brands" | "locations">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

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

  // Categoria/Marca auxiliary simple forms
  const [auxName, setAuxName] = useState("");
  const [auxDesc, setAuxDesc] = useState("");
  const [auxIsVirtual, setAuxIsVirtual] = useState(false);

  // Carregar todos os dados do banco (Paralelizado e Reativo)
  const loadAllData = async () => {
    setLoading(true);
    try {
      let [cats, brs, locs, supps, prods] = await Promise.all([
        getDocs("categories"),
        getDocs("brands"),
        getDocs("stock_locations"),
        getDocs("suppliers"),
        getDocs("products")
      ]);

      // Pre-seed se o mock ou banco estiver zerado (Paralelizado com Promise.all)
      let needsRefetch = false;
      if (cats.length === 0) {
        await Promise.all(INITIAL_CATEGORIES.map(c => createDoc("categories", c)));
        needsRefetch = true;
      }
      if (brs.length === 0) {
        await Promise.all(INITIAL_BRANDS.map(b => createDoc("brands", b)));
        needsRefetch = true;
      }
      if (locs.length === 0) {
        await Promise.all(INITIAL_LOCATIONS.map(l => createDoc("stock_locations", l)));
        needsRefetch = true;
      }

      if (needsRefetch) {
        [cats, brs, locs] = await Promise.all([
          getDocs("categories"),
          getDocs("brands"),
          getDocs("stock_locations")
        ]);
      }

      const catIds = (cats as any[]).map((c: any) => c.id);
      const brandIds = (brs as any[]).map((b: any) => b.id);
      const suppIds = (supps as any[]).map((s: any) => s.id);

      if (prods.length === 0) {
        const seedProds = INITIAL_PRODUCTS(catIds, brandIds, suppIds);
        await Promise.all(seedProds.map(p => createDoc("products", p)));
        prods = await getDocs("products");
      }

      setCategories(cats as Category[]);
      setBrandList(brs as Brand[]);
      setLocations(locs as StockLocation[]);
      setSuppliers(supps);
      setProducts(prods as Product[]);
    } catch (e) {
      console.error("Erro ao sincronizar tabelas de produtos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadAllData();
    }
  }, [tenantId, isMock]);

  // Conversão de arquivo para Base64 para visualização em modo mock
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    setSellPrice(item.sellPrice || 0);
    setPromoPrice(item.promoPrice || 0);
    setMinStock(item.minStock || 0);
    setWeightGrams(item.weightGrams || 0);
    
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
    if (confirm(`Deseja deletar o produto "${name}"?`)) {
      try {
        await deleteDoc("products", id);
        await loadAllData();
      } catch (err: any) {
        alert(err.message || "Erro ao deletar.");
      }
    }
  };

  // Salvar Produto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Calcular margem: ((sellPrice - costPrice) / sellPrice) * 100
    const calculatedMargin = sellPrice > 0 ? parseFloat((((sellPrice - costPrice) / sellPrice) * 100).toFixed(1)) : 0;
    
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
      sellPrice,
      promoPrice: promoPrice || undefined,
      averageCost: costPrice, // Padrão
      lastPurchasePrice: costPrice,
      profitMargin: calculatedMargin,
      currentStock,
      reservedStock,
      availableStock: calculatedAvailable,
      minStock,
      weightGrams: weightGrams || undefined,
      dimensions: dimensionsPayload,
      images: imagesPayload,
      channels: {},
      status: "active"
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
      if (editingId) {
        await updateDoc("products", editingId, payload);
      } else {
        await createDoc("products", payload);
      }
      setDrawerOpen(false);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar.");
    }
  };

  // Salvar Outras Tabelas Auxiliares (Categorias, Marcas, Locais)
  const handleSaveAuxiliary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auxName.trim()) return;

    try {
      if (activeTab === "categories") {
        const slug = auxName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
        const payload = { name: auxName, description: auxDesc, slug };
        const result = CategorySchema.safeParse(payload);
        if (!result.success) { alert(result.error.issues[0].message); return; }
        await createDoc("categories", payload);
      } else if (activeTab === "brands") {
        const payload = { name: auxName, description: auxDesc };
        const result = BrandSchema.safeParse(payload);
        if (!result.success) { alert(result.error.issues[0].message); return; }
        await createDoc("brands", payload);
      } else if (activeTab === "locations") {
        const payload = { name: auxName, description: auxDesc, isVirtual: auxIsVirtual, status: "active" as const };
        const result = StockLocationSchema.safeParse(payload);
        if (!result.success) { alert(result.error.issues[0].message); return; }
        await createDoc("stock_locations", payload);
      }
      setAuxName("");
      setAuxDesc("");
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
        await deleteDoc(activeTab === "locations" ? "stock_locations" : activeTab, id);
        await loadAllData();
      } catch (e: any) {
        alert(e.message || "Erro ao excluir.");
      }
    }
  };

  // Filtragem de Produtos
  const filteredProducts = products.filter(p => {
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchStock = true;
    if (stockFilter === "low") {
      matchStock = p.availableStock <= p.minStock;
    } else if (stockFilter === "out") {
      matchStock = p.availableStock === 0;
    }

    return matchQuery && matchStock;
  });

  // Mapeamento de Categoria e Marca para exibição
  const categoryMap = categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {} as Record<string, string>);
  const brandMap = brands.reduce((acc, br) => ({ ...acc, [br.id]: br.name }), {} as Record<string, string>);

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
      </div>

      {/* 2. Seleção de Abas & Filtros */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Abas */}
        <div className="flex border border-border bg-card/40 rounded-xl p-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "products", label: "Catálogo de Produtos", icon: Package },
            { id: "categories", label: "Categorias", icon: Layers },
            { id: "brands", label: "Marcas", icon: Bookmark },
            { id: "locations", label: "Locais de Estoque", icon: MapPin }
          ].map((tab) => {
            const Icon = tab.icon;
            const count = tab.id === "products" ? products.length : tab.id === "categories" ? categories.length : tab.id === "brands" ? brands.length : locations.length;
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

        {/* Barra de Filtros (Apenas para Produtos) */}
        {activeTab === "products" && (
          <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
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
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, SKU, código de barras..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 placeholder-muted-foreground text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="p-4">Produto</th>
                    <th className="p-4">SKU / Marca</th>
                    <th className="p-4">Preços (Custo/Venda)</th>
                    <th className="p-4">Margem Lucro</th>
                    <th className="p-4">Estoque (Disp./Mín)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum produto cadastrado ou encontrado.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLowStock = p.availableStock <= p.minStock;
                      return (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
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
                              <span className="text-[10px] text-muted-foreground">Custo: {formatCurrency(p.costPrice)}</span>
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

            {/* Listagem Auxiliares (Categorias / Marcas / Locais) */}
            {activeTab !== "products" && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Adicionar Rápido */}
                <div className="p-5 rounded-xl border border-border bg-card/50 h-fit space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-rosegold-500" />
                    <span>Adicionar {activeTab === "categories" ? "Categoria" : activeTab === "brands" ? "Marca" : "Local de Estoque"}</span>
                  </h3>
                  
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
                      Criar Registro
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
                          <h4 className="font-semibold text-foreground text-xs">{item.name}</h4>
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
                        <button
                          onClick={() => handleDeleteAuxiliary(item.id, item.name)}
                          className="p-1.5 rounded-lg border border-border bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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

      {/* 4. Slide-over Form Drawer (Novo/Editar Produto) */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <div className="fixed top-0 bottom-0 right-0 w-full max-w-xl bg-card border-l border-border shadow-2xl p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-rosegold-500" />
                <span>{editingId ? "Editar Produto" : "Novo Produto"}</span>
              </h3>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              {/* Fotos Upload */}
              <div className="space-y-2">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Foto do Produto</label>
                <div className="flex items-center gap-4 p-4 border border-dashed border-border rounded-xl bg-muted/10">
                  <div className="h-16 w-16 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {imageBase64 ? (
                      <img src={imageBase64} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-32"
                      />
                      <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-card hover:bg-muted text-[10px] font-semibold">
                        <Upload className="h-3 w-3" />
                        <span>Carregar Foto</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Formatos suportados: JPG, PNG, WebP (Máx 2MB)</p>
                  </div>
                </div>
              </div>

              {/* SKU & Nome */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">SKU / Código Unico</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ex: PE-CR-SIGN"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  />
                  {errors.sku && <p className="text-[10px] text-destructive mt-0.5">{errors.sku}</p>}
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Perfume Carol Ramos Signature 100ml"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card"
                  />
                  {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Descrição do Produto</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva detalhes como fragrância, notas de topo, modo de uso..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card resize-none"
                />
              </div>

              {/* Categoria, Marca e Fornecedor */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.categoryId && <p className="text-[10px] text-destructive mt-0.5">{errors.categoryId}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Marca</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.brandId && <p className="text-[10px] text-destructive mt-0.5">{errors.brandId}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Fornecedor</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="">Nenhum</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* EAN & NCM */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Código EAN (Código de Barras Oficial)</label>
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    placeholder="Ex: 7891234567890"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  />
                  {errors.EAN && <p className="text-[10px] text-destructive mt-0.5">{errors.EAN}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">NCM (Fisco / Tributos)</label>
                  <input
                    type="text"
                    value={ncm}
                    onChange={(e) => setNcm(e.target.value)}
                    placeholder="Ex: 33030010"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  />
                  {errors.NCM && <p className="text-[10px] text-destructive mt-0.5">{errors.NCM}</p>}
                </div>
              </div>

              {/* Bloco Financeiro e Preços */}
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-[8px] text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-rosegold-500" />
                  <span>Precificação & Custos</span>
                </h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Preço de Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                    {errors.costPrice && <p className="text-[10px] text-destructive mt-0.5">{errors.costPrice}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Preço de Venda (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                    {errors.sellPrice && <p className="text-[10px] text-destructive mt-0.5">{errors.sellPrice}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Margem Calculada</label>
                    <div className="p-2 border border-border rounded-lg bg-muted/30 font-semibold font-mono text-center text-rosegold-600 dark:text-rosegold-400">
                      {sellPrice > 0 ? (((sellPrice - costPrice) / sellPrice) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Preço Promocional (R$ - Opcional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Estoque Mínimo Alerta</label>
                    <input
                      type="number"
                      required
                      value={minStock}
                      onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Quantidade em Estoque */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Quantidade em Estoque</label>
                  <input
                    type="number"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    placeholder="Quantidade total ativa"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Estoque Reservado (Pedidos Abertos)</label>
                  <input
                    type="number"
                    required
                    value={reservedStock}
                    onChange={(e) => setReservedStock(parseInt(e.target.value) || 0)}
                    placeholder="Ex: reservado no e-commerce"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card font-mono"
                  />
                </div>
              </div>

              {/* Peso e Dimensões Logísticas */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <input
                  type="checkbox"
                  id="hasDimensions"
                  checked={hasDimensions}
                  onChange={(e) => setHasDimensions(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="hasDimensions" className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] cursor-pointer select-none">
                  Cadastrar Peso e Dimensões Logísticas (Frete / Transportadora)
                </label>
              </div>

              {hasDimensions && (
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3.5 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-muted-foreground uppercase">Peso do Produto (em Gramas)</label>
                    <input
                      type="number"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(parseInt(e.target.value) || 0)}
                      placeholder="Ex: 250 (para 250g)"
                      className="w-full p-2 rounded-lg border border-border bg-card font-mono"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Largura (cm)</label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                        placeholder="Largura"
                        className="w-full p-2 rounded-lg border border-border bg-card text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Altura (cm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                        placeholder="Altura"
                        className="w-full p-2 rounded-lg border border-border bg-card text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase">Profundidade (cm)</label>
                      <input
                        type="number"
                        value={depth}
                        onChange={(e) => setDepth(parseInt(e.target.value) || 0)}
                        placeholder="Profundidade"
                        className="w-full p-2 rounded-lg border border-border bg-card text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3.5 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                >
                  {editingId ? "Salvar Alterações" : "Cadastrar Produto"}
                </button>
              </div>

            </form>
          </div>
        </>
      )}

    </div>
  );
}
