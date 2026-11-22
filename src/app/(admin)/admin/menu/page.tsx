import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MenuManagementView,
  FullProduct,
  FullModifierGroup,
} from "@/features/menu/components/menu-management-view";

export default async function AdminMenuPage() {
  const currentStaff = await requirePermission("menu:view");
  const canManage = hasPermission(currentStaff.profile.role, "menu:manage");

  const supabase = createAdminClient();

  // Fetch categories, products with associations, and modifier groups
  const [categoriesRes, productsRes, modifierGroupsRes] = await Promise.all([
    supabase.from("categories").select("*").order("display_order", { ascending: true }),
    supabase
      .from("products")
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*),
        modifier_groups:product_modifier_groups(
          modifier_group_id,
          display_order,
          modifier_group:modifier_groups(*)
        )
      `)
      .order("display_order", { ascending: true }),
    supabase
      .from("modifier_groups")
      .select(`
        *,
        modifiers(*)
      `)
      .order("created_at", { ascending: true }),
  ]);

  if (categoriesRes.error) {
    console.error("Error fetching categories:", categoriesRes.error.message);
  }
  if (productsRes.error) {
    console.error("Error fetching products:", productsRes.error.message);
  }
  if (modifierGroupsRes.error) {
    console.error("Error fetching modifier groups:", modifierGroupsRes.error.message);
  }

  const products: FullProduct[] = ((productsRes.data as unknown[]) || []).map((p: any) => ({
    ...p,
    images: p.images || [],
    variants: p.variants || [],
    modifier_groups: (p.modifier_groups || []).map((pmg: any) => ({
      modifier_group_id: pmg.modifier_group_id,
      display_order: pmg.display_order,
      modifier_group: Array.isArray(pmg.modifier_group) ? pmg.modifier_group[0] : pmg.modifier_group,
    })),
  }));

  const modifierGroups: FullModifierGroup[] = ((modifierGroupsRes.data as unknown[]) || []).map((g: any) => ({
    ...g,
    modifiers: g.modifiers || [],
  }));

  return (
    <MenuManagementView
      initialCategories={categoriesRes.data || []}
      initialProducts={products}
      initialModifierGroups={modifierGroups}
      canManage={canManage}
    />
  );
}
