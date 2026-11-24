"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, ItemStation, DietaryType } from "@/types/database.types";
import { submitCustomerOrder } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Flame,
  Beer,
  UtensilsCrossed,
  Sparkles,
  ChefHat,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Clock,
  Star,
  Info,
} from "lucide-react";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ModifierGroup = Database["public"]["Tables"]["modifier_groups"]["Row"];
type Modifier = Database["public"]["Tables"]["modifiers"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
type DiningTable = Database["public"]["Tables"]["dining_tables"]["Row"];

export interface CustomerProduct extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  modifier_groups: {
    modifier_group_id: string;
    display_order: number;
    modifier_group: ModifierGroup & { modifiers: Modifier[] };
  }[];
}

export interface CartItem {
  id: string; // unique cart line id
  product: CustomerProduct;
  selectedVariant: ProductVariant | null;
  selectedModifiers: Modifier[];
  quantity: number;
  customerNotes: string;
  calculatedUnitPrice: number;
}

interface CustomerMenuViewProps {
  token: string;
  table: DiningTable;
  categories: Category[];
  products: CustomerProduct[];
}

export function CustomerMenuView({
  token,
  table,
  categories,
  products,
}: CustomerMenuViewProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategorySlug, setActiveCategorySlug] = React.useState<string>(categories[0]?.slug || "all");

  // Customization modal state
  const [selectedProduct, setSelectedProduct] = React.useState<CustomerProduct | null>(null);
  const [customizingVariant, setCustomizingVariant] = React.useState<ProductVariant | null>(null);
  const [customizingModifiers, setCustomizingModifiers] = React.useState<Map<string, Modifier[]>>(new Map());
  const [customizingQuantity, setCustomizingQuantity] = React.useState(1);
  const [customizingNotes, setCustomizingNotes] = React.useState("");
  const [modalError, setModalError] = React.useState<string | null>(null);

  // Cart state
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);

  // Filter products by category and search
  const displayedProducts = React.useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      const category = categories.find((c) => c.id === p.category_id);
      const matchesCategory =
        activeCategorySlug === "all" || (category && category.slug === activeCategorySlug);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategorySlug, categories]);

  // Open item customization modal
  const openCustomizer = (product: CustomerProduct) => {
    setSelectedProduct(product);
    setCustomizingVariant(product.variants[0] || null);
    setCustomizingModifiers(new Map());
    setCustomizingQuantity(1);
    setCustomizingNotes("");
    setModalError(null);
  };

  // Toggle modifier option
  const toggleModifier = (group: ModifierGroup, modifier: Modifier) => {
    setCustomizingModifiers((prev) => {
      const next = new Map(prev);
      const currentList = next.get(group.id) || [];
      const isSelected = currentList.some((m) => m.id === modifier.id);

      if (isSelected) {
        next.set(
          group.id,
          currentList.filter((m) => m.id !== modifier.id)
        );
      } else {
        if (group.max_selections === 1) {
          next.set(group.id, [modifier]);
        } else if (currentList.length < group.max_selections) {
          next.set(group.id, [...currentList, modifier]);
        }
      }
      return next;
    });
  };

  // Calculate current customizer price
  const currentItemUnitPrice = React.useMemo(() => {
    if (!selectedProduct) return 0;
    let base = customizingVariant ? Number(customizingVariant.price) : Number(selectedProduct.base_price);
    for (const mods of Array.from(customizingModifiers.values())) {
      for (const m of mods) {
        base += Number(m.price_delta);
      }
    }
    return base;
  }, [selectedProduct, customizingVariant, customizingModifiers]);

  // Add customized item to cart
  const addToCart = () => {
    if (!selectedProduct) return;

    // Validate required modifier groups
    for (const pmg of selectedProduct.modifier_groups) {
      const g = pmg.modifier_group;
      if (g.is_required) {
        const chosen = customizingModifiers.get(g.id) || [];
        if (chosen.length < g.min_selections) {
          setModalError(`Please select at least ${g.min_selections} option for '${g.name}'.`);
          return;
        }
      }
    }

    const allChosenModifiers = Array.from(customizingModifiers.values()).flat();

    const cartLine: CartItem = {
      id: `${selectedProduct.id}-${customizingVariant?.id || "base"}-${allChosenModifiers.map((m) => m.id).sort().join("-")}-${Date.now()}`,
      product: selectedProduct,
      selectedVariant: customizingVariant,
      selectedModifiers: allChosenModifiers,
      quantity: customizingQuantity,
      customerNotes: customizingNotes.trim(),
      calculatedUnitPrice: currentItemUnitPrice,
    };

    setCart((prev) => [...prev, cartLine]);
    setSelectedProduct(null);
  };

  // Cart operations
  const updateQuantity = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === lineId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Cart totals
  const cartSubtotal = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + item.calculatedUnitPrice * item.quantity, 0);
  }, [cart]);

  const cartTaxes = React.useMemo(() => {
    return Number((cartSubtotal * 0.05).toFixed(2)); // 5% GST
  }, [cartSubtotal]);

  const cartTotal = React.useMemo(() => {
    return Number((cartSubtotal + cartTaxes).toFixed(2));
  }, [cartSubtotal, cartTaxes]);

  const totalItemCount = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Submit Order
  const handleOrderSubmit = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setOrderError(null);

    const idempotencyKey = `idemp-${token.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const res = await submitCustomerOrder({
      token,
      idempotencyKey,
      items: cart.map((i) => ({
        productId: i.product.id,
        variantId: i.selectedVariant?.id || null,
        quantity: i.quantity,
        customerNotes: i.customerNotes || null,
        selectedModifierIds: i.selectedModifiers.map((m) => m.id),
      })),
    });

    setIsSubmitting(false);

    if (res.success && res.orderId) {
      setCart([]);
      setIsCartOpen(false);
      router.push(`/t/${token}/orders/${res.orderId}`);
    } else {
      setOrderError(res.error || "Failed to submit order. Please retry or ask a server.");
    }
  };

  const dietaryBadges: Record<DietaryType, { label: string; color: string }> = {
    veg: { label: "Veg", color: "text-[#5dd974] border-[#5dd974]/40 bg-[#5dd974]/10" },
    non_veg: { label: "Non-Veg", color: "text-asador-flame border-asador-flame/40 bg-asador-flame/10" },
    egg: { label: "Egg", color: "text-asador-malt border-asador-malt/40 bg-asador-malt/10" },
    vegan: { label: "Vegan", color: "text-[#3ec455] border-[#3ec455]/40 bg-[#3ec455]/10" },
  };

  return (
    <div className="min-h-screen bg-asador-dark text-asador-parchment pb-24">
      {/* =====================================================================
          HEADER & BRAND BANNER
          ===================================================================== */}
      <header className="sticky top-0 z-30 bg-asador-card/95 backdrop-blur-md border-b border-asador-border px-3 sm:px-4 py-2.5 sm:py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-asador bg-asador-ember/20 text-asador-ember shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-base sm:text-lg font-bold tracking-tight text-asador-parchment leading-tight">
                L&apos;Asador
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-asador-copper font-medium block">
                Grill & Brew &bull; Mohali
              </span>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="copper" className="text-xs font-mono font-bold px-2 py-0.5">
              TABLE {table.table_number}
            </Badge>
            <span className="text-[10px] text-asador-silver block mt-0.5">{table.zone}</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="max-w-5xl mx-auto mt-2 sm:mt-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-asador-silver" />
            <Input
              placeholder="Search dishes, steaks, beers, craft cocktails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-asador-deep border-asador-border text-xs h-9 text-asador-parchment placeholder:text-asador-silver/60"
            />
          </div>
        </div>
      </header>

      {/* =====================================================================
          HORIZONTAL CATEGORY PILLS BAR
          ===================================================================== */}
      <nav className="sticky top-[86px] sm:top-[92px] z-20 bg-asador-card/90 backdrop-blur-md border-b border-asador-border px-3 sm:px-4 py-2 overflow-x-auto no-scrollbar shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center space-x-2">
          <button
            onClick={() => setActiveCategorySlug("all")}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors min-h-9 flex items-center ${
              activeCategorySlug === "all"
                ? "bg-asador-ember text-asador-parchment shadow-sm"
                : "bg-asador-deep text-asador-silver hover:text-asador-parchment"
            }`}
          >
            All Items
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategorySlug(cat.slug)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors min-h-9 flex items-center ${
                activeCategorySlug === cat.slug
                  ? "bg-asador-ember text-asador-parchment shadow-sm"
                  : "bg-asador-deep text-asador-silver hover:text-asador-parchment"
              }`}
            >
              {cat.name.replace(/\[.*?\]/g, "").trim()}
            </button>
          ))}
        </div>
      </nav>

      {/* =====================================================================
          MENU DISHES GRID
          ===================================================================== */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4">
        {displayedProducts.length === 0 ? (
          <div className="text-center py-12 text-asador-silver">
            <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-asador-parchment">No items found</p>
            <p className="text-xs mt-1">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {displayedProducts.map((product) => {
              const primaryImg = product.images.find((img) => img.is_primary) || product.images[0];
              const hasVariants = product.variants.length > 0;
              const hasModifiers = product.modifier_groups.length > 0;

              return (
                <div
                  key={product.id}
                  onClick={() => product.is_available && openCustomizer(product)}
                  className={`rounded-asador border border-asador-border bg-asador-card p-3 sm:p-4 flex flex-col justify-between gap-3 transition-all ${
                    product.is_available
                      ? "cursor-pointer hover:border-asador-copper/60 active:scale-[0.99]"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${dietaryBadges[product.dietary].color}`}>
                          {dietaryBadges[product.dietary].label}
                        </span>
                        {product.is_featured && (
                          <span className="text-[10px] text-asador-malt font-semibold flex items-center space-x-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>Chef&apos;s Pick</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-base font-bold text-asador-parchment leading-snug">
                        {product.name.replace(/\[.*?\]/g, "").trim()}
                      </h3>

                      <p className="text-xs text-asador-silver line-clamp-2 leading-relaxed">
                        {product.description || "Fresh wood-fired culinary creation."}
                      </p>
                    </div>

                    {/* Dish Image Thumbnail */}
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-asador bg-asador-deep border border-asador-border overflow-hidden shrink-0 flex items-center justify-center">
                      {primaryImg ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={primaryImg.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Flame className="h-6 w-6 text-asador-silver/30" />
                      )}
                    </div>
                  </div>

                  {/* Bottom: Price & Add Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-asador-border/60">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="font-serif text-base font-bold text-asador-ember">
                        ₹{Number(product.base_price).toFixed(2)}
                      </span>
                      {(hasVariants || hasModifiers) && (
                        <span className="text-[10px] text-asador-copper font-medium">
                          Customizable
                        </span>
                      )}
                    </div>

                    {product.is_available ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCustomizer(product);
                        }}
                        className="min-h-11 min-w-[76px] px-3.5 py-2 rounded-full bg-asador-surface hover:bg-asador-ember text-asador-parchment border border-asador-border text-xs font-bold tracking-wide transition-all shadow-sm active:scale-95 flex items-center justify-center"
                      >
                        + ADD
                      </button>
                    ) : (
                      <span className="text-xs text-asador-silver font-medium py-1 px-2">Sold Out</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =====================================================================
          FLOATING BOTTOM CART BAR
          ===================================================================== */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-gradient-to-t from-asador-dark via-asador-dark/95 to-transparent">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full min-h-12 rounded-asador bg-asador-ember hover:bg-asador-flame text-asador-parchment p-3.5 flex items-center justify-between shadow-ember-glow transition-all active:scale-[0.99]"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-full bg-black/20">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">
                    {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} in Cart
                  </span>
                  <span className="text-[11px] text-asador-parchment/80">
                    Subtotal: ₹{cartSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 font-bold text-sm">
                <span>Review Order</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: PRODUCT CUSTOMIZATION DRAWER
          ===================================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-asador-border bg-asador-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-asador-border px-5 py-3.5 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  {selectedProduct.name.replace(/\[.*?\]/g, "").trim()}
                </h3>
                <span className="text-xs text-asador-ember font-bold">
                  ₹{currentItemUnitPrice.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-asador text-asador-silver hover:text-asador-parchment min-h-11 min-w-11 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-2.5 text-xs text-asador-parchment flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-asador-ember shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Portions / Variants */}
              {selectedProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs uppercase font-semibold text-asador-silver tracking-wider block">
                    Choose Portion / Serving Size
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProduct.variants.map((v) => {
                      const isSelected = customizingVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setCustomizingVariant(v)}
                          className={`p-2.5 rounded-asador border text-left text-xs transition-all ${
                            isSelected
                              ? "border-asador-ember bg-asador-ember/15 text-asador-parchment font-bold"
                              : "border-asador-border bg-asador-deep text-asador-silver hover:text-asador-parchment"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{v.name}</span>
                            <span className="font-mono text-asador-ember">₹{Number(v.price).toFixed(2)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifier Groups */}
              {selectedProduct.modifier_groups.map((pmg) => {
                const group = pmg.modifier_group;
                const chosen = customizingModifiers.get(group.id) || [];

                return (
                  <div key={group.id} className="space-y-2 pt-2 border-t border-asador-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-semibold text-asador-silver tracking-wider">
                        {group.name}
                      </span>
                      {group.is_required && (
                        <Badge variant="malt" className="text-[10px]">
                          Required (1)
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-[11px] text-asador-silver/80">{group.description}</p>
                    )}

                    <div className="space-y-1.5">
                      {group.modifiers.map((mod) => {
                        const isChecked = chosen.some((m) => m.id === mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleModifier(group, mod)}
                            className={`w-full p-2.5 rounded-asador border text-left text-xs flex items-center justify-between transition-all ${
                              isChecked
                                ? "border-asador-ember bg-asador-ember/15 text-asador-parchment font-semibold"
                                : "border-asador-border bg-asador-deep text-asador-silver hover:text-asador-parchment"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  isChecked
                                    ? "bg-asador-ember border-asador-ember text-white"
                                    : "border-asador-silver/50"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3" />}
                              </div>
                              <span>{mod.name}</span>
                            </div>

                            {Number(mod.price_delta) > 0 ? (
                              <span className="font-mono text-asador-ember">+₹{Number(mod.price_delta).toFixed(2)}</span>
                            ) : (
                              <span className="text-asador-silver/60">Free</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Preparation Notes */}
              <div className="space-y-1.5 pt-2 border-t border-asador-border">
                <span className="text-xs uppercase font-semibold text-asador-silver tracking-wider block">
                  Kitchen / Bar Special Notes
                </span>
                <Input
                  placeholder="e.g. Extra crispy, dressing on the side..."
                  value={customizingNotes}
                  onChange={(e) => setCustomizingNotes(e.target.value)}
                  className="text-xs bg-asador-deep border-asador-border"
                />
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-3 border-t border-asador-border">
                <span className="text-xs uppercase font-semibold text-asador-silver">Quantity</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setCustomizingQuantity((q) => Math.max(1, q - 1))}
                    className="min-h-11 min-w-11 w-11 h-11 rounded-full border border-asador-border bg-asador-deep flex items-center justify-center text-asador-parchment hover:bg-asador-surface active:scale-95 transition-all"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-base text-asador-parchment w-7 text-center">
                    {customizingQuantity}
                  </span>
                  <button
                    onClick={() => setCustomizingQuantity((q) => q + 1)}
                    className="min-h-11 min-w-11 w-11 h-11 rounded-full border border-asador-border bg-asador-deep flex items-center justify-center text-asador-parchment hover:bg-asador-surface active:scale-95 transition-all"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-asador-border p-4 pb-safe bg-asador-deep flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-asador-silver block">Total Price</span>
                <span className="font-serif text-lg font-bold text-asador-ember">
                  ₹{(currentItemUnitPrice * customizingQuantity).toFixed(2)}
                </span>
              </div>

              <Button size="default" variant="default" onClick={addToCart} className="min-h-11 text-xs px-6 font-bold">
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CART REVIEW & ORDER SUBMISSION DRAWER
          ===================================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-asador-border bg-asador-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-asador-border px-5 py-3.5 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Review Your Table Order
                </h3>
                <span className="text-xs text-asador-copper font-medium">Table {table.table_number}</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-asador text-asador-silver hover:text-asador-parchment min-h-11 min-w-11 flex items-center justify-center"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
              {orderError && (
                <div className="rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-2.5 text-xs text-asador-parchment flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-asador-ember shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-asador border border-asador-border bg-asador-deep p-3 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-asador-parchment">
                        {item.product.name.replace(/\[.*?\]/g, "").trim()}
                      </h4>
                      {item.selectedVariant && (
                        <span className="text-[11px] text-asador-copper font-medium block">
                          Size: {item.selectedVariant.name}
                        </span>
                      )}
                      {item.selectedModifiers.length > 0 && (
                        <span className="text-[11px] text-asador-silver block">
                          + {item.selectedModifiers.map((m) => m.name).join(", ")}
                        </span>
                      )}
                      {item.customerNotes && (
                        <span className="text-[11px] text-asador-silver italic block">
                          &quot;{item.customerNotes}&quot;
                        </span>
                      )}
                    </div>

                    <span className="font-serif text-xs font-bold text-asador-ember shrink-0">
                      ₹{(item.calculatedUnitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-asador-border/50">
                    <span className="text-[11px] text-asador-silver font-mono">
                      ₹{item.calculatedUnitPrice.toFixed(2)} each
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="min-h-11 min-w-11 w-11 h-11 rounded-asador border border-asador-border bg-asador-surface flex items-center justify-center text-asador-parchment active:scale-95 transition-all"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="min-h-11 min-w-11 w-11 h-11 rounded-asador border border-asador-border bg-asador-surface flex items-center justify-center text-asador-parchment active:scale-95 transition-all"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bill Breakdown */}
              <div className="rounded-asador border border-asador-border bg-asador-surface/50 p-3 space-y-1.5 text-xs text-asador-silver">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-asador-parchment">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (CGST 2.5% + SGST 2.5%)</span>
                  <span className="font-mono text-asador-parchment">₹{cartTaxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-asador-parchment pt-1.5 border-t border-asador-border">
                  <span>Total Amount</span>
                  <span className="font-serif text-asador-ember">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-asador-border p-4 pb-safe bg-asador-deep">
              <Button
                size="default"
                variant="default"
                disabled={isSubmitting}
                onClick={handleOrderSubmit}
                className="w-full min-h-12 text-xs font-bold py-3.5"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 animate-spin" /> Transmitting to Kitchen...
                  </span>
                ) : (
                  <span>Confirm & Send Order to Hearth (₹{cartTotal.toFixed(2)})</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
