"use client";

import * as React from "react";
import { StaffProfile } from "@/features/auth/server";
import { StaffRole } from "@/types/database.types";
import { createStaffMember, updateStaffMember } from "../actions";
import { canManageStaffRole } from "@/features/auth/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Phone,
  Mail,
  Calendar,
  Clock,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";

interface StaffManagementViewProps {
  initialStaff: StaffProfile[];
  currentRole: StaffRole;
  currentUserId: string;
}

export function StaffManagementView({
  initialStaff,
  currentRole,
  currentUserId,
}: StaffManagementViewProps) {
  const [staffList, setStaffList] = React.useState<StaffProfile[]>(initialStaff);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  // Provisioning Modal State
  const [isProvisionOpen, setIsProvisionOpen] = React.useState(false);
  const [provisionLoading, setProvisionLoading] = React.useState(false);
  const [provisionError, setProvisionError] = React.useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = React.useState<string | null>(null);

  // Edit Modal State
  const [editingStaff, setEditingStaff] = React.useState<StaffProfile | null>(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const canManage = currentRole === "owner" || currentRole === "admin";

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleVariantMap = {
    owner: "default",
    admin: "copper",
    manager: "malt",
    kitchen: "hops",
    bar: "malt",
  } as const;

  async function handleProvisionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProvisionLoading(true);
    setProvisionError(null);
    setProvisionSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createStaffMember(formData);

    setProvisionLoading(false);
    if (!result.success) {
      setProvisionError(result.error || "Failed to provision staff member.");
    } else {
      setProvisionSuccess(result.message || "Staff member provisioned successfully.");
      form.reset();
      setTimeout(() => {
        setIsProvisionOpen(false);
        setProvisionSuccess(null);
        window.location.reload();
      }, 1500);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingStaff) return;

    setEditLoading(true);
    setEditError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateStaffMember(formData);

    setEditLoading(false);
    if (!result.success) {
      setEditError(result.error || "Failed to update staff member.");
    } else {
      setEditingStaff(null);
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Staff Management
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Provision, manage roles, and monitor active staff accounts for L&apos;Asador – Grill & Brew.
          </p>
        </div>

        {canManage && (
          <Button
            variant="default"
            onClick={() => setIsProvisionOpen(true)}
            className="min-h-11 sm:h-9 text-xs font-semibold px-4 w-full sm:w-auto shrink-0"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Provision Staff
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-asador-ash" />
          <Input
            placeholder="Search by staff name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 max-w-full">
          {["all", "owner", "admin", "manager", "kitchen", "bar"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`min-h-8 px-3 py-1.5 rounded-asador text-xs font-semibold uppercase tracking-wider shrink-0 whitespace-nowrap transition-colors ${
                roleFilter === r
                  ? "bg-asador-ember text-asador-parchment"
                  : "bg-asador-surface text-asador-silver hover:bg-asador-surfaceHover"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff View (Dual-Mode: Mobile Cards + Desktop Table) */}
      <Card className="border-asador-border bg-asador-card overflow-hidden">
        <CardContent className="p-0">
          {filteredStaff.length === 0 ? (
            <div className="py-12 text-center text-asador-silver">
              <Users className="mx-auto h-8 w-8 text-asador-ash mb-2" />
              <p className="text-sm font-semibold">No staff members found.</p>
              <p className="text-xs text-asador-ash mt-0.5">
                {searchQuery ? "Try refining your search filter." : "Click Provision Staff to add the first staff account."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Stacked Staff Cards */}
              <div className="md:hidden divide-y divide-asador-border">
                {filteredStaff.map((staff) => {
                  const isSelf = staff.id === currentUserId;
                  const canEditThisStaff = canManage && canManageStaffRole(currentRole, staff.role);

                  return (
                    <div key={staff.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-sm text-asador-parchment block">
                            {staff.full_name || "Unnamed Staff"} {isSelf && "(You)"}
                          </span>
                          <span className="text-asador-silver text-xs flex items-center space-x-1 mt-0.5">
                            <Mail className="h-3 w-3 inline text-asador-ash shrink-0" />
                            <span className="truncate max-w-[200px]">{staff.email}</span>
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

                      <div className="flex items-center justify-between text-xs py-1.5 border-y border-asador-border/40 text-asador-silver">
                        <div>
                          {staff.phone ? (
                            <span className="flex items-center space-x-1">
                              <Phone className="h-3 w-3 text-asador-ash shrink-0" />
                              <span>{staff.phone}</span>
                            </span>
                          ) : (
                            <span className="text-asador-ash italic">No phone</span>
                          )}
                        </div>
                        <div>
                          {staff.is_active ? (
                            <span className="inline-flex items-center text-[11px] font-medium text-[#5dd974]">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-medium text-asador-flame">
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Deactivated
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-asador-ash flex items-center space-x-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>Last login: {staff.last_login_at ? new Date(staff.last_login_at).toLocaleDateString() : "Never"}</span>
                        </span>

                        {canManage && canEditThisStaff && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingStaff(staff)}
                            className="min-h-11 h-11 px-4 text-xs font-semibold"
                          >
                            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-asador-border bg-asador-surface/50 text-[11px] uppercase tracking-wider text-asador-ash">
                      <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                      <th className="py-3.5 px-4 font-semibold">Role</th>
                      <th className="py-3.5 px-4 font-semibold">Contact</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">Created / Last Login</th>
                      {canManage && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-asador-borderMuted text-xs">
                    {filteredStaff.map((staff) => {
                      const isSelf = staff.id === currentUserId;
                      const canEditThisStaff = canManage && canManageStaffRole(currentRole, staff.role);

                      return (
                        <tr key={staff.id} className="hover:bg-asador-surface/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-asador-parchment">
                                {staff.full_name || "Unnamed Staff"} {isSelf && "(You)"}
                              </span>
                              <span className="text-asador-silver text-[11px] flex items-center space-x-1">
                                <Mail className="h-3 w-3 inline text-asador-ash" />
                                <span>{staff.email}</span>
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={roleVariantMap[staff.role] || "default"}
                              className="text-[10px] uppercase font-bold py-0.5 px-2"
                            >
                              <Shield className="mr-1 h-3 w-3" />
                              {staff.role}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-asador-silver">
                            {staff.phone ? (
                              <span className="flex items-center space-x-1">
                                <Phone className="h-3 w-3 text-asador-ash" />
                                <span>{staff.phone}</span>
                              </span>
                            ) : (
                              <span className="text-asador-ash italic">No phone</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {staff.is_active ? (
                              <span className="inline-flex items-center text-[11px] font-medium text-[#5dd974]">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[11px] font-medium text-asador-flame">
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-asador-silver">
                            <div className="flex flex-col space-y-0.5 text-[11px]">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 text-asador-ash" />
                                <span>{new Date(staff.created_at).toLocaleDateString()}</span>
                              </span>
                              <span className="flex items-center space-x-1 text-asador-ash">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {staff.last_login_at
                                    ? new Date(staff.last_login_at).toLocaleDateString()
                                    : "Never"}
                                </span>
                              </span>
                            </div>
                          </td>
                          {canManage && (
                            <td className="py-3.5 px-4 text-right">
                              {canEditThisStaff ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingStaff(staff)}
                                  className="h-7 px-2.5 text-[11px]"
                                >
                                  <Edit2 className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                              ) : (
                                <span className="text-[10px] text-asador-ash italic">Protected</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          PROVISION STAFF MODAL
          ========================================================================= */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border-asador-border bg-asador-card shadow-2xl pb-safe">
            <CardHeader className="flex flex-row items-center justify-between px-5 sm:px-6 py-4 border-b border-asador-border bg-asador-deep">
              <div>
                <CardTitle className="text-lg sm:text-xl">Provision New Staff Account</CardTitle>
                <CardDescription className="text-xs">
                  Creates an authorized account in Supabase Auth and links their profile.
                </CardDescription>
              </div>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-ash hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {provisionError && (
                <div className="mb-4 flex items-start space-x-2.5 rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-3 text-xs text-asador-parchment">
                  <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
                  <span>{provisionError}</span>
                </div>
              )}

              {provisionSuccess && (
                <div className="mb-4 flex items-start space-x-2.5 rounded-asador border border-asador-hops/40 bg-asador-hops/15 p-3 text-xs text-asador-parchment">
                  <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0 mt-0.5" />
                  <span>{provisionSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProvisionSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="fullName">
                    Full Name
                  </label>
                  <Input id="fullName" name="fullName" placeholder="e.g. Chef Vikram Singh" required className="h-9 text-xs" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="email">
                      Staff Email
                    </label>
                    <Input id="email" name="email" type="email" placeholder="vikram@lasador.in" required className="h-9 text-xs" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="phone">
                      Phone Number
                    </label>
                    <Input id="phone" name="phone" placeholder="+91 98765 00000" className="h-9 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="role">
                      Assigned Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      defaultValue="kitchen"
                      className="flex h-9 w-full rounded-asador border border-asador-border bg-asador-deep px-3 py-1.5 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                    >
                      {currentRole === "owner" && <option value="owner">Owner (Full Control)</option>}
                      {currentRole === "owner" && <option value="admin">Administrator</option>}
                      <option value="manager">Manager (Operations & Tables)</option>
                      <option value="kitchen">Kitchen Station (KDS Prep)</option>
                      <option value="bar">Bar Station (BDS Taps)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="password">
                      Initial Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-asador-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsProvisionOpen(false)}
                    disabled={provisionLoading}
                    className="min-h-11 h-11 px-4 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" isLoading={provisionLoading} className="min-h-11 h-11 px-5 text-xs font-semibold">
                    Provision Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          EDIT STAFF MODAL
          ========================================================================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border-asador-border bg-asador-card shadow-2xl pb-safe">
            <CardHeader className="flex flex-row items-center justify-between px-5 sm:px-6 py-4 border-b border-asador-border bg-asador-deep">
              <div>
                <CardTitle className="text-lg sm:text-xl">Edit Staff Profile</CardTitle>
                <CardDescription className="text-xs">
                  Update details, assign role, or activate/deactivate account access.
                </CardDescription>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-ash hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {editError && (
                <div className="mb-4 flex items-start space-x-2.5 rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-3 text-xs text-asador-parchment">
                  <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <input type="hidden" name="id" value={editingStaff.id} />

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="editFullName">
                    Full Name
                  </label>
                  <Input
                    id="editFullName"
                    name="fullName"
                    defaultValue={editingStaff.full_name || ""}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver">
                      Email (Read Only)
                    </label>
                    <Input value={editingStaff.email} disabled className="opacity-60 cursor-not-allowed h-9 text-xs" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="editPhone">
                      Phone Number
                    </label>
                    <Input
                      id="editPhone"
                      name="phone"
                      defaultValue={editingStaff.phone || ""}
                      placeholder="+91 98765 00000"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="editRole">
                      Assigned Role
                    </label>
                    <select
                      id="editRole"
                      name="role"
                      required
                      defaultValue={editingStaff.role}
                      disabled={editingStaff.id === currentUserId} // cannot modify own role
                      className="flex h-9 w-full rounded-asador border border-asador-border bg-asador-deep px-3 py-1.5 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember disabled:opacity-50"
                    >
                      {currentRole === "owner" && <option value="owner">Owner (Full Control)</option>}
                      {currentRole === "owner" && <option value="admin">Administrator</option>}
                      <option value="manager">Manager</option>
                      <option value="kitchen">Kitchen Station</option>
                      <option value="bar">Bar Station</option>
                    </select>
                    {editingStaff.id === currentUserId && (
                      <p className="text-[10px] text-asador-ash mt-0.5">
                        Self-role modification is prohibited by database policy.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="editIsActive">
                      Account Status
                    </label>
                    <select
                      id="editIsActive"
                      name="isActive"
                      defaultValue={editingStaff.is_active ? "true" : "false"}
                      className="flex h-9 w-full rounded-asador border border-asador-border bg-asador-deep px-3 py-1.5 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                    >
                      <option value="true">Active (Access Allowed)</option>
                      <option value="false">Deactivated (Access Blocked)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-asador-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingStaff(null)}
                    disabled={editLoading}
                    className="min-h-11 h-11 px-4 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" isLoading={editLoading} className="min-h-11 h-11 px-5 text-xs font-semibold">
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
