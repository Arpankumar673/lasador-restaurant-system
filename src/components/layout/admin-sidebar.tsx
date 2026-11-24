"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { StaffRole } from "@/types/database.types";
import { signOutStaff } from "@/features/auth/actions";
import {
  LayoutDashboard,
  Users,
  Settings,
  ClipboardList,
  UtensilsCrossed,
  ChefHat,
  Beer,
  QrCode,
  BarChart3,
  Flame,
  LogOut,
} from "lucide-react";

interface AdminSidebarProps {
  role?: StaffRole;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
  minRoles?: StaffRole[];
}

export const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Floor Operations",
    href: "/admin/operations",
    icon: UtensilsCrossed,
    minRoles: ["owner", "admin", "manager"],
  },
  {
    title: "Kitchen Display (KDS)",
    href: "/kitchen",
    icon: ChefHat,
    minRoles: ["owner", "admin", "manager", "kitchen"],
  },
  {
    title: "Bar Display (BDS)",
    href: "/bar",
    icon: Beer,
    minRoles: ["owner", "admin", "manager", "bar"],
  },
  {
    title: "Menu Catalog",
    href: "/admin/menu",
    icon: Flame,
    minRoles: ["owner", "admin", "manager"],
  },
  {
    title: "Tables & QR",
    href: "/admin/tables",
    icon: QrCode,
    minRoles: ["owner", "admin", "manager"],
  },
  {
    title: "Billing & Settlement",
    href: "/admin/billing",
    icon: ClipboardList,
    minRoles: ["owner", "admin", "manager"],
  },
  {
    title: "Analytics & Reports",
    href: "/admin/analytics",
    icon: BarChart3,
    minRoles: ["owner", "admin"],
  },
  {
    title: "Staff Management",
    href: "/admin/staff",
    icon: Users,
    minRoles: ["owner", "admin", "manager"],
  },
  {
    title: "Restaurant Settings",
    href: "/admin/settings",
    icon: Settings,
    minRoles: ["owner", "admin", "manager"],
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    icon: ClipboardList,
    minRoles: ["owner", "admin"],
  },
];

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter items based on staff role
  const visibleItems = navItems.filter((item) => {
    if (!item.minRoles) return true;
    if (!role) return false;
    return item.minRoles.includes(role);
  });

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-asador-border bg-asador-surface/60 backdrop-blur-sm shrink-0">
      <div className="flex flex-col flex-1 p-4 space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-asador-ash">
            Operational Modules
          </p>
          <nav className="space-y-1 pt-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "group flex items-center justify-between rounded-asador px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-luxury-decel",
                    isActive
                      ? "bg-asador-surface text-asador-ember border-l-2 border-asador-ember font-semibold shadow-[inset_0_1px_0_0_rgba(244,239,230,0.06)]"
                      : "text-asador-silver hover:bg-asador-surface/50 hover:text-asador-parchment"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-asador-ember"
                          : "text-asador-silver group-hover:text-asador-parchment"
                      )}
                    />
                    <span>{item.title}</span>
                  </div>
                  {item.phase && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-asador-borderMuted text-asador-ash">
                      {item.phase}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Independence & Architecture Callout */}
        <div className="mt-auto space-y-3">
          <div className="rounded-asador-lg border border-asador-border/60 bg-asador-card/80 p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-asador-parchment">
              <span className="h-2 w-2 rounded-full bg-asador-ember" />
              <span>Dedicated System</span>
            </div>
            <p className="text-[11px] text-asador-silver leading-relaxed">
              Single-restaurant platform for L&apos;Asador – Grill & Brew, Mohali.
            </p>
          </div>

          <form action={signOutStaff} className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center space-x-3 rounded-asador px-3 py-2 text-xs font-medium text-asador-ash hover:bg-asador-surface hover:text-asador-ember transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
