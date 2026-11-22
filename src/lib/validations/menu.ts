import { z } from "zod";

export const itemStationSchema = z.enum([
  "kitchen_grill",
  "kitchen_fry",
  "kitchen_pantry",
  "bar_taps",
  "bar_cocktails",
]);

export const dietaryTypeSchema = z.enum(["veg", "non_veg", "egg", "vegan"]);

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().optional().nullable(),
  station: itemStationSchema.default("kitchen_grill"),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const productSchema = z.object({
  category_id: z.string().uuid("Category ID must be a valid UUID"),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().optional().nullable(),
  base_price: z.number().min(0, "Price cannot be negative"),
  dietary: dietaryTypeSchema.default("non_veg"),
  station: itemStationSchema.default("kitchen_grill"),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  display_order: z.number().int().default(0),
});

export const productVariantSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().optional().nullable(),
  price: z.number().min(0, "Price cannot be negative"),
  is_available: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export const modifierGroupSchema = z.object({
  name: z.string().min(2, "Modifier group name is required"),
  description: z.string().optional().nullable(),
  min_selections: z.number().int().min(0).default(0),
  max_selections: z.number().int().min(1).default(1),
  is_required: z.boolean().default(false),
});

export const modifierSchema = z.object({
  modifier_group_id: z.string().uuid(),
  name: z.string().min(1, "Modifier name is required"),
  price_delta: z.number().min(0, "Price delta cannot be negative").default(0),
  is_available: z.boolean().default(true),
  display_order: z.number().int().default(0),
});
