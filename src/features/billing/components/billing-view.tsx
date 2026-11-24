"use client";

import * as React from "react";
import { BillStatus, PaymentMethod } from "@/types/database.types";
import { recordBillPayment, generateBillForTable } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  Plus,
  Eye,
  X,
  Clock,
  Check,
} from "lucide-react";

export interface FullBill {
  id: string;
  bill_number: string;
  session_id: string;
  table_id: string;
  status: BillStatus;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  service_charge: number;
  discount_amount: number;
  final_total: number;
  amount_paid?: number;
  balance_remaining?: number;
  requested_at: string | null;
  settled_at: string | null;
  created_at: string;
  table?: {
    table_number: string;
    zone: string;
  };
  payments: {
    id: string;
    payment_method: string;
    amount: number;
    transaction_reference: string | null;
    created_at: string;
  }[];
}

interface BillingViewProps {
  initialBills: FullBill[];
  activeSessions: {
    id: string;
    table_id: string;
    table_number: string;
    zone: string;
  }[];
  canSettle: boolean;
}

export function BillingView({
  initialBills,
  activeSessions,
  canSettle,
}: BillingViewProps) {
  const [bills, setBills] = React.useState<FullBill[]>(initialBills);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modals
  const [settleModalBill, setSettleModalBill] = React.useState<FullBill | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [receiptModalBill, setReceiptModalBill] = React.useState<FullBill | null>(null);

  // Settlement Form State
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [transactionRef, setTransactionRef] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Notifications
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredBills = React.useMemo(() => {
    return bills.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.bill_number.toLowerCase().includes(q) ||
        (b.table?.table_number && b.table.table_number.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, searchQuery, statusFilter]);

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalBill || isSubmitting) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("billId", settleModalBill.id);
    formData.set("paymentMethod", paymentMethod);
    formData.set("amount", String(settleModalBill.final_total));
    if (transactionRef) formData.set("transactionRef", transactionRef);

    const res = await recordBillPayment(formData);
    setIsSubmitting(false);

    if (res.success) {
      showToast("success", res.message || "Bill settled.");
      setBills((prev) =>
        prev.map((b) => (b.id === settleModalBill.id ? { ...b, status: "settled" as BillStatus } : b))
      );
      setSettleModalBill(null);
    } else {
      showToast("error", res.error || "Failed to settle bill.");
    }
  };

  const printReceipt = (bill: FullBill) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${bill.bill_number}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 300px;
              margin: 0 auto;
              padding: 20px 10px;
              color: #000;
              font-size: 12px;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex-between { display: flex; justify-content: space-between; margin: 3px 0; }
            .brand { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
            .meta { font-size: 10px; color: #333; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="brand">L'ASADOR – GRILL & BREW</div>
            <div class="meta">Sector 82, JLPL Industrial Area, Mohali</div>
            <div class="meta">GSTIN: 03AAAAA0000A1Z5 | FSSAI: 10020000000000</div>
          </div>
          <div class="divider"></div>
          <div class="flex-between">
            <span>Bill: ${bill.bill_number}</span>
            <span>Table: ${bill.table?.table_number || "T-01"}</span>
          </div>
          <div class="flex-between meta">
            <span>Date: ${new Date(bill.created_at).toLocaleDateString("en-IN")}</span>
            <span>Time: ${new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div class="divider"></div>
          <div class="flex-between">
            <span>Food & Beverage Items</span>
            <span class="right">₹${Number(bill.subtotal).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="flex-between meta">
            <span>Subtotal</span>
            <span>₹${Number(bill.subtotal).toFixed(2)}</span>
          </div>
          <div class="flex-between meta">
            <span>CGST (2.5%)</span>
            <span>₹${Number(bill.cgst_amount).toFixed(2)}</span>
          </div>
          <div class="flex-between meta">
            <span>SGST (2.5%)</span>
            <span>₹${Number(bill.sgst_amount).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: 14px;">
            <span>GRAND TOTAL</span>
            <span>₹${Number(bill.final_total).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="center meta" style="margin-top: 15px;">
            Thank you for dining at L'Asador!<br/>
            Wood-Fired Grill & Craft Microbrewery
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Billing & Settlement Console
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Generate dining receipts, record Cash/UPI/Card payments, and settle table accounts.
          </p>
        </div>

        {canSettle && (
          <Button
            size="sm"
            variant="default"
            className="min-h-11 sm:h-9 text-xs font-semibold px-4 w-full sm:w-auto"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Generate Table Bill
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
                placeholder="Search bill number or table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-asador-deep border-asador-border text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {(["all", "requested", "open", "settled"] as const).map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8 px-3 capitalize shrink-0 whitespace-nowrap"
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills View (Dual-Mode: Mobile Cards + Desktop Table) */}
      <Card className="border-asador-border bg-asador-card overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="py-12 text-center text-asador-silver">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-asador-parchment">No bills found</p>
            <p className="text-xs mt-1">Settled and requested bills will appear here.</p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Bill Cards */}
            <div className="md:hidden divide-y divide-asador-border">
              {filteredBills.map((bill) => {
                const isSettled = bill.status === "settled";
                const isRequested = bill.status === "requested";

                return (
                  <div key={bill.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-asador-parchment block">
                          {bill.bill_number}
                        </span>
                        <span className="text-[11px] text-asador-silver font-bold">
                          TABLE {bill.table?.table_number || "T-01"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Badge
                          variant={isSettled ? "hops" : isRequested ? "malt" : "copper"}
                          className="text-[10px] capitalize font-mono"
                        >
                          {bill.status}
                        </Badge>
                        <span className="font-mono text-[10px] text-asador-silver">
                          {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-1 border-y border-asador-border/40">
                      <div>
                        <span className="text-asador-silver text-[10px] block">Subtotal</span>
                        <span className="font-mono text-asador-parchment">₹{Number(bill.subtotal).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-asador-silver text-[10px] block">GST (5%)</span>
                        <span className="font-mono text-asador-parchment">
                          ₹{(Number(bill.cgst_amount) + Number(bill.sgst_amount)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-asador-silver block uppercase">Final Total</span>
                        <span className="font-serif font-bold text-asador-ember text-base">
                          ₹{Number(bill.final_total).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 h-11 px-3 text-xs text-asador-parchment"
                          onClick={() => printReceipt(bill)}
                        >
                          <Printer className="h-4 w-4 mr-1" /> Print
                        </Button>

                        {canSettle && !isSettled && (
                          <Button
                            variant="default"
                            size="sm"
                            className="min-h-11 h-11 px-3.5 text-xs font-semibold"
                            onClick={() => setSettleModalBill(bill)}
                          >
                            <CreditCard className="h-4 w-4 mr-1.5" /> Settle
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-asador-deep border-b border-asador-border text-xs uppercase tracking-wider text-asador-silver font-semibold">
                  <tr>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Subtotal</th>
                    <th className="py-3 px-4">GST (5%)</th>
                    <th className="py-3 px-4">Final Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-asador-border">
                  {filteredBills.map((bill) => {
                    const isSettled = bill.status === "settled";
                    const isRequested = bill.status === "requested";

                    return (
                      <tr key={bill.id} className="hover:bg-asador-surface/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-asador-parchment">
                          {bill.bill_number}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-bold text-asador-parchment">
                          TABLE {bill.table?.table_number || "T-01"}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-asador-silver">
                          ₹{Number(bill.subtotal).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-asador-silver">
                          ₹{(Number(bill.cgst_amount) + Number(bill.sgst_amount)).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-serif font-bold text-asador-ember text-sm">
                          ₹{Number(bill.final_total).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <Badge
                            variant={isSettled ? "hops" : isRequested ? "malt" : "copper"}
                            className="text-[10px] capitalize font-mono"
                          >
                            {bill.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-asador-silver whitespace-nowrap">
                          {new Date(bill.created_at).toLocaleDateString("en-IN")}{" "}
                          {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-asador-parchment"
                            onClick={() => printReceipt(bill)}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" /> Print
                          </Button>

                          {canSettle && !isSettled && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSettleModalBill(bill)}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Settle
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* =====================================================================
          MODAL: RECORD PAYMENT & SETTLE BILL
          ===================================================================== */}
      {settleModalBill && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Settle Bill {settleModalBill.bill_number}
                </h3>
                <span className="text-xs text-asador-copper font-medium">
                  TABLE {settleModalBill.table?.table_number}
                </span>
              </div>
              <button
                onClick={() => setSettleModalBill(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 rounded-asador bg-asador-deep border border-asador-border text-center space-y-1">
                <span className="text-xs text-asador-silver uppercase tracking-wider block font-semibold">
                  Amount Due for Settlement
                </span>
                <span className="font-serif text-3xl font-bold text-asador-ember">
                  ₹{Number(settleModalBill.final_total).toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-semibold text-asador-silver block">
                  Select Payment Tender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "cash", label: "Cash Currency", icon: DollarSign },
                      { id: "upi_qr", label: "UPI QR Code", icon: QrCode },
                      { id: "card", label: "Credit/Debit Card", icon: CreditCard },
                      { id: "pos_machine", label: "POS Terminal", icon: Receipt },
                    ] as const
                  ).map((m) => {
                    const isSelected = paymentMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`min-h-11 p-3 rounded-asador border text-left text-xs transition-all flex items-center space-x-2 ${
                          isSelected
                            ? "border-asador-ember bg-asador-ember/15 text-asador-parchment font-bold"
                            : "border-asador-border bg-asador-deep text-asador-silver hover:text-asador-parchment"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-asador-ember shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(paymentMethod === "upi_qr" || paymentMethod === "card" || paymentMethod === "pos_machine") && (
                <div className="space-y-1">
                  <label className="text-xs uppercase font-semibold text-asador-silver">
                    Transaction / Auth Reference (Optional)
                  </label>
                  <Input
                    placeholder="e.g. UTR # or Last 4 digits"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="text-xs bg-asador-deep border-asador-border h-9"
                  />
                </div>
              )}

              <div className="border-t border-asador-border pt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setSettleModalBill(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="min-h-11 h-11 px-5 text-xs font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Settling..." : "Confirm Payment & Settle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: GENERATE TABLE BILL
          ===================================================================== */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-sm max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 py-3.5 bg-asador-deep">
              <h3 className="font-serif text-base font-bold text-asador-parchment">
                Generate Table Bill
              </h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-asador-silver leading-relaxed">
                Choose an active table dining session to consolidate all orders into an official bill:
              </p>

              {activeSessions.length === 0 ? (
                <p className="text-xs text-asador-silver italic">No active dining sessions found.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activeSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-asador border border-asador-border bg-asador-deep flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-asador-parchment">TABLE {s.table_number}</span>
                        <span className="text-[11px] text-asador-silver block">{s.zone}</span>
                      </div>

                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs min-h-9 h-9 px-3.5 font-semibold"
                        onClick={async () => {
                          const res = await generateBillForTable(s.table_id, s.id);
                          if (res.success) {
                            showToast("success", res.message || "Generated bill.");
                            setIsGenerateModalOpen(false);
                          } else {
                            showToast("error", res.error || "Failed to generate bill.");
                          }
                        }}
                      >
                        Generate
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-asador-border pt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-5 text-xs"
                  onClick={() => setIsGenerateModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
