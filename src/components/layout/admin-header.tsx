"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutStaff } from "@/features/auth/actions";
import { StaffProfile } from "@/features/auth/server";
import { navItems } from "./admin-sidebar";
import { cn } from "@/lib/utils";
import {
  Flame,
  LogOut,
  ExternalLink,
  UserCheck,
  Shield,
  Menu,
  X,
  ChefHat,
  Beer,
} from "lucide-react";

interface AdminHeaderProps {
  staff?: StaffProfile | null;
}

export function AdminHeader({ staff }: AdminHeaderProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  // Close mobile nav automatically on route change
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const roleVariantMap = {
    owner: "brass",
    admin: "copper",
    manager: "malt",
    kitchen: "hops",
    bar: "malt",
  } as const;

  const role = staff?.role;
  const visibleNavItems = navItems.filter((item) => {
    if (!item.minRoles) return true;
    if (!role) return false;
    return item.minRoles.includes(role);
  });

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#E5DEC9] bg-[#FAF7F2]/90 px-3 sm:px-6 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,25,22,0.06)]">
        {/* Left: Mobile hamburger trigger & Brand logo */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {staff && (
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-asador text-asador-silver hover:text-asador-parchment hover:bg-asador-surface min-h-11 min-w-11 flex items-center justify-center transition-colors"
              aria-label="Toggle navigation drawer"
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

          <Link href="/admin" prefetch={false} className="flex items-center space-x-2 group">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-asador bg-gradient-to-br from-asador-ember to-asador-flame text-asador-ivory shadow-ember-glow shrink-0">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-sm sm:text-base font-bold tracking-wide text-asador-parchment truncate">
                L&apos;Asador Admin
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-asador-malt">
                Mohali &bull; Operations
              </span>
            </div>
          </Link>
        </div>

        {/* Right: User profile badge, sign out & public link */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {staff ? (
            <>
              <div className="flex items-center space-x-2 sm:space-x-3 border-r border-asador-borderMuted pr-2 sm:pr-4">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-asador-parchment leading-tight truncate max-w-[140px]">
                    {staff.full_name || staff.email}
                  </span>
                  <span className="text-[10px] text-asador-silver leading-tight truncate max-w-[140px]">
                    {staff.email}
                  </span>
                </div>
                <Badge
                  variant={roleVariantMap[staff.role] || "default"}
                  className="text-[10px] uppercase font-bold py-0.5 px-2 shrink-0"
                >
                  <Shield className="mr-1 h-3 w-3" />
                  {staff.role}
                </Badge>
              </div>

              <form action={signOutStaff}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 min-w-11 sm:min-w-0 sm:h-9 px-2.5 text-xs text-asador-silver hover:text-asador-ember"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
            </>
          ) : (
            <Link href="/admin/login">
              <Button variant="outline" size="sm" className="min-h-11 text-xs">
                <UserCheck className="mr-1.5 h-3.5 w-3.5 text-asador-malt" />
                Sign In
              </Button>
            </Link>
          )}

          <Link href="/" target="_blank" rel="noreferrer">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 h-11 w-11 text-asador-silver hover:text-asador-parchment"
              title="View Guest Site"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer (Visible on < lg screens) */}
      {isMobileNavOpen && staff && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Slide-over menu */}
          <div className="fixed inset-y-0 left-0 w-[82vw] max-w-xs bg-asador-card border-r border-asador-border shadow-2xl flex flex-col justify-between p-4 z-50 overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-asador-border">
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-asador bg-gradient-to-br from-asador-ember to-asador-flame text-asador-parchment shadow-ember-glow">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-serif text-sm font-bold text-asador-parchment block">
                      L&apos;Asador Menu
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-asador-copper">
                      Role: {staff.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-2 rounded-asador text-asador-silver hover:text-asador-parchment min-h-11 min-w-11 flex items-center justify-center"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Station shortcuts */}
              <div className="grid grid-cols-2 gap-2 pb-2">
                <Link
                  href="/kitchen"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-2.5 rounded-asador border border-asador-flame/30 bg-asador-flame/10 flex items-center space-x-2 text-xs font-semibold text-asador-parchment hover:bg-asador-flame/20 transition-colors min-h-11"
                >
                  <ChefHat className="h-4 w-4 text-asador-ember shrink-0" />
                  <span className="truncate">Open KDS</span>
                </Link>
                <Link
                  href="/bar"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-2.5 rounded-asador border border-asador-malt/30 bg-asador-malt/10 flex items-center space-x-2 text-xs font-semibold text-asador-parchment hover:bg-asador-malt/20 transition-colors min-h-11"
                >
                  <Beer className="h-4 w-4 text-asador-malt shrink-0" />
                  <span className="truncate">Open BDS</span>
                </Link>
              </div>

              {/* Navigation list */}
              <nav className="space-y-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-asador-ash">
                  Operational Modules
                </p>
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                      className={cn(
                        "group flex items-center justify-between rounded-asador px-3 py-2.5 text-xs font-medium min-h-11 transition-all",
                        isActive
                          ? "bg-asador-surface text-asador-ember border-l-2 border-asador-ember font-semibold"
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
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom staff info & sign out */}
            <div className="pt-4 border-t border-asador-border space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-asador-silver">
                <span className="truncate max-w-[170px]">{staff.email}</span>
                <Badge variant="copper" className="text-[10px] uppercase">
                  {staff.role}
                </Badge>
              </div>

              <form action={signOutStaff}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full text-xs min-h-11 text-asador-silver hover:text-asador-ember"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
