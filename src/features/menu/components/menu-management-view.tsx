"use client";

import * as React from "react";
import { Database, ItemStation, DietaryType } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  toggleProductFeatured,
  createProductVariant,
  deleteProductVariant,
  createModifierGroup,
  deleteModifierGroup,
  createModifier,
  deleteModifier,
  assignProductModifierGroup,
  removeProductModifierGroup,
} from "../actions";
import {
  Flame,
  UtensilsCrossed,
  Beer,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers,
  ChefHat,
  X,
  Star,
  Check,
} from "lucide-react";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ModifierGroup = Database["public"]["Tables"]["modifier_groups"]["Row"];
type Modifier = Database["public"]["Tables"]["modifiers"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

export interface FullProduct extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  modifier_groups: {
    modifier_group_id: string;
    display_order: number;
    modifier_group: ModifierGroup;
  }[];
}

export interface FullModifierGroup extends ModifierGroup {
  modifiers: Modifier[];
}

interface MenuManagementViewProps {
  initialCategories: Category[];
  initialProducts: FullProduct[];
  initialModifierGroups: FullModifierGroup[];
  canManage: boolean;
}

export function MenuManagementView({
  initialCategories,
  initialProducts,
  initialModifierGroups,
  canManage,
}: MenuManagementViewProps) {
  const [activeTab, setActiveTab] = React.useState<"products" | "categories" | "modifiers">("products");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedStation, setSelectedStation] = React.useState<string>("all");
  const [selectedDietary, setSelectedDietary] = React.useState<string>("all");

  // Notifications
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<FullProduct | null>(null);

  const [activeVariantProduct, setActiveVariantProduct] = React.useState<FullProduct | null>(null);
  const [activeModifiersProduct, setActiveModifiersProduct] = React.useState<FullProduct | null>(null);

  const [isModifierGroupModalOpen, setIsModifierGroupModalOpen] = React.useState(false);
  const [activeModifierGroupId, setActiveModifierGroupId] = React.useState<string | null>(null);

  // Filtered Products
  const filteredProducts = React.useMemo(() => {
    return initialProducts.filter((product) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
      const matchesStation = selectedStation === "all" || product.station === selectedStation;
      const matchesDietary = selectedDietary === "all" || product.dietary === selectedDietary;

      return matchesSearch && matchesCategory && matchesStation && matchesDietary;
    });
  }, [initialProducts, searchQuery, selectedCategory, selectedStation, selectedDietary]);

  const stationLabels: Record<ItemStation, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    kitchen_grill: { label: "Wood-Fired Grill", icon: Flame },
    kitchen_fry: { label: "Fry & Sauté", icon: ChefHat },
    kitchen_pantry: { label: "Cold Pantry & Hearth", icon: UtensilsCrossed },
    bar_taps: { label: "Craft Beer Taps", icon: Beer },
    bar_cocktails: { label: "Mixology & Cocktails", icon: Sparkles },
  };

  const dietaryColors: Record<DietaryType, { label: string; color: string }> = {
    veg: { label: "Veg", color: "text-[#5dd974] border-[#5dd974]/40 bg-[#5dd974]/10" },
    non_veg: { label: "Non-Veg", color: "text-asador-flame border-asador-flame/40 bg-asador-flame/10" },
    egg: { label: "Egg", color: "text-asador-malt border-asador-malt/40 bg-asador-malt/10" },
    vegan: { label: "Vegan", color: "text-[#3ec455] border-[#3ec455]/40 bg-[#3ec455]/10" },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Menu Catalog & Customizations
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Artisanal wood-fired grill dishes, craft microbrewery beers, variants, and preparation stations.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="default"
              className="min-h-11 sm:h-9 text-xs font-semibold px-3"
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Product
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 sm:h-9 text-xs font-semibold px-3"
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Category
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="min-h-11 sm:h-9 text-xs font-semibold px-3"
              onClick={() => setIsModifierGroupModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Modifier Group
            </Button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`flex items-start space-x-2.5 rounded-asador border p-3 text-xs ${
            message.type === "success"
              ? "border-asador-hops/40 bg-asador-hops/15 text-asador-parchment"
              : "border-asador-flame/40 bg-asador-flame/15 text-asador-parchment"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-asador-border space-x-2 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap min-h-11 transition-colors ${
            activeTab === "products"
              ? "border-asador-ember text-asador-ember"
              : "border-transparent text-asador-silver hover:text-asador-parchment"
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>Products & Dishes ({initialProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap min-h-11 transition-colors ${
            activeTab === "categories"
              ? "border-asador-ember text-asador-ember"
              : "border-transparent text-asador-silver hover:text-asador-parchment"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Categories ({initialCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("modifiers")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap min-h-11 transition-colors ${
            activeTab === "modifiers"
              ? "border-asador-ember text-asador-ember"
              : "border-transparent text-asador-silver hover:text-asador-parchment"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Modifier Groups ({initialModifierGroups.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: PRODUCTS
          ===================================================================== */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="border-asador-border bg-asador-card">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-asador-silver" />
                  <Input
                    placeholder="Search dishes, beers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-asador-deep border-asador-border text-xs h-9"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                >
                  <option value="all">All Categories</option>
                  {initialCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                >
                  <option value="all">All Stations</option>
                  {Object.entries(stationLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDietary}
                  onChange={(e) => setSelectedDietary(e.target.value)}
                  className="h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                >
                  <option value="all">All Dietary Types</option>
                  <option value="non_veg">Non-Veg</option>
                  <option value="veg">Veg</option>
                  <option value="egg">Egg</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const primaryImg = product.images.find((img) => img.is_primary) || product.images[0];
              const category = initialCategories.find((c) => c.id === product.category_id);
              const StationIcon = stationLabels[product.station]?.icon || Flame;

              return (
                <Card
                  key={product.id}
                  className={`border-asador-border bg-asador-card overflow-hidden flex flex-col justify-between transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:border-asador-copper/60 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] ${
                    !product.is_available ? "opacity-60 border-dashed" : ""
                  }`}
                >
                  <div>
                    {/* Image / Header Banner */}
                    <div className="relative h-40 bg-asador-deep border-b border-asador-border flex items-center justify-center overflow-hidden">
                      {primaryImg ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={primaryImg.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-asador-silver/40">
                          <StationIcon className="h-10 w-10 mb-1" />
                          <span className="text-[10px] uppercase tracking-widest font-mono">
                            {stationLabels[product.station]?.label}
                          </span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${dietaryColors[product.dietary].color}`}>
                          {dietaryColors[product.dietary].label}
                        </span>
                        {product.is_featured && (
                          <Badge variant="malt" className="text-[10px] py-0 px-1.5 flex items-center space-x-1">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>Recommended</span>
                          </Badge>
                        )}
                      </div>

                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={product.is_available ? "hops" : "outline"}
                          className="text-[10px] py-0 px-1.5"
                        >
                          {product.is_available ? "In Stock" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base text-asador-parchment leading-snug">
                            {product.name}
                          </CardTitle>
                          <span className="text-[11px] text-asador-copper font-medium block mt-0.5">
                            {category?.name || "Uncategorized"}
                          </span>
                        </div>
                        <span className="font-serif text-base font-bold text-asador-ember whitespace-nowrap">
                          ₹{Number(product.base_price).toFixed(2)}
                        </span>
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-1 text-asador-silver">
                        {product.description || "No recipe description provided."}
                      </CardDescription>
                    </CardHeader>
                  </div>

                  <CardContent className="p-4 pt-0 space-y-3">
                    {/* Variants and Modifiers summary */}
                    <div className="pt-2 border-t border-asador-border/60 flex items-center justify-between text-[11px] text-asador-silver">
                      <span>{product.variants.length} variant(s)</span>
                      <span>{product.modifier_groups.length} modifier group(s)</span>
                    </div>

                    {/* Action Controls */}
                    {canManage && (
                      <div className="pt-2 border-t border-asador-border flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => {
                              setEditingProduct(product);
                              setIsProductModalOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setActiveVariantProduct(product)}
                          >
                            Variants
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setActiveModifiersProduct(product)}
                          >
                            Modifiers
                          </Button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            title={product.is_available ? "Mark Out of Stock" : "Mark Available"}
                            onClick={async () => {
                              const res = await toggleProductAvailability(product.id, !product.is_available);
                              if (res.success) showToast("success", res.message || "Updated availability.");
                              else showToast("error", res.error || "Failed to update.");
                            }}
                            className={`p-1.5 rounded-asador border text-xs transition-colors ${
                              product.is_available
                                ? "border-asador-hops/50 text-[#5dd974] hover:bg-asador-hops/20"
                                : "border-asador-silver/30 text-asador-silver hover:bg-asador-surface"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>

                          <button
                            title={product.is_featured ? "Remove from specials" : "Mark as Recommended"}
                            onClick={async () => {
                              const res = await toggleProductFeatured(product.id, !product.is_featured);
                              if (res.success) showToast("success", res.message || "Updated recommendation.");
                              else showToast("error", res.error || "Failed to update.");
                            }}
                            className={`p-1.5 rounded-asador border text-xs transition-colors ${
                              product.is_featured
                                ? "border-asador-malt/50 text-asador-malt hover:bg-asador-malt/20"
                                : "border-asador-silver/30 text-asador-silver hover:bg-asador-surface"
                            }`}
                          >
                            <Star className={`h-3.5 w-3.5 ${product.is_featured ? "fill-current" : ""}`} />
                          </button>

                          <button
                            title="Delete or Archive Product"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete '${product.name}'?`)) {
                                const res = await deleteProduct(product.id);
                                if (res.success) showToast("success", res.message || "Product deleted.");
                                else showToast("error", res.error || "Failed to delete.");
                              }
                            }}
                            className="p-1.5 rounded-asador border border-asador-flame/40 text-asador-flame hover:bg-asador-flame/15 text-xs transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: CATEGORIES
          ===================================================================== */}
      {activeTab === "categories" && (
        <Card className="border-asador-border bg-asador-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-asador-deep border-b border-asador-border text-xs uppercase tracking-wider text-asador-silver font-semibold">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Default Station</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-asador-border">
                {initialCategories.map((cat) => {
                  const StationIcon = stationLabels[cat.station]?.icon || Flame;
                  return (
                    <tr key={cat.id} className="hover:bg-asador-surface/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-asador-silver">
                        {cat.display_order}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-asador-parchment">
                        <div>
                          <span>{cat.name}</span>
                          {cat.description && (
                            <span className="text-xs text-asador-silver block truncate max-w-sm">
                              {cat.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-asador-copper">
                        {cat.slug}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="flex items-center space-x-1.5 text-asador-parchment">
                          <StationIcon className="h-3.5 w-3.5 text-asador-ember" />
                          <span>{stationLabels[cat.station]?.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <Badge variant={cat.is_active ? "hops" : "outline"} className="text-[10px]">
                          {cat.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setEditingCategory(cat);
                              setIsCategoryModalOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-asador-flame hover:text-asador-flame"
                            onClick={async () => {
                              if (confirm(`Delete category '${cat.name}'?`)) {
                                const res = await deleteCategory(cat.id);
                                if (res.success) showToast("success", res.message || "Deleted.");
                                else showToast("error", res.error || "Cannot delete category.");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* =====================================================================
          TAB 3: MODIFIER GROUPS
          ===================================================================== */}
      {activeTab === "modifiers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {initialModifierGroups.map((group) => (
              <Card key={group.id} className="border-asador-border bg-asador-card">
                <CardHeader className="p-4 pb-3 border-b border-asador-border flex flex-row items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-base text-asador-parchment">{group.name}</CardTitle>
                      {group.is_required && (
                        <Badge variant="malt" className="text-[10px]">
                          Required
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs text-asador-silver mt-0.5">
                      {group.description || "No instructions provided."} &bull; Min: {group.min_selections}, Max: {group.max_selections}
                    </CardDescription>
                  </div>

                  {canManage && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-asador-silver hover:text-asador-parchment"
                        onClick={() => setActiveModifierGroupId(group.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1 text-asador-ember" /> Add Option
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-asador-flame hover:text-asador-flame"
                        onClick={async () => {
                          if (confirm(`Delete modifier group '${group.name}'?`)) {
                            const res = await deleteModifierGroup(group.id);
                            if (res.success) showToast("success", res.message || "Deleted group.");
                            else showToast("error", res.error || "Failed to delete.");
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-2">
                  {group.modifiers.length === 0 ? (
                    <p className="text-xs text-asador-silver italic">No option choices created yet.</p>
                  ) : (
                    <div className="divide-y divide-asador-border/50">
                      {group.modifiers.map((mod) => (
                        <div key={mod.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-asador-parchment">{mod.name}</span>
                            {Number(mod.price_delta) > 0 ? (
                              <span className="text-asador-ember font-mono ml-2">
                                +₹{Number(mod.price_delta).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-asador-silver/60 ml-2">Free</span>
                            )}
                          </div>

                          {canManage && (
                            <button
                              onClick={async () => {
                                if (confirm(`Remove option '${mod.name}'?`)) {
                                  const res = await deleteModifier(mod.id);
                                  if (res.success) showToast("success", res.message || "Removed.");
                                  else showToast("error", res.error || "Failed to remove.");
                                }
                              }}
                              className="text-asador-silver hover:text-asador-flame p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT PRODUCT
          ===================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-xl max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <h3 className="font-serif text-lg font-bold text-asador-parchment">
                {editingProduct ? "Edit Product Dish" : "Create New Dish / Brew"}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const res = editingProduct
                  ? await updateProduct(formData)
                  : await createProduct(formData);

                if (res.success) {
                  showToast("success", res.message || "Saved product.");
                  setIsProductModalOpen(false);
                } else {
                  showToast("error", res.error || "Failed to save product.");
                }
              }}
              className="p-5 sm:p-6 space-y-4 overflow-y-auto"
            >
              {editingProduct && <input type="hidden" name="id" value={editingProduct.id} />}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Dish / Item Name</label>
                  <Input
                    name="name"
                    required
                    defaultValue={editingProduct?.name || ""}
                    placeholder="e.g. Asador Smoked Porter"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">URL Slug</label>
                  <Input
                    name="slug"
                    defaultValue={editingProduct?.slug || ""}
                    placeholder="e.g. asador-smoked-porter"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Category</label>
                  <select
                    name="categoryId"
                    defaultValue={editingProduct?.category_id || initialCategories[0]?.id}
                    required
                    className="w-full h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                  >
                    {initialCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Base Price (₹)</label>
                  <Input
                    name="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={editingProduct ? Number(editingProduct.base_price) : 350.0}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Dietary Type</label>
                  <select
                    name="dietary"
                    defaultValue={editingProduct?.dietary || "non_veg"}
                    className="w-full h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                  >
                    <option value="non_veg">Non-Veg</option>
                    <option value="veg">Veg</option>
                    <option value="egg">Egg</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Prep Station</label>
                  <select
                    name="station"
                    defaultValue={editingProduct?.station || "kitchen_grill"}
                    className="w-full h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                  >
                    {Object.entries(stationLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Display Order</label>
                  <Input
                    name="displayOrder"
                    type="number"
                    defaultValue={editingProduct?.display_order || 0}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Recipe Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingProduct?.description || ""}
                  placeholder="Ingredients, fire cooking technique, tasting notes..."
                  className="flex w-full rounded-asador border border-asador-border bg-asador-deep px-3 py-2 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Primary Image URL</label>
                <Input
                  name="imageUrl"
                  defaultValue={editingProduct?.images.find((i) => i.is_primary)?.image_url || ""}
                  placeholder="https://images.unsplash.com/... or /images/..."
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-xs text-asador-parchment cursor-pointer">
                  <input
                    type="checkbox"
                    name="isAvailable"
                    value="true"
                    defaultChecked={editingProduct ? editingProduct.is_available : true}
                    className="rounded border-asador-border bg-asador-deep text-asador-ember"
                  />
                  <span>Available In Stock</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-asador-parchment cursor-pointer">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    value="true"
                    defaultChecked={editingProduct ? editingProduct.is_featured : false}
                    className="rounded border-asador-border bg-asador-deep text-asador-ember"
                  />
                  <span>Recommended / Chef&apos;s Special</span>
                </label>
              </div>

              <div className="border-t border-asador-border pt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default" className="min-h-11 h-11 px-5 text-xs font-semibold">
                  {editingProduct ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT CATEGORY
          ===================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <h3 className="font-serif text-lg font-bold text-asador-parchment">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const res = editingCategory
                  ? await updateCategory(formData)
                  : await createCategory(formData);

                if (res.success) {
                  showToast("success", res.message || "Saved category.");
                  setIsCategoryModalOpen(false);
                } else {
                  showToast("error", res.error || "Failed to save category.");
                }
              }}
              className="p-5 sm:p-6 space-y-4 overflow-y-auto"
            >
              {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Category Name</label>
                <Input
                  name="name"
                  required
                  defaultValue={editingCategory?.name || ""}
                  placeholder="e.g. Wood-Fired Hearth"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">URL Slug</label>
                <Input
                  name="slug"
                  defaultValue={editingCategory?.slug || ""}
                  placeholder="e.g. wood-fired-hearth"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Default Station</label>
                  <select
                    name="station"
                    defaultValue={editingCategory?.station || "kitchen_grill"}
                    className="w-full h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                  >
                    {Object.entries(stationLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Display Order</label>
                  <Input
                    name="displayOrder"
                    type="number"
                    defaultValue={editingCategory?.display_order || 0}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Description</label>
                <Input
                  name="description"
                  defaultValue={editingCategory?.description || ""}
                  placeholder="Short description of section"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs text-asador-parchment cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    value="true"
                    defaultChecked={editingCategory ? editingCategory.is_active : true}
                    className="rounded border-asador-border bg-asador-deep text-asador-ember"
                  />
                  <span>Category Active & Visible to Guests</span>
                </label>
              </div>

              <div className="border-t border-asador-border pt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default" className="min-h-11 h-11 px-5 text-xs font-semibold">
                  {editingCategory ? "Save Changes" : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MANAGE VARIANTS FOR PRODUCT
          ===================================================================== */}
      {activeVariantProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Portion & Size Variants
                </h3>
                <span className="text-xs text-asador-copper font-medium">{activeVariantProduct.name}</span>
              </div>
              <button
                onClick={() => setActiveVariantProduct(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {/* Existing Variants */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-semibold text-asador-silver">Configured Variants</span>
                {activeVariantProduct.variants.length === 0 ? (
                  <p className="text-xs text-asador-silver italic">No portions configured (product uses base price).</p>
                ) : (
                  <div className="divide-y divide-asador-border/50 rounded-asador border border-asador-border bg-asador-deep p-2">
                    {activeVariantProduct.variants.map((v) => (
                      <div key={v.id} className="py-2 px-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-asador-parchment">{v.name}</span>
                          {v.sku && <span className="font-mono text-asador-silver ml-2">[{v.sku}]</span>}
                          <span className="font-mono text-asador-ember ml-2">₹{Number(v.price).toFixed(2)}</span>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await deleteProductVariant(v.id);
                            if (res.success) showToast("success", res.message || "Removed.");
                            else showToast("error", res.error || "Failed to remove.");
                          }}
                          className="text-asador-silver hover:text-asador-flame p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Variant Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  formData.set("productId", activeVariantProduct.id);
                  const res = await createProductVariant(formData);
                  if (res.success) {
                    showToast("success", res.message || "Added variant.");
                    (e.target as HTMLFormElement).reset();
                  } else {
                    showToast("error", res.error || "Failed to add.");
                  }
                }}
                className="space-y-3 pt-3 border-t border-asador-border"
              >
                <span className="text-xs uppercase font-semibold text-asador-silver block">Add New Variant</span>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="name" required placeholder="Variant (e.g. 500g Cut, Pint)" className="text-xs h-8" />
                  <Input name="price" type="number" step="0.01" min="0" required placeholder="Price (₹)" className="text-xs h-8" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="sku" placeholder="SKU (optional)" className="text-xs h-8" />
                  <Input name="displayOrder" type="number" defaultValue={0} placeholder="Order" className="text-xs h-8" />
                </div>
                <Button type="submit" size="sm" variant="default" className="w-full text-xs h-8">
                  <Plus className="h-3 w-3 mr-1" /> Add Variant
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MANAGE MODIFIER GROUPS FOR PRODUCT
          ===================================================================== */}
      {activeModifiersProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Attached Modifier Groups
                </h3>
                <span className="text-xs text-asador-copper font-medium">{activeModifiersProduct.name}</span>
              </div>
              <button
                onClick={() => setActiveModifiersProduct(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {/* Existing Groups Attached */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-semibold text-asador-silver">Currently Attached</span>
                {activeModifiersProduct.modifier_groups.length === 0 ? (
                  <p className="text-xs text-asador-silver italic">No modifier groups attached to this dish.</p>
                ) : (
                  <div className="divide-y divide-asador-border/50 rounded-asador border border-asador-border bg-asador-deep p-2">
                    {activeModifiersProduct.modifier_groups.map((pmg) => (
                      <div key={pmg.modifier_group_id} className="py-2 px-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-asador-parchment">
                            {pmg.modifier_group?.name || "Modifier Group"}
                          </span>
                          <span className="text-asador-silver text-[11px] ml-2">
                            (Min: {pmg.modifier_group?.min_selections}, Max: {pmg.modifier_group?.max_selections})
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await removeProductModifierGroup(activeModifiersProduct.id, pmg.modifier_group_id);
                            if (res.success) showToast("success", res.message || "Detached.");
                            else showToast("error", res.error || "Failed to detach.");
                          }}
                          className="text-asador-silver hover:text-asador-flame p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attach Existing Group Form */}
              <div className="space-y-3 pt-3 border-t border-asador-border">
                <span className="text-xs uppercase font-semibold text-asador-silver block">Attach Group</span>
                <div className="flex space-x-2">
                  <select
                    id="attachGroupId"
                    className="flex-1 h-8 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs text-asador-parchment"
                  >
                    {initialModifierGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs h-8"
                    onClick={async () => {
                      const sel = document.getElementById("attachGroupId") as HTMLSelectElement;
                      if (!sel?.value) return;
                      const res = await assignProductModifierGroup(activeModifiersProduct.id, sel.value);
                      if (res.success) showToast("success", res.message || "Attached group.");
                      else showToast("error", res.error || "Failed to attach.");
                    }}
                  >
                    Attach
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE MODIFIER GROUP
          ===================================================================== */}
      {isModifierGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <h3 className="font-serif text-lg font-bold text-asador-parchment">
                Create Modifier Group
              </h3>
              <button
                onClick={() => setIsModifierGroupModalOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const res = await createModifierGroup(formData);
                if (res.success) {
                  showToast("success", res.message || "Created modifier group.");
                  setIsModifierGroupModalOpen(false);
                } else {
                  showToast("error", res.error || "Failed to create group.");
                }
              }}
              className="p-5 sm:p-6 space-y-4 overflow-y-auto"
            >
              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Group Name</label>
                <Input name="name" required placeholder="e.g. Meat Doneness, Hearth Sauces" />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Description / Instruction</label>
                <Input name="description" placeholder="e.g. Select your preferred grilling doneness" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Min Selections</label>
                  <Input name="minSelections" type="number" min="0" defaultValue={0} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Max Selections</label>
                  <Input name="maxSelections" type="number" min="1" defaultValue={1} />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs text-asador-parchment cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRequired"
                    value="true"
                    className="rounded border-asador-border bg-asador-deep text-asador-ember"
                  />
                  <span>Required Selection (Customer must pick an option)</span>
                </label>
              </div>

              <div className="border-t border-asador-border pt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setIsModifierGroupModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default" className="min-h-11 h-11 px-5 text-xs font-semibold">
                  Create Group
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD MODIFIER OPTION
          ===================================================================== */}
      {activeModifierGroupId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-sm max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <h3 className="font-serif text-lg font-bold text-asador-parchment">
                Add Option Choice
              </h3>
              <button
                onClick={() => setActiveModifierGroupId(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                formData.set("modifierGroupId", activeModifierGroupId);
                const res = await createModifier(formData);
                if (res.success) {
                  showToast("success", res.message || "Added option.");
                  setActiveModifierGroupId(null);
                } else {
                  showToast("error", res.error || "Failed to add option.");
                }
              }}
              className="p-5 sm:p-6 space-y-4 overflow-y-auto"
            >
              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Option Name</label>
                <Input name="name" required placeholder="e.g. Medium Rare, Chimichurri" />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Additional Price (₹)</label>
                <Input name="priceDelta" type="number" step="0.01" min="0" defaultValue={0} placeholder="0.00 for free" />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Display Order</label>
                <Input name="displayOrder" type="number" defaultValue={0} />
              </div>

              <div className="border-t border-asador-border pt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setActiveModifierGroupId(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default" className="min-h-11 h-11 px-5 text-xs font-semibold">
                  Add Option
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
