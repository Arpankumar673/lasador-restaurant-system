"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutStaff } from "@/features/auth/actions";
import { StaffProfile } from "@/features/auth/server";
import { Flame, LogOut, ExternalLink, UserCheck, Shield } from "lucide-react";

interface AdminHeaderProps {
  staff?: StaffProfile | null;
}

export function AdminHeader({ staff }: AdminHeaderProps) {
  const roleVariantMap = {
    owner: "default",
    admin: "copper",
    manager: "malt",
    kitchen: "hops",
    bar: "malt",
  } as const;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-asador-border bg-asador-deep/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Brand logo & portal title */}
      <div className="flex items-center space-x-3">
        <Link href="/admin" className="flex items-center space-x-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-asador bg-gradient-to-br from-asador-ember to-asador-flame text-asador-parchment shadow-ember-glow">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-base font-bold tracking-wide text-asador-parchment">
              L&apos;Asador Admin
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-asador-malt">
              Mohali &bull; Single-Restaurant Operations
            </span>
          </div>
        </Link>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {staff ? (
          <>
            <div className="flex items-center space-x-3 border-r border-asador-borderMuted pr-3 sm:pr-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-asador-parchment leading-tight">
                  {staff.full_name || staff.email}
                </span>
                <span className="text-[10px] text-asador-silver leading-tight">
                  {staff.email}
                </span>
              </div>
              <Badge
                variant={roleVariantMap[staff.role] || "default"}
                className="text-[10px] uppercase font-bold py-0.5 px-2"
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
                className="text-xs text-asador-silver hover:text-asador-ember"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </>
        ) : (
          <Link href="/admin/login">
            <Button variant="outline" size="sm" className="text-xs">
              <UserCheck className="mr-1.5 h-3.5 w-3.5 text-asador-malt" />
              Sign In
            </Button>
          </Link>
        )}

        <Link href="/" target="_blank" rel="noreferrer">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-asador-silver" title="View Guest Site">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
