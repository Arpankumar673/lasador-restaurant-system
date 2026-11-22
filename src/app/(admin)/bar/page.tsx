import { requirePermission } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { fetchBarTickets } from "@/features/kitchen/actions";
import { BarDisplayView } from "@/features/kitchen/components/bar-display-view";

export default async function BarPage() {
  const currentStaff = await requirePermission("bar:view");
  const canUpdate = hasPermission(currentStaff.profile.role, "bar:update");

  const items = await fetchBarTickets("all_bar");

  return <BarDisplayView initialItems={items as any} canUpdate={canUpdate} />;
}
