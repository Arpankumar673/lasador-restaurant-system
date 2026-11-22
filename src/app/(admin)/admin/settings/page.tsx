import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { RestaurantSettingsView } from "@/features/settings/components/restaurant-settings-view";

export default async function SettingsPage() {
  const currentStaff = await requirePermission("settings:view");
  const canManage = hasPermission(currentStaff.profile.role, "settings:manage");

  const supabase = createAdminClient();

  // Fetch singleton settings, business hours, and tax configurations
  const [settingsRes, hoursRes, taxesRes] = await Promise.all([
    supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("business_hours").select("*").order("day_of_week", { ascending: true }),
    supabase.from("tax_settings").select("*").order("created_at", { ascending: true }),
  ]);

  if (settingsRes.error) {
    console.error("Error fetching restaurant settings:", settingsRes.error.message);
  }
  if (hoursRes.error) {
    console.error("Error fetching business hours:", hoursRes.error.message);
  }
  if (taxesRes.error) {
    console.error("Error fetching tax settings:", taxesRes.error.message);
  }

  return (
    <RestaurantSettingsView
      settings={settingsRes.data || null}
      hours={hoursRes.data || []}
      taxes={taxesRes.data || []}
      canManage={canManage}
    />
  );
}
