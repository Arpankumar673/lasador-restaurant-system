"use client";

import * as React from "react";
import { OrderStatus } from "@/types/database.types";
import { acceptOrder, cancelOrder } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Flame,
  ChefHat,
  Beer,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  Eye,
  X,
  XCircle,
  Receipt,
  Layers,
  Check,
} from "lucide-react";

export interface OperationsOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  tax_total: number;
  total_amount: number;
  special_notes: string | null;
  created_at: string;
  table?: {
    id: string;
    table_number: string;
    zone: string;
  };
  session_id: string;
  items: {
    id: string;
    product_name_snapshot: string;
    variant_name_snapshot: string | null;
    quantity: number;
    subtotal: number;
    station: string;
    prep_status: string;
    customer_notes: string | null;
  }[];
}

interface OperationsViewProps {
  initialOrders: OperationsOrder[];
  occupiedTablesCount: number;
  totalTablesCount: number;
  canManage: boolean;
}

export function OperationsView({
  initialOrders,
  occupiedTablesCount,
  totalTablesCount,
  canManage,
}: OperationsViewProps) {
  const [orders, setOrders] = React.useState<OperationsOrder[]>(initialOrders);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Inspect modal
  const [selectedOrder, setSelectedOrder] = React.useState<OperationsOrder | null>(null);

  // Cancellation modal
  const [cancelModalOrder, setCancelModalOrder] = React.useState<OperationsOrder | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");

  // Notifications
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.table?.table_number && o.table.table_number.toLowerCase().includes(q)) ||
        (o.table?.zone && o.table.zone.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Counts
  const pendingCount = orders.filter((o) => o.status === "new").length;
  const preparingCount = orders.filter((o) => o.status === "preparing" || o.status === "accepted").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  const handleAccept = async (orderId: string) => {
    const res = await acceptOrder(orderId);
    if (res.success) {
      showToast("success", res.message || "Order accepted.");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "accepted" as OrderStatus } : o))
      );
    } else {
      showToast("error", res.error || "Failed to accept order.");
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelModalOrder || !cancelReason.trim()) return;

    const res = await cancelOrder(cancelModalOrder.id, cancelReason);
    if (res.success) {
      showToast("success", res.message || "Order cancelled.");
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelModalOrder.id ? { ...o, status: "cancelled" as OrderStatus } : o))
      );
      setCancelModalOrder(null);
      setCancelReason("");
    } else {
      showToast("error", res.error || "Failed to cancel order.");
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New Received</Badge>;
      case "accepted":
        return <Badge variant="copper">Confirmed</Badge>;
      case "preparing":
        return <Badge variant="malt">Preparing</Badge>;
      case "ready":
        return <Badge variant="hops">Ready to Serve</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="border-asador-flame text-asador-flame">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Floor Manager Operations
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Real-time floor occupancy, incoming QR guest tickets, food and beverage readiness.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="copper" className="text-xs w-fit">
            <Users className="h-3.5 w-3.5 mr-1" />
            {occupiedTablesCount} / {totalTablesCount} Tables Occupied
          </Badge>
        </div>
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
            <CheckCircle2 className="h-4 w-4 text-asador-emeraldText shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-asador-border bg-asador-card transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:border-asador-copper/50 hover:shadow-[0_12px_28px_-12px_rgba(92,29,36,0.12)]">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Needs Confirmation
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-ember font-mono">
              {pendingCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            Incoming QR guest orders
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:border-asador-copper/50 hover:shadow-[0_12px_28px_-12px_rgba(92,29,36,0.12)]">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              At Fire & Taps
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-malt font-mono">
              {preparingCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            Actively cooking or pouring
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:border-asador-copper/50 hover:shadow-[0_12px_28px_-12px_rgba(92,29,36,0.12)]">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Plated & Ready
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-emeraldText font-mono">
              {readyCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            Waiting for delivery
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:border-asador-copper/50 hover:shadow-[0_12px_28px_-12px_rgba(92,29,36,0.12)]">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Active Floor Tables
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-parchment font-mono">
              {occupiedTablesCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            Seated dining sessions
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-asador-border bg-asador-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-asador-silver" />
              <Input
                placeholder="Search by order #, table number or zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-asador-deep border-asador-border text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <span className="text-xs text-asador-silver font-medium mr-1 flex items-center shrink-0">
                <Filter className="h-3 w-3 mr-1" /> Status:
              </span>
              {(["all", "new", "accepted", "preparing", "ready", "completed", "cancelled"] as const).map(
                (st) => (
                  <Button
                    key={st}
                    variant={statusFilter === st ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8 px-2.5 capitalize shrink-0 whitespace-nowrap"
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders View (Dual-Mode: Mobile Cards + Desktop Table) */}
      <Card className="border-asador-border bg-asador-card overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-asador-silver">
            <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-asador-parchment">No orders found</p>
            <p className="text-xs mt-1">Orders placed via table QR tokens will appear here.</p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Order Cards */}
            <div className="md:hidden divide-y divide-asador-border">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-asador-parchment block">
                        {order.order_number}
                      </span>
                      <span className="text-[11px] text-asador-silver">
                        TABLE {order.table?.table_number || "T-01"} &bull; {order.table?.zone || "Dining"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {getStatusBadge(order.status)}
                      <span className="font-mono text-[10px] text-asador-silver">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-asador-silver">
                    <span className="text-asador-copper text-[11px] block line-clamp-1">
                      {order.items?.map((i) => `${i.quantity}x ${i.product_name_snapshot}`).join(", ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-asador-border/40">
                    <span className="font-serif font-bold text-asador-ember text-sm">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11 h-11 px-3 text-xs text-asador-parchment"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>

                      {canManage && order.status === "new" && (
                        <Button
                          variant="default"
                          size="sm"
                          className="min-h-11 h-11 px-3 text-xs font-semibold"
                          onClick={() => handleAccept(order.id)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Accept
                        </Button>
                      )}

                      {canManage && order.status !== "cancelled" && order.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 min-w-11 h-11 w-11 p-0 text-xs text-asador-flame hover:text-asador-flame"
                          onClick={() => setCancelModalOrder(order)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-asador-deep border-b border-asador-border text-xs uppercase tracking-wider text-asador-silver font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-asador-border">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-asador-surface/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-asador-parchment">
                        {order.order_number}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-bold text-asador-parchment block">
                          TABLE {order.table?.table_number || "T-01"}
                        </span>
                        <span className="text-[11px] text-asador-silver block truncate max-w-[120px]">
                          {order.table?.zone || "Dining"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-asador-silver">
                        <span>{order.items?.length || 0} items</span>
                        <span className="text-[11px] text-asador-copper block truncate max-w-[180px]">
                          {order.items?.map((i) => i.product_name_snapshot).join(", ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-serif font-bold text-asador-ember text-xs">
                        ₹{Number(order.total_amount).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {getStatusBadge(order.status)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-asador-silver whitespace-nowrap">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-asador-parchment"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>

                        {canManage && order.status === "new" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleAccept(order.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Accept
                          </Button>
                        )}

                        {canManage && order.status !== "cancelled" && order.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-asador-flame hover:text-asador-flame"
                            onClick={() => setCancelModalOrder(order)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* =====================================================================
          MODAL: INSPECT ORDER DETAILS
          ===================================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl pb-safe">
            <div className="flex items-center justify-between border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment">
                  Order {selectedOrder.order_number}
                </h3>
                <span className="text-xs text-asador-copper font-medium">
                  TABLE {selectedOrder.table?.table_number} &bull; {selectedOrder.table?.zone}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-asador text-asador-silver hover:text-asador-parchment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
              {selectedOrder.special_notes && (
                <div className="p-3 rounded-asador bg-asador-deep border border-asador-border text-xs text-asador-malt">
                  Special Notes: &quot;{selectedOrder.special_notes}&quot;
                </div>
              )}

              <div className="divide-y divide-asador-border/50">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-bold text-asador-parchment">
                        {item.quantity}x {item.product_name_snapshot}
                      </span>
                      {item.variant_name_snapshot && (
                        <span className="text-[11px] text-asador-copper block">
                          Portion: {item.variant_name_snapshot}
                        </span>
                      )}
                      {item.customer_notes && (
                        <span className="text-[11px] text-asador-silver italic block">
                          &quot;{item.customer_notes}&quot;
                        </span>
                      )}
                      <span className="text-[10px] text-asador-silver uppercase tracking-wider block mt-0.5">
                        Station: {item.station} &bull; Status: {item.prep_status}
                      </span>
                    </div>

                    <span className="font-serif font-bold text-asador-ember">
                      ₹{Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-asador-border space-y-1 text-xs text-asador-silver">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-asador-parchment">₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (GST 5%)</span>
                  <span className="font-mono text-asador-parchment">₹{Number(selectedOrder.tax_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-asador-parchment pt-1.5 border-t border-asador-border">
                  <span>Total</span>
                  <span className="font-serif text-asador-ember">₹{Number(selectedOrder.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-asador-border px-5 sm:px-6 py-3.5 bg-asador-deep flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 h-11 px-5 text-xs"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CANCEL ORDER WITH MANDATORY REASON
          ===================================================================== */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-asador border border-asador-border bg-asador-card shadow-2xl pb-safe">
            <div className="border-b border-asador-border px-5 sm:px-6 py-4 bg-asador-deep">
              <h3 className="font-serif text-lg font-bold text-asador-flame flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Cancel Order {cancelModalOrder.order_number}</span>
              </h3>
              <p className="text-xs text-asador-silver mt-1">
                Cancelling will halt prep across kitchen/bar and notify the customer live view.
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs uppercase font-semibold text-asador-silver">
                  Mandatory Cancellation Reason
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Guest requested cancellation, 86 cut ran out of stock, accidental duplicate..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="flex w-full rounded-asador border border-asador-border bg-asador-deep px-3 py-2 text-xs text-asador-parchment focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-asador-ember"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 h-11 px-4 text-xs"
                  onClick={() => setCancelModalOrder(null)}
                >
                  Back
                </Button>
                <Button
                  variant="flame"
                  size="sm"
                  className="min-h-11 h-11 px-5 text-xs font-semibold"
                  disabled={cancelReason.trim().length < 3}
                  onClick={handleCancelSubmit}
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
