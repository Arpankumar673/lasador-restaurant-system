"use client";

import * as React from "react";
import { Database } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  createDiningTable,
  updateDiningTable,
  toggleTableStatus,
  regenerateQrToken,
  revokeQrToken,
} from "../actions";
import { generateQrSvg } from "@/lib/utils/qr";
import {
  QrCode,
  Users,
  MapPin,
  RefreshCw,
  Plus,
  Edit,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Copy,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

type DiningTable = Database["public"]["Tables"]["dining_tables"]["Row"];
type TableQrToken = Database["public"]["Tables"]["table_qr_tokens"]["Row"];
type TableSession = Database["public"]["Tables"]["table_sessions"]["Row"];

export interface FullTable extends DiningTable {
  active_token?: TableQrToken | null;
  active_session?: TableSession | null;
}

interface TableManagementViewProps {
  initialTables: FullTable[];
  canManage: boolean;
}

export function TableManagementView({
  initialTables,
  canManage,
}: TableManagementViewProps) {
  const [selectedZone, setSelectedZone] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Notifications
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Modals
  const [isTableModalOpen, setIsTableModalOpen] = React.useState(false);
  const [editingTable, setEditingTable] = React.useState<FullTable | null>(null);

  // QR Modal
  const [activeQrModal, setActiveQrModal] = React.useState<{
    table: FullTable;
    tokenString: string;
    customerUrl: string;
    svgContent: string;
  } | null>(null);

  const [copied, setCopied] = React.useState(false);

  // Extract unique zones
  const zones = React.useMemo(() => {
    const set = new Set<string>();
    initialTables.forEach((t) => set.add(t.zone));
    return Array.from(set);
  }, [initialTables]);

  // Filtered tables
  const filteredTables = React.useMemo(() => {
    return initialTables.filter((table) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        table.table_number.toLowerCase().includes(q) ||
        (table.label && table.label.toLowerCase().includes(q)) ||
        table.zone.toLowerCase().includes(q);

      const matchesZone = selectedZone === "all" || table.zone === selectedZone;
      return matchesSearch && matchesZone;
    });
  }, [initialTables, searchQuery, selectedZone]);

  const openQrModal = (table: FullTable, rawToken?: string) => {
    try {
      const token =
        rawToken ||
        table.active_token?.raw_token ||
        table.active_token?.token_hash ||
        "demo-qr-token";
      const origin = typeof window !== "undefined" ? window.location.origin : "https://lasador.in";
      const customerUrl = `${origin}/t/${token}`;
      const svg = generateQrSvg(customerUrl, {
        size: 260,
        margin: 3,
        darkColor: "#1E1916",
        lightColor: "#FFFFFF",
      });

      setActiveQrModal({
        table,
        tokenString: token,
        customerUrl,
        svgContent: svg,
      });
    } catch (err) {
      console.error("Failed to generate QR modal:", err);
      showToast("error", "Unable to open QR Code modal.");
    }
  };

  const copyUrl = () => {
    if (!activeQrModal) return;
    navigator.clipboard.writeText(activeQrModal.customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printQrLabel = () => {
    if (!activeQrModal) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Label - Table ${activeQrModal.table.table_number}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #fff;
              color: #1a1614;
            }
            .label-card {
              border: 2px solid #1a1614;
              border-radius: 12px;
              padding: 24px 32px;
              text-align: center;
              width: 320px;
            }
            .brand {
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #e05a1b;
              margin-bottom: 4px;
            }
            .subtitle {
              font-size: 11px;
              color: #666;
              margin-bottom: 16px;
            }
            .qr-wrap {
              display: inline-block;
              margin: 10px 0;
            }
            .table-num {
              font-size: 24px;
              font-weight: 900;
              margin: 8px 0 2px 0;
            }
            .zone {
              font-size: 12px;
              color: #555;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .scan-hint {
              font-size: 11px;
              color: #888;
              margin-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="brand">L'Asador</div>
            <div class="subtitle">Artisanal Wood-Fired Grill & Craft Microbrewery</div>
            <div class="qr-wrap">${activeQrModal.svgContent}</div>
            <div class="table-num">TABLE ${activeQrModal.table.table_number}</div>
            <div class="zone">${activeQrModal.table.zone}</div>
            <div class="scan-hint">Scan to browse menu & order from your phone</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadSvg = () => {
    if (!activeQrModal) return;
    const blob = new Blob([activeQrModal.svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lasador-table-${activeQrModal.table.table_number}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Dining Tables & QR Tokens
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Manage floor layout, table capacities, cryptographic QR codes, and active dining sessions.
          </p>
        </div>

        {canManage && (
          <Button
            size="sm"
            variant="default"
            className="min-h-11 sm:h-9 text-xs font-semibold px-4 w-full sm:w-auto"
            onClick={() => {
              setEditingTable(null);
              setIsTableModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Dining Table
          </Button>
        )}
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`flex items-start space-x-2.5 rounded-asador border p-3 text-xs ${
            message.type === "success"
              ? "border-asador-hops/40 bg-asador-hops/15 text-asador-parchment"
              : "border-asador-flame/40 bg-asador-flame/15 text-asador-parchment"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters Bar */}
      <Card className="border-asador-border bg-asador-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search table number or label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-asador-deep border-asador-border text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <Button
                variant={selectedZone === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 px-3 shrink-0 whitespace-nowrap"
                onClick={() => setSelectedZone("all")}
              >
                All Zones
              </Button>
              {zones.map((z) => (
                <Button
                  key={z}
                  variant={selectedZone === z ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8 px-3 shrink-0 whitespace-nowrap"
                  onClick={() => setSelectedZone(z)}
                >
                  {z}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {filteredTables.map((table) => {
          const hasActiveToken = Boolean(table.active_token);
          const isOccupied = Boolean(table.active_session && table.active_session.status === "active");

          return (
            <Card
              key={table.id}
              className={`border-asador-border bg-asador-card overflow-hidden flex flex-col justify-between transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:border-asador-copper/50 hover:shadow-[0_12px_28px_-12px_rgba(92,29,36,0.12)] ${
                !table.is_active ? "opacity-60 border-dashed" : ""
              }`}
            >
              <div>
                <CardHeader className="p-2.5 sm:p-4 pb-2 bg-asador-deep/50 border-b border-asador-border">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-asador-parchment truncate">
                      {table.table_number}
                    </span>
                    <Badge
                      variant={table.is_active ? (isOccupied ? "copper" : "hops") : "outline"}
                      className="text-[9px] sm:text-[10px] px-1.5 py-0.5 shrink-0"
                    >
                      {table.is_active ? (isOccupied ? "Occupied" : "Available") : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="text-[10px] sm:text-xs text-asador-silver mt-0.5 truncate">
                    {table.label || "No custom label"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-[11px] sm:text-xs text-asador-silver">
                    <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-asador-copper shrink-0" />
                      <span className="truncate">{table.zone}</span>
                    </div>

                    <div className="flex items-center space-x-1 sm:space-x-1.5">
                      <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-asador-malt shrink-0" />
                      <span className="truncate">{table.capacity} Guests</span>
                    </div>
                  </div>

                  {/* QR Token Status */}
                  <div className="rounded-asador border border-asador-sandBorder bg-asador-deep p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <QrCode className="h-3.5 w-3.5 text-asador-ember shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-asador-parchment block truncate">
                            {hasActiveToken ? "QR Active" : "No QR"}
                          </span>
                          {hasActiveToken && (
                            <span className="h-1.5 w-1.5 rounded-full bg-asador-emeraldText animate-pulse-calm shrink-0" />
                          )}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-asador-silver font-mono block truncate max-w-[100px] sm:max-w-[140px]">
                          {hasActiveToken ? "SHA-256" : "Revoked"}
                        </span>
                      </div>
                    </div>

                    {hasActiveToken && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[28px] h-7 px-2 text-[10px] sm:text-xs text-asador-parchment hover:text-asador-ember w-full sm:w-auto"
                        onClick={() => openQrModal(table)}
                      >
                        View QR
                      </Button>
                    )}
                  </div>
                </CardContent>
              </div>

              {canManage && (
                <div className="p-2 sm:p-3 border-t border-asador-border bg-asador-deep/30 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center space-x-0.5 sm:space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 sm:px-2 text-[10px] sm:text-[11px]"
                      onClick={() => {
                        setEditingTable(table);
                        setIsTableModalOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-asador-copper"
                      title="Generate new QR token (revokes current)"
                      onClick={async () => {
                        if (confirm(`Regenerate QR token for ${table.table_number}? Current code will stop working.`)) {
                          const res = await regenerateQrToken(table.id);
                          if (res.success && res.rawToken) {
                            showToast("success", res.message || "Regenerated.");
                            openQrModal(table, res.rawToken);
                          } else {
                            showToast("error", res.error || "Failed to regenerate.");
                          }
                        }
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> New QR
                    </Button>
                  </div>

                  <button
                    title={table.is_active ? "Lock / Deactivate Table" : "Activate Table"}
                    onClick={async () => {
                      const res = await toggleTableStatus(table.id, !table.is_active);
                      if (res.success) showToast("success", res.message || "Updated status.");
                      else showToast("error", res.error || "Failed to update.");
                    }}
                    className={`p-1.5 rounded-asador border text-xs transition-colors ${
                      table.is_active
                        ? "border-asador-hops/50 text-[#5dd974] hover:bg-asador-hops/20"
                        : "border-asador-silver/30 text-asador-silver hover:bg-asador-surface"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* =====================================================================
          MODAL: ADD / EDIT TABLE
          ===================================================================== */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <h3 className="font-serif text-lg font-bold text-asador-parchment">
                {editingTable ? "Edit Table" : "Add Dining Table"}
              </h3>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const res = editingTable
                  ? await updateDiningTable(formData)
                  : await createDiningTable(formData);

                if (res.success) {
                  showToast("success", res.message || "Saved table.");
                  setIsTableModalOpen(false);
                  if (res.rawToken && !editingTable) {
                    const tempTable: FullTable = {
                      id: "temp",
                      table_number: String(formData.get("tableNumber")),
                      label: String(formData.get("label")),
                      zone: String(formData.get("zone")),
                      capacity: Number(formData.get("capacity")),
                      is_active: true,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    openQrModal(tempTable, res.rawToken);
                  }
                } else {
                  showToast("error", res.error || "Failed to save.");
                }
              }}
              className="p-5 sm:p-6 space-y-4 pb-safe"
            >
              {editingTable && <input type="hidden" name="id" value={editingTable.id} />}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Table Number</label>
                  <Input
                    name="tableNumber"
                    required
                    defaultValue={editingTable?.table_number || ""}
                    placeholder="e.g. T-04, BAR-03"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">Guest Capacity</label>
                  <Input
                    name="capacity"
                    type="number"
                    min="1"
                    required
                    defaultValue={editingTable?.capacity || 4}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Dining Zone</label>
                <Input
                  name="zone"
                  required
                  defaultValue={editingTable?.zone || "Main Dining"}
                  placeholder="e.g. Main Hearth Dining, Brew Deck, Courtyard"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">Table Label / Note</label>
                <Input
                  name="label"
                  defaultValue={editingTable?.label || ""}
                  placeholder="e.g. Window booth, High-top table"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs text-asador-parchment cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    value="true"
                    defaultChecked={editingTable ? editingTable.is_active : true}
                    className="rounded border-asador-border bg-asador-deep text-asador-ember"
                  />
                  <span>Table Active & Available for Seating</span>
                </label>
              </div>

              <div className="border-t border-asador-border pt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setIsTableModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default" className="min-h-11 h-11 px-5 text-xs">
                  {editingTable ? "Save Changes" : "Create Table"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VIEW & PRINT QR CODE
          ===================================================================== */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-[92vw] max-w-sm rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-asador-border px-5 py-3.5 bg-asador-deep">
              <div>
                <h3 className="font-serif text-base font-bold text-asador-parchment">
                  Table {activeQrModal.table.table_number} QR Code
                </h3>
                <span className="text-[11px] text-asador-copper font-medium">{activeQrModal.table.zone}</span>
              </div>
              <button
                onClick={() => setActiveQrModal(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex flex-col items-center space-y-4">
              {/* QR Code Graphic Container */}
              <div
                className="flex items-center justify-center p-3 sm:p-4 bg-white rounded-asador shadow-inner border border-asador-border [&>svg]:w-full [&>svg]:max-w-[240px] sm:[&>svg]:max-w-[260px] [&>svg]:h-auto mx-auto"
                dangerouslySetInnerHTML={{ __html: activeQrModal.svgContent }}
              />

              <div className="text-center space-y-1 w-full px-2">
                <span className="font-mono text-xs text-asador-silver block truncate max-w-full">
                  {activeQrModal.customerUrl}
                </span>
                <span className="text-[11px] text-asador-copper block">
                  Scan to open mobile customer menu
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 w-full pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 h-11 text-xs font-semibold px-2 flex items-center justify-center"
                  onClick={copyUrl}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-[#5dd974]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 h-11 text-xs font-semibold px-2 flex items-center justify-center"
                  onClick={downloadSvg}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> SVG
                </Button>

                <Button
                  size="sm"
                  variant="default"
                  className="min-h-11 h-11 text-xs font-semibold px-2 flex items-center justify-center"
                  onClick={printQrLabel}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print
                </Button>
              </div>

              {/* Open in new tab preview */}
              <div className="pt-1 w-full text-center">
                <a
                  href={activeQrModal.customerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 inline-flex items-center justify-center text-xs text-asador-silver hover:text-asador-ember py-2 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Customer View
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
