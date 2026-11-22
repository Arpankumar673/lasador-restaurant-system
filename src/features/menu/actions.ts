"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/features/audit/logger";
import {
  categorySchema,
  productSchema,
  productVariantSchema,
  modifierGroupSchema,
  modifierSchema,
  itemStationSchema,
  dietaryTypeSchema,
} from "@/lib/validations/menu";
import { ItemStation, DietaryType } from "@/types/database.types";

export interface MenuActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: Record<string, unknown>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================================
// 1. CATEGORY MANAGEMENT ACTIONS
// ============================================================================

export async function createCategory(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized. You do not have permission to manage the menu." };
  }

  const name = String(formData.get("name") || "").trim();
  const rawSlug = String(formData.get("slug") || "").trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);
  const description = String(formData.get("description") || "").trim() || null;
  const station = (formData.get("station") as ItemStation) || "kitchen_grill";
  const displayOrder = Number(formData.get("displayOrder") || 0);
  const isActive = formData.get("isActive") !== "false";

  const parsed = categorySchema.safeParse({
    name,
    slug,
    description,
    station,
    display_order: displayOrder,
    is_active: isActive,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid category input" };
  }

  const supabase = createAdminClient();

  const { data: newCategory, error } = await supabase
    .from("categories")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A category with slug '${slug}' already exists.` };
    }
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "category:create",
    entity: "categories",
    entityId: newCategory.id,
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Category '${name}' created successfully.` };
}

export async function updateCategory(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized. You do not have permission to manage the menu." };
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) return { success: false, error: "Missing category ID." };

  const name = String(formData.get("name") || "").trim();
  const rawSlug = String(formData.get("slug") || "").trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);
  const description = String(formData.get("description") || "").trim() || null;
  const station = (formData.get("station") as ItemStation) || "kitchen_grill";
  const displayOrder = Number(formData.get("displayOrder") || 0);
  const isActive = formData.get("isActive") !== "false";

  const parsed = categorySchema.safeParse({
    name,
    slug,
    description,
    station,
    display_order: displayOrder,
    is_active: isActive,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid category input" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("categories")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A category with slug '${slug}' already exists.` };
    }
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "category:update",
    entity: "categories",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Category '${name}' updated successfully.` };
}

export async function toggleCategoryStatus(id: string, isActive: boolean): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "category:toggle_status",
    entity: "categories",
    entityId: id,
    details: { isActive },
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Category status updated.` };
}

export async function deleteCategory(id: string): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();

  // Safety check: verify no products exist in this category
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) return { success: false, error: countError.message };

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete category: contains ${count} active product(s). Archive or reassign products first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "category:delete",
    entity: "categories",
    entityId: id,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Category deleted successfully." };
}

// ============================================================================
// 2. PRODUCT MANAGEMENT ACTIONS
// ============================================================================

export async function createProduct(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized. You do not have permission to manage the menu." };
  }

  const categoryId = String(formData.get("categoryId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const rawSlug = String(formData.get("slug") || "").trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);
  const description = String(formData.get("description") || "").trim() || null;
  const basePrice = Number(formData.get("basePrice") || 0);
  const dietary = (formData.get("dietary") as DietaryType) || "non_veg";
  const station = (formData.get("station") as ItemStation) || "kitchen_grill";
  const isAvailable = formData.get("isAvailable") !== "false";
  const isFeatured = formData.get("isFeatured") === "true";
  const displayOrder = Number(formData.get("displayOrder") || 0);
  const imageUrl = String(formData.get("imageUrl") || "").trim() || null;

  const parsed = productSchema.safeParse({
    category_id: categoryId,
    name,
    slug,
    description,
    base_price: basePrice,
    dietary,
    station,
    is_available: isAvailable,
    is_featured: isFeatured,
    display_order: displayOrder,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid product input" };
  }

  const supabase = createAdminClient();

  const { data: newProduct, error } = await supabase
    .from("products")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A product with slug '${slug}' already exists.` };
    }
    return { success: false, error: error.message };
  }

  // Insert primary image if provided
  if (imageUrl) {
    await supabase.from("product_images").insert({
      product_id: newProduct.id,
      image_url: imageUrl,
      alt_text: name,
      is_primary: true,
      display_order: 0,
    });
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "product:create",
    entity: "products",
    entityId: newProduct.id,
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Product '${name}' created successfully.` };
}

export async function updateProduct(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized. You do not have permission to manage the menu." };
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) return { success: false, error: "Missing product ID." };

  const categoryId = String(formData.get("categoryId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const rawSlug = String(formData.get("slug") || "").trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);
  const description = String(formData.get("description") || "").trim() || null;
  const basePrice = Number(formData.get("basePrice") || 0);
  const dietary = (formData.get("dietary") as DietaryType) || "non_veg";
  const station = (formData.get("station") as ItemStation) || "kitchen_grill";
  const isAvailable = formData.get("isAvailable") !== "false";
  const isFeatured = formData.get("isFeatured") === "true";
  const displayOrder = Number(formData.get("displayOrder") || 0);
  const imageUrl = String(formData.get("imageUrl") || "").trim() || null;

  const parsed = productSchema.safeParse({
    category_id: categoryId,
    name,
    slug,
    description,
    base_price: basePrice,
    dietary,
    station,
    is_available: isAvailable,
    is_featured: isFeatured,
    display_order: displayOrder,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid product input" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("products")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A product with slug '${slug}' already exists.` };
    }
    return { success: false, error: error.message };
  }

  // Update or insert primary image if provided
  if (imageUrl) {
    const { data: existingImg } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", id)
      .eq("is_primary", true)
      .maybeSingle();

    if (existingImg) {
      await supabase
        .from("product_images")
        .update({ image_url: imageUrl, alt_text: name })
        .eq("id", existingImg.id);
    } else {
      await supabase.from("product_images").insert({
        product_id: id,
        image_url: imageUrl,
        alt_text: name,
        is_primary: true,
        display_order: 0,
      });
    }
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "product:update",
    entity: "products",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Product '${name}' updated successfully.` };
}

export async function toggleProductAvailability(id: string, isAvailable: boolean): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "product:toggle_availability",
    entity: "products",
    entityId: id,
    details: { isAvailable },
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Product availability updated.` };
}

export async function toggleProductFeatured(id: string, isFeatured: boolean): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "product:toggle_featured",
    entity: "products",
    entityId: id,
    details: { isFeatured },
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Product recommendation badge updated.` };
}

export async function deleteProduct(id: string): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();

  // Check if product is in historical orders
  const { count, error: orderCheckError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (orderCheckError) return { success: false, error: orderCheckError.message };

  if (count && count > 0) {
    // Soft archive: set unavailable instead of violating historical foreign key
    await supabase
      .from("products")
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    return {
      success: true,
      message: `Product is preserved in historical orders; marked as unavailable (archived).`,
    };
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "product:delete",
    entity: "products",
    entityId: id,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Product deleted successfully." };
}

// ============================================================================
// 3. PRODUCT VARIANT ACTIONS
// ============================================================================

export async function createProductVariant(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const productId = String(formData.get("productId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const sku = String(formData.get("sku") || "").trim() || null;
  const price = Number(formData.get("price") || 0);
  const isAvailable = formData.get("isAvailable") !== "false";
  const displayOrder = Number(formData.get("displayOrder") || 0);

  const parsed = productVariantSchema.safeParse({
    product_id: productId,
    name,
    sku,
    price,
    is_available: isAvailable,
    display_order: displayOrder,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid variant data." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("product_variants").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `A variant named '${name}' already exists for this product.` };
    }
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "variant:create",
    entity: "product_variants",
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Variant '${name}' created.` };
}

