import { createClient } from "./client";
import { createServerSupabaseClient } from "./server";
import type { Database, StaffRole } from "../../types/database.types";

/**
 * Server-side helper to fetch L'Asador restaurant configuration.
 */
export async function getRestaurantSettings() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.warn("Could not fetch restaurant settings:", error.message);
    return null;
  }
  return data;
}

/**
 * Server-side helper to fetch weekly operating hours.
 */
export async function getBusinessHours() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .order("day_of_week", { ascending: true });

  if (error) {
    console.warn("Could not fetch business hours:", error.message);
    return [];
  }
  return data;
}

/**
 * Server-side helper to fetch active menu catalog.
 */
export async function getActiveMenuCatalog() {
  const supabase = createServerSupabaseClient();
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*, products(*, product_variants(*))")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (catError) {
    console.warn("Could not fetch menu catalog:", catError.message);
    return [];
  }
  return categories;
}

/**
 * Server-side helper to fetch active dining tables.
 */
export async function getActiveDiningTables() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .select("*")
    .eq("is_active", true)
    .order("table_number", { ascending: true });

  if (error) {
    console.warn("Could not fetch dining tables:", error.message);
    return [];
  }
  return data;
}

/**
 * Client-side helper for browser components to read public restaurant profile.
 */
export async function getClientRestaurantSettings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return null;
  }
  return data;
}
