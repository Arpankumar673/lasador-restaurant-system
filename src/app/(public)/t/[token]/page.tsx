import { resolveTableByQrToken } from "@/features/tables/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CustomerMenuView,
  CustomerProduct,
} from "@/features/orders/components/customer-menu-view";
import { AlertCircle, Flame } from "lucide-react";

interface CustomerPageProps {
  params: {
    token: string;
  };
}

export default async function CustomerTableMenuPage({ params }: CustomerPageProps) {
  const { token } = params;

  // 1. Resolve table & dining session
  const resolution = await resolveTableByQrToken(token);

  if (!resolution.valid || !resolution.table) {
    return (
      <div className="min-h-screen bg-asador-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-asador-lg border border-asador-border bg-asador-card p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-asador-flame/15 border border-asador-flame/40 text-asador-ember mx-auto flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>

          <h2 className="font-serif text-xl font-bold text-asador-parchment">
            Table Access Unavailable
          </h2>

          <p className="text-xs text-asador-silver leading-relaxed">
            {resolution.error ||
              "The scanned QR code is either expired, revoked, or no longer associated with an active dining table."}
          </p>

          <div className="p-3 rounded-asador bg-asador-deep border border-asador-border text-[11px] text-asador-copper">
            Please ask your server to refresh the table QR code for L&apos;Asador – Grill & Brew.
          </div>
        </div>
      </div>
    );
  }

  const { table } = resolution;
  const supabase = createAdminClient();

  // 2. Fetch active categories & products with variants & modifier groups
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("products")
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*),
        modifier_groups:product_modifier_groups(
          modifier_group_id,
          display_order,
          modifier_group:modifier_groups(
            *,
            modifiers(*)
          )
        )
      `)
      .eq("is_available", true)
      .order("display_order", { ascending: true }),
  ]);

  const categories = categoriesRes.data || [];
  const rawProducts = (productsRes.data as unknown[]) || [];

  const products: CustomerProduct[] = rawProducts.map((p: any) => ({
    ...p,
    images: p.images || [],
    variants: (p.variants || []).filter((v: any) => v.is_available),
    modifier_groups: (p.modifier_groups || [])
      .map((pmg: any) => {
        const group = Array.isArray(pmg.modifier_group) ? pmg.modifier_group[0] : pmg.modifier_group;
        return {
          modifier_group_id: pmg.modifier_group_id,
          display_order: pmg.display_order,
          modifier_group: group
            ? {
                ...group,
                modifiers: (group.modifiers || []).filter((m: any) => m.is_available),
              }
            : null,
        };
      })
      .filter((pmg: any) => pmg.modifier_group !== null),
  }));

  return (
    <CustomerMenuView
      token={token}
      table={table}
      categories={categories}
      products={products}
    />
  );
}