export async function deleteProductVariant(id: string): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();

  // Check if variant is in historical orders
  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("variant_id", id);

  if (count && count > 0) {
    await supabase.from("product_variants").update({ is_available: false }).eq("id", id);
    return { success: true, message: "Variant archived (referenced in past orders)." };
  }

  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "variant:delete",
    entity: "product_variants",
    entityId: id,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Variant removed." };
}

// ============================================================================
// 4. MODIFIER GROUPS & MODIFIERS ACTIONS
// ============================================================================

export async function createModifierGroup(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const minSelections = Number(formData.get("minSelections") || 0);
  const maxSelections = Number(formData.get("maxSelections") || 1);
  const isRequired = formData.get("isRequired") === "true";

  const parsed = modifierGroupSchema.safeParse({
    name,
    description,
    min_selections: minSelections,
    max_selections: maxSelections,
    is_required: isRequired,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid modifier group data." };
  }

  const supabase = createAdminClient();
  const { data: newGroup, error } = await supabase
    .from("modifier_groups")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "modifier_group:create",
    entity: "modifier_groups",
    entityId: newGroup.id,
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Modifier group '${name}' created.` };
}

export async function deleteModifierGroup(id: string): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("modifier_groups").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "modifier_group:delete",
    entity: "modifier_groups",
    entityId: id,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Modifier group deleted." };
}

export async function createModifier(formData: FormData): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const groupId = String(formData.get("modifierGroupId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const priceDelta = Number(formData.get("priceDelta") || 0);
  const isAvailable = formData.get("isAvailable") !== "false";
  const displayOrder = Number(formData.get("displayOrder") || 0);

  const parsed = modifierSchema.safeParse({
    modifier_group_id: groupId,
    name,
    price_delta: priceDelta,
    is_available: isAvailable,
    display_order: displayOrder,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid modifier option data." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("modifiers").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `An option named '${name}' already exists in this group.` };
    }
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    actorId: caller.userId,
    action: "modifier:create",
    entity: "modifiers",
    details: parsed.data,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: `Option '${name}' added.` };
}

export async function deleteModifier(id: string): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("modifiers").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAuditEvent({
    actorId: caller.userId,
    action: "modifier:delete",
    entity: "modifiers",
    entityId: id,
  });

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Modifier option removed." };
}

export async function assignProductModifierGroup(
  productId: string,
  modifierGroupId: string,
  displayOrder: number = 0
): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("product_modifier_groups").upsert({
    product_id: productId,
    modifier_group_id: modifierGroupId,
    display_order: displayOrder,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Modifier group attached to product." };
}

export async function removeProductModifierGroup(
  productId: string,
  modifierGroupId: string
): Promise<MenuActionResult> {
  const caller = await getCurrentStaff();
  if (!caller || !hasPermission(caller.profile.role, "menu:manage")) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_modifier_groups")
    .delete()
    .eq("product_id", productId)
    .eq("modifier_group_id", modifierGroupId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/menu");
  revalidatePath("/t", "layout");
  return { success: true, message: "Modifier group detached from product." };
}
