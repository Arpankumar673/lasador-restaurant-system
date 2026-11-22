import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { fetchKitchenTickets } from "@/features/kitchen/actions";
import { KitchenDisplayView } from "@/features/kitchen/components/kitchen-display-view";

export default async function KitchenPage() {
  const currentStaff = await requirePermission("kitchen:view");
  const canUpdate = hasPermission(currentStaff.profile.role, "kitchen:update");

  const items = await fetchKitchenTickets("all_kitchen");

  return <KitchenDisplayView initialItems={items as any} canUpdate={canUpdate} />;
}
