import { requirePermission } from "@/features/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManagementView } from "@/features/staff/components/staff-management-view";

export default async function StaffManagementPage() {
  const currentStaff = await requirePermission("staff:view");

  // Fetch all staff profiles
  const supabase = createAdminClient();
  const { data: staffList, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff profiles:", error.message);
  }

  return (
    <StaffManagementView
      initialStaff={staffList || []}
      currentRole={currentStaff.profile.role}
      currentUserId={currentStaff.userId}
    />
  );
}
