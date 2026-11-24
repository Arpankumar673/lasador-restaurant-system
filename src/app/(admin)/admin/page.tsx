import Link from "next/link";
import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Beer,
  UtensilsCrossed,
  ChefHat,
  ShieldCheck,
  Server,
  Layers,
  CheckCircle2,
  Sparkles,
  Users,
  Settings,
  FileText,
  ArrowRight,
  ShieldAlert,
  Clock,
  Store,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const currentStaff = await getCurrentStaff();
  const role = currentStaff?.profile.role;

  const canManageStaff = role ? hasPermission(role, "staff:view") : false;
  const canManageSettings = role ? hasPermission(role, "settings:view") : false;
  const canViewAudit = role ? hasPermission(role, "audit:view") : false;

  const stations = [
    {
      name: "Wood-Fired Grill Hearth",
      station: "kitchen_grill",
      description: "Steaks, skewers, sausages, roasted cuts over open oak embers",
      icon: Flame,
      color: "text-asador-ember",
    },
    {
      name: "Fry & Sauté Kitchen",
      station: "kitchen_fry",
      description: "Sides, artisanal fries, sauces, warm appetizers",
      icon: ChefHat,
      color: "text-asador-flame",
    },
    {
      name: "Pantry & Cold Station",
      station: "kitchen_pantry",
      description: "Burrata, cured meats, salads, bread, desserts",
      icon: UtensilsCrossed,
      color: "text-asador-copper",
    },
    {
      name: "Craft Beer Taps",
      station: "bar_taps",
      description: "Draft beer dispensing, temperature-controlled keg lines",
      icon: Beer,
      color: "text-asador-malt",
    },
    {
      name: "Cocktails & Mixology",
      station: "bar_cocktails",
      description: "Signature smoked cocktails, spirits, mocktails",
      icon: Sparkles,
      color: "text-asador-silver",
    },
  ];

  const architecturalPhases = [
    {
      phase: "Phase 1: Project Foundation",
      status: "Completed",
      detail: "Next.js 14, Tailwind design tokens, SSR client, security boundaries",
      badge: "hops" as const,
    },
    {
      phase: "Phase 2: Database & RLS",
      status: "Implemented",
      detail: "22 normalized PostgreSQL tables, strict RLS, single-restaurant isolated",
      badge: "hops" as const,
    },
    {
      phase: "Phase 3: Admin Foundation",
      status: "Active",
      detail: "Supabase Auth, RBAC hierarchy, staff provisioning, settings, audit trail",
      badge: "hops" as const,
    },
    {
      phase: "Phase 4: Menu Management",
      status: "Next in Roadmap",
      detail: "Categories, products, wood-fired specials, modifiers & craft brews",
      badge: "outline" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
              Executive Console
            </h1>
            {currentStaff && (
              <Badge variant="copper" className="capitalize text-xs font-mono">
                {currentStaff.profile.role}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            L&apos;Asador – Grill & Brew &bull; Sector 82, JLPL Industrial Area, Mohali, Punjab
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="hops" className="text-xs py-1 w-fit">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Phase 3 Admin Live
          </Badge>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="rounded-asador-lg border border-asador-copper/40 bg-asador-card p-4 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-asador-copper font-semibold flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-asador-copper" />
              Authenticated Session
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-asador-parchment">
              Welcome back, {currentStaff?.profile.full_name || "Staff Member"}
            </h2>
            <p className="text-xs text-asador-silver max-w-2xl leading-relaxed">
              Administrative management modules are active for your role. You have authorized access to configure restaurant identity, provision team accounts, and monitor immutable security audit logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {canManageStaff && (
              <Link prefetch={false} href="/admin/staff" className="flex-1 sm:flex-initial">
                <Button size="sm" variant="default" className="w-full text-xs min-h-11 sm:h-9 font-semibold">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Staff Roster
                </Button>
              </Link>
            )}
            {canManageSettings && (
              <Link prefetch={false} href="/admin/settings" className="flex-1 sm:flex-initial">
                <Button size="sm" variant="outline" className="w-full text-xs min-h-11 sm:h-9 font-semibold">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Action Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Module 1: Staff Management */}
        <Card className="border-asador-border bg-asador-card hover:border-asador-copper/60 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-asador bg-asador-ember/15 text-asador-ember border border-asador-ember/30">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant={canManageStaff ? "hops" : "outline"} className="text-[10px]">
                {canManageStaff ? "Authorized" : "Restricted"}
              </Badge>
            </div>
            <CardTitle className="text-base font-serif mt-3 text-asador-parchment">
              Team & RBAC Roster
            </CardTitle>
            <CardDescription className="text-xs text-asador-silver">
              Provision administrative credentials, assign roles (Owner, Admin, Manager, Kitchen, Bar), and manage staff access.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {canManageStaff ? (
              <Link prefetch={false} href="/admin/staff" className="min-h-11 flex items-center justify-between text-xs font-medium text-asador-parchment hover:text-asador-ember py-2 transition-colors border-t border-asador-border/40">
                <span>Manage Staff</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            ) : (
              <span className="text-[11px] text-asador-silver italic flex items-center py-2">
                <ShieldAlert className="h-3.5 w-3.5 mr-1 text-asador-flame" /> Requires staff:view permission
              </span>
            )}
          </CardContent>
        </Card>

        {/* Module 2: Restaurant Settings */}
        <Card className="border-asador-border bg-asador-card hover:border-asador-copper/60 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-asador bg-asador-copper/15 text-asador-copper border border-asador-copper/30">
                <Store className="h-5 w-5" />
              </div>
              <Badge variant={canManageSettings ? "hops" : "outline"} className="text-[10px]">
                {canManageSettings ? "Authorized" : "Restricted"}
              </Badge>
            </div>
            <CardTitle className="text-base font-serif mt-3 text-asador-parchment">
              Restaurant Configuration
            </CardTitle>
            <CardDescription className="text-xs text-asador-silver">
              Manage trade information, Mohali location address, GSTIN, FSSAI licensing, operating schedule, and emergency killswitch.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {canManageSettings ? (
              <Link prefetch={false} href="/admin/settings" className="min-h-11 flex items-center justify-between text-xs font-medium text-asador-parchment hover:text-asador-copper py-2 transition-colors border-t border-asador-border/40">
                <span>Configure Settings</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            ) : (
              <span className="text-[11px] text-asador-silver italic flex items-center py-2">
                <ShieldAlert className="h-3.5 w-3.5 mr-1 text-asador-flame" /> Requires settings:view permission
              </span>
            )}
          </CardContent>
        </Card>

        {/* Module 3: Audit Logging */}
        <Card className="border-asador-border bg-asador-card hover:border-asador-copper/60 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-asador bg-asador-malt/15 text-asador-malt border border-asador-malt/30">
                <FileText className="h-5 w-5" />
              </div>
              <Badge variant={canViewAudit ? "hops" : "outline"} className="text-[10px]">
                {canViewAudit ? "Authorized" : "Restricted"}
              </Badge>
            </div>
            <CardTitle className="text-base font-serif mt-3 text-asador-parchment">
              Security Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-asador-silver">
              Inspect immutable audit records with automatic password redaction, actor attribution, and Indian Standard Time timestamps.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {canViewAudit ? (
              <Link prefetch={false} href="/admin/audit-logs" className="min-h-11 flex items-center justify-between text-xs font-medium text-asador-parchment hover:text-asador-malt py-2 transition-colors border-t border-asador-border/40">
                <span>Inspect Logs</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            ) : (
              <span className="text-[11px] text-asador-silver italic flex items-center py-2">
                <ShieldAlert className="h-3.5 w-3.5 mr-1 text-asador-flame" /> Requires audit:view permission
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Station Routing & Project Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Station Routing Architecture */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-xl font-bold text-asador-parchment flex items-center space-x-2">
            <Layers className="h-5 w-5 text-asador-ember" />
            <span>Station Routing Architecture</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stations.map((st) => {
              const Icon = st.icon;
              return (
                <Card key={st.station} className="bg-asador-card/90 border-asador-border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-asador bg-asador-surface border border-asador-border">
                        <Icon className={`h-4 w-4 ${st.color}`} />
                      </div>
                      <CardTitle className="text-sm text-asador-parchment">{st.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <CardDescription className="text-xs text-asador-silver">
                      {st.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Roadmap & System Status */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-asador-parchment flex items-center space-x-2">
            <Server className="h-5 w-5 text-asador-copper" />
            <span>Platform Lifecycle</span>
          </h2>
          <div className="space-y-3">
            {architecturalPhases.map((item) => (
              <div
                key={item.phase}
                className="rounded-asador border border-asador-border bg-asador-card p-3.5 flex items-start space-x-3"
              >
                {item.status === "Next in Roadmap" ? (
                  <Clock className="h-4 w-4 text-asador-silver shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-asador-parchment">
                      {item.phase}
                    </span>
                    <Badge variant={item.badge} className="text-[10px] py-0 px-1.5 uppercase font-medium">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-asador-silver leading-snug">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
