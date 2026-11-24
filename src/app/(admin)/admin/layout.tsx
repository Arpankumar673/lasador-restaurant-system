import { getCurrentStaff } from "@/features/auth/server";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();

  return (
    <div className="flex min-h-screen flex-col bg-asador-deep w-full overflow-x-hidden">
      <AdminHeader staff={staff?.profile || null} />
      <div className="flex flex-1 w-full min-w-0">
        {staff && <AdminSidebar role={staff.profile.role} />}
        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
