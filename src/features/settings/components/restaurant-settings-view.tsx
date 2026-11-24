"use client";

import * as React from "react";
import { Database } from "@/types/database.types";
import { updateRestaurantSettings } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Clock,
  Receipt,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Shield,
  Power,
} from "lucide-react";

type RestaurantSettings = Database["public"]["Tables"]["restaurant_settings"]["Row"];
type BusinessHour = Database["public"]["Tables"]["business_hours"]["Row"];
type TaxSetting = Database["public"]["Tables"]["tax_settings"]["Row"];

interface RestaurantSettingsViewProps {
  settings: RestaurantSettings | null;
  hours: BusinessHour[];
  taxes: TaxSetting[];
  canManage: boolean;
}

export function RestaurantSettingsView({
  settings,
  hours,
  taxes,
  canManage,
}: RestaurantSettingsViewProps) {
  const [activeTab, setActiveTab] = React.useState<"general" | "hours" | "taxes">("general");
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateRestaurantSettings(formData);

    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || "Failed to update restaurant settings.");
    } else {
      setSuccessMessage(result.message || "Settings updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Restaurant Settings
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Configure restaurant identity, operating schedule, and statutory tax parameters.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={canManage ? "hops" : "outline"} className="text-xs w-fit">
            <Shield className="mr-1 h-3.5 w-3.5" />
            {canManage ? "Owner/Admin Permissions Active" : "Read-Only View"}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-asador-border space-x-2 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap min-h-11 transition-colors ${
            activeTab === "general"
              ? "border-asador-ember text-asador-ember"
              : "border-transparent text-asador-silver hover:text-asador-parchment"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>General Info & Location</span>
        </button>

        <button
          onClick={() => setActiveTab("hours")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap min-h-11 transition-colors ${
            activeTab === "hours"
              ? "border-asador-ember text-asador-ember"
              : "border-transparent text-asador-silver hover:text-asador-parchment"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Operating Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab("taxes")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap min-h-11 transition-colors ${
            activeTab === "taxes"
              ? "border-asador-ember text-asador-ember"
              : "border-transparent text-asador-silver hover:text-asador-parchment"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Taxes & Compliance</span>
        </button>
      </div>

      {/* Status Notifications */}
      {successMessage && (
        <div className="flex items-start space-x-2.5 rounded-asador border border-asador-hops/40 bg-asador-hops/15 p-3 text-xs text-asador-parchment">
          <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start space-x-2.5 rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-3 text-xs text-asador-parchment">
          <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: GENERAL SETTINGS FORM
          ========================================================================= */}
      {activeTab === "general" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-asador-border bg-asador-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Brand & Operational Information</CardTitle>
              <CardDescription>
                Primary restaurant trade name, description, and emergency order controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="name">
                    Restaurant Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={settings?.name || "L'Asador – Grill & Brew"}
                    required
                    disabled={!canManage}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="tagline">
                    Brand Tagline
                  </label>
                  <Input
                    id="tagline"
                    name="tagline"
                    defaultValue={settings?.tagline || "Artisanal Wood-Fired Grill & Craft Microbrewery"}
                    disabled={!canManage}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="description">
                  Concept Narrative / Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={settings?.description || ""}
                  disabled={!canManage}
                  className="flex w-full rounded-asador border border-asador-border bg-asador-deep px-3 py-2 text-sm text-asador-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asador-ember disabled:opacity-60"
                />
              </div>

              {/* Emergency Killswitch */}
              <div className="rounded-asador border border-asador-border p-4 bg-asador-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-asador bg-asador-ember/20 text-asador-ember">
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-asador-parchment block">
                      Customer Ordering Status
                    </span>
                    <span className="text-xs text-asador-silver">
                      Emergency switch to pause or enable guest QR digital ordering.
                    </span>
                  </div>
                </div>
                <select
                  name="is_ordering_enabled"
                  defaultValue={settings?.is_ordering_enabled ? "true" : "false"}
                  disabled={!canManage}
                  className="h-9 rounded-asador border border-asador-border bg-asador-deep px-3 text-xs font-medium text-asador-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asador-ember"
                >
                  <option value="true">Ordering Active (Online)</option>
                  <option value="false">Ordering Suspended (Offline)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Location & Contact Information */}
          <Card className="border-asador-border bg-asador-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Location & Contact Details</CardTitle>
              <CardDescription>
                Physical address in Mohali, Punjab and operational contact lines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="address_line1">
                    Street Address
                  </label>
                  <Input
                    id="address_line1"
                    name="address_line1"
                    defaultValue={settings?.address_line1 || "Sector 82, JLPL Industrial Area"}
                    required
                    disabled={!canManage}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="address_line2">
                    Suite / Floor / Landmark
                  </label>
                  <Input
                    id="address_line2"
                    name="address_line2"
                    defaultValue={settings?.address_line2 || ""}
                    placeholder="Floor 1, Plot 101"
                    disabled={!canManage}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="city">
                    City
                  </label>
                  <Input id="city" name="city" defaultValue={settings?.city || "Mohali"} required disabled={!canManage} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="state">
                    State
                  </label>
                  <Input id="state" name="state" defaultValue={settings?.state || "Punjab"} required disabled={!canManage} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="pincode">
                    PIN Code
                  </label>
                  <Input id="pincode" name="pincode" defaultValue={settings?.pincode || "140308"} required disabled={!canManage} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="country">
                    Country
                  </label>
                  <Input id="country" name="country" defaultValue={settings?.country || "India"} required disabled={!canManage} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="phone">
                    Reservations Phone
                  </label>
                  <Input id="phone" name="phone" defaultValue={settings?.phone || "+91 98765 43210"} required disabled={!canManage} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="email">
                    Reservations Email
                  </label>
                  <Input id="email" name="email" type="email" defaultValue={settings?.email || "reservations@lasador.in"} required disabled={!canManage} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver">Currency</label>
                  <Input value="INR (₹)" disabled className="opacity-60 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver">Timezone</label>
                  <Input value="Asia/Kolkata (IST)" disabled className="opacity-60 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver">Architecture</label>
                  <Input value="Single Restaurant" disabled className="opacity-60 cursor-not-allowed" />
                </div>
              </div>
            </CardContent>
          </Card>

          {canManage && (
            <div className="flex justify-end">
              <Button type="submit" variant="default" size="lg" isLoading={isLoading} className="min-h-11 h-11 px-6 w-full sm:w-auto font-semibold">
                <Save className="mr-2 h-4 w-4" />
                Save Restaurant Settings
              </Button>
            </div>
          )}
        </form>
      )}

      {/* =========================================================================
          TAB 2: OPERATING HOURS
          ========================================================================= */}
      {activeTab === "hours" && (
        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Weekly Operating Schedule</CardTitle>
            <CardDescription>
              Regular opening and closing hours for L&apos;Asador – Grill & Brew.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-asador-border bg-asador-surface/50 text-[11px] uppercase tracking-wider text-asador-ash">
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Opening Time</th>
                    <th className="py-3 px-4">Closing Time</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-asador-borderMuted text-xs">
                  {hours.map((h) => (
                    <tr key={h.day_of_week} className="hover:bg-asador-surface/40">
                      <td className="py-3 px-4 font-semibold text-asador-parchment">{h.day_name}</td>
                      <td className="py-3 px-4 text-asador-silver">{h.open_time}</td>
                      <td className="py-3 px-4 text-asador-silver">{h.close_time}</td>
                      <td className="py-3 px-4">
                        {h.is_closed ? (
                          <Badge variant="outline" className="text-[10px]">Closed</Badge>
                        ) : (
                          <span className="text-[#5dd974] font-medium text-[11px]">Open for Dining</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          TAB 3: TAXES & COMPLIANCE
          ========================================================================= */}
      {activeTab === "taxes" && (
        <div className="space-y-6">
          <Card className="border-asador-border bg-asador-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Statutory Tax Parameters</CardTitle>
              <CardDescription>
                Statutory GST rates and service charges. Rates are applied server-side on bill calculation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-asador-border bg-asador-surface/50 text-[11px] uppercase tracking-wider text-asador-ash">
                      <th className="py-3 px-4">Tax / Charge</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Rate (%)</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-asador-borderMuted text-xs">
                    {taxes.map((t) => (
                      <tr key={t.id} className="hover:bg-asador-surface/40">
                        <td className="py-3 px-4 font-semibold text-asador-parchment">{t.name}</td>
                        <td className="py-3 px-4 uppercase text-asador-silver font-mono text-[11px]">{t.code}</td>
                        <td className="py-3 px-4 font-bold text-asador-malt">{Number(t.rate_percentage).toFixed(2)}%</td>
                        <td className="py-3 px-4 text-asador-silver">
                          {t.is_inclusive ? "Inclusive (In Price)" : "Exclusive (Added at Bill)"}
                        </td>
                        <td className="py-3 px-4">
                          {t.is_active ? (
                            <span className="text-[#5dd974] font-medium text-[11px]">Active</span>
                          ) : (
                            <span className="text-asador-ash text-[11px]">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-asador-border bg-asador-surface/60">
            <CardContent className="p-4 text-xs text-asador-silver space-y-1.5">
              <p className="font-semibold text-asador-parchment flex items-center space-x-1.5">
                <AlertCircle className="h-4 w-4 text-asador-malt" />
                <span>Statutory Compliance Notice</span>
              </p>
              <p>
                Tax configurations shown here reflect standard GST schedules (5% restaurant composite = 2.5% CGST + 2.5% SGST)
                and standard hospitality service charge placeholders. Changes to statutory tax rates must be approved by restaurant
                financial administration prior to modification.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
