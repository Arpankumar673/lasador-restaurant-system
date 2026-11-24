"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { OrderStatus, ItemPrepStatus } from "@/types/database.types";
import { requestTableBill, fetchCustomerOrderStatus } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Beer,
  ChefHat,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Clock,
  Receipt,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface OrderTrackingProps {
  token: string;
  initialOrder: any;
}

export function CustomerOrderTrackingView({ token, initialOrder }: OrderTrackingProps) {
  const router = useRouter();
  const [order, setOrder] = React.useState(initialOrder);
  const [isRequestingBill, setIsRequestingBill] = React.useState(false);
  const [billMessage, setBillMessage] = React.useState<string | null>(null);

  // Poll for updates every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await fetchCustomerOrderStatus(initialOrder.id);
      if (updated) {
        setOrder(updated);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [initialOrder.id]);

  const steps: { status: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { status: "new", label: "Received", icon: Clock },
    { status: "accepted", label: "Confirmed", icon: CheckCircle2 },
    { status: "preparing", label: "Preparing", icon: Flame },
    { status: "ready", label: "Ready", icon: UtensilsCrossed },
    { status: "completed", label: "Served", icon: Sparkles },
  ];

  const getStepIndex = (status: OrderStatus) => {
    const idx = steps.findIndex((s) => s.status === status);
    return idx === -1 ? 0 : idx;
  };

  const currentStep = getStepIndex(order.status as OrderStatus);

  const handleRequestBill = async () => {
    setIsRequestingBill(true);
    const res = await requestTableBill(order.table_id || "", order.session_id || "");
    setIsRequestingBill(false);
    if (res.success) {
      setBillMessage(res.message || "Bill requested. Your server is bringing your receipt.");
    }
  };

  return (
    <div className="min-h-screen bg-asador-dark text-asador-parchment pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-asador-card/95 backdrop-blur-md border-b border-asador-border px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/t/${token}`)}
            className="flex items-center space-x-1.5 text-xs text-asador-silver hover:text-asador-parchment"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Menu</span>
          </button>

          <Badge variant="copper" className="text-xs font-mono font-bold">
            TABLE {order.table?.table_number || "T-01"}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order Status Banner */}
        <div className="rounded-asador-lg border border-asador-copper/40 bg-asador-card p-5 text-center space-y-3 shadow-lg">
          <span className="text-[10px] uppercase tracking-widest text-asador-copper font-mono font-bold block">
            {order.order_number}
          </span>
          <h2 className="font-serif text-2xl font-bold text-asador-parchment">
            {order.status === "completed"
              ? "All Dishes Served & Enjoyed!"
              : order.status === "ready"
              ? "Your Dishes are Plated & Ready!"
              : order.status === "preparing"
              ? "Crafting Over Wood-Fired Hearth..."
              : order.status === "accepted"
              ? "Order Confirmed by Chef"
              : "Order Received at Station"}
          </h2>
          <p className="text-xs text-asador-silver max-w-sm mx-auto">
            Live station status updates automatically from L&apos;Asador&apos;s kitchen & brew deck displays.
          </p>

          {/* Stepper Progress */}
          <div className="pt-4 flex items-center justify-between relative max-w-md mx-auto px-1 sm:px-2">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-asador-border -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-4 h-0.5 bg-asador-ember -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${(currentStep / (steps.length - 1)) * 88}%` }}
            />

            {steps.map((st, i) => {
              const isPassed = i <= currentStep;
              const isCurrent = i === currentStep;
              const Icon = st.icon;

              return (
                <div key={st.status} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border text-xs transition-all ${
                      isPassed
                        ? "bg-asador-ember border-asador-ember text-asador-parchment shadow-ember-glow"
                        : "bg-asador-deep border-asador-border text-asador-silver"
                    } ${isCurrent ? "ring-2 ring-asador-malt ring-offset-2 ring-offset-asador-dark" : ""}`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] mt-1.5 font-medium tracking-tight whitespace-nowrap ${
                      isPassed ? "text-asador-parchment font-bold" : "text-asador-silver/60"
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-Column Mobile Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="rounded-asador border border-asador-border bg-asador-card p-3 text-center">
            <span className="text-[10px] text-asador-silver uppercase tracking-wider block">Dining Table</span>
            <span className="font-bold text-xs sm:text-sm text-asador-parchment font-mono">
              {order.table?.table_number || "T-01"}
            </span>
          </div>
          <div className="rounded-asador border border-asador-border bg-asador-card p-3 text-center">
            <span className="text-[10px] text-asador-silver uppercase tracking-wider block">Time Placed</span>
            <span className="font-bold text-xs sm:text-sm text-asador-parchment font-mono">
              {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="rounded-asador border border-asador-border bg-asador-card p-3 text-center">
            <span className="text-[10px] text-asador-silver uppercase tracking-wider block">Total Items</span>
            <span className="font-bold text-xs sm:text-sm text-asador-parchment font-mono">
              {order.items?.length || 0}
            </span>
          </div>
          <div className="rounded-asador border border-asador-border bg-asador-card p-3 text-center">
            <span className="text-[10px] text-asador-silver uppercase tracking-wider block">Order Bill</span>
            <span className="font-bold text-xs sm:text-sm text-asador-ember font-serif">
              ₹{Number(order.total_amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bill Notification Message */}
        {billMessage && (
          <div className="rounded-asador border border-asador-hops/40 bg-asador-hops/15 p-3 text-xs text-asador-parchment flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0" />
            <span>{billMessage}</span>
          </div>
        )}

        {/* Item-by-Item Live Prep Breakdown */}
        <div className="rounded-asador-lg border border-asador-border bg-asador-card overflow-hidden">
          <div className="px-5 py-3 border-b border-asador-border bg-asador-deep flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold text-asador-parchment">
              Station Ticket Items ({order.items?.length || 0})
            </h3>
            <span className="text-[11px] text-asador-silver font-mono">
              Total: ₹{Number(order.total_amount).toFixed(2)}
            </span>
          </div>

          <div className="divide-y divide-asador-border/60">
            {order.items?.map((item: any) => {
              const prepStatus: ItemPrepStatus = item.prep_status || "pending";
              const isItemReady = prepStatus === "ready" || prepStatus === "served";
              const isItemPrep = prepStatus === "preparing";

              return (
                <div key={item.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-asador-parchment text-sm">
                        {item.quantity}x {item.product_name_snapshot}
                      </span>
                    </div>

                    {item.variant_name_snapshot && (
                      <span className="text-[11px] text-asador-copper font-medium block">
                        Portion: {item.variant_name_snapshot}
                      </span>
                    )}

                    {item.modifiers?.length > 0 && (
                      <span className="text-[11px] text-asador-silver block">
                        + {item.modifiers.map((m: any) => m.modifier_name_snapshot).join(", ")}
                      </span>
                    )}

                    {item.customerNotes && (
                      <span className="text-[11px] text-asador-silver italic block">
                        &quot;{item.customerNotes}&quot;
                      </span>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <Badge
                      variant={isItemReady ? "hops" : isItemPrep ? "copper" : "outline"}
                      className="text-[10px] font-mono capitalize"
                    >
                      {item.prep_status}
                    </Badge>
                    <span className="font-serif font-bold text-asador-ember block text-xs">
                      ₹{Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bill Summary & Bill Request Button */}
        <div className="rounded-asador-lg border border-asador-border bg-asador-card p-5 space-y-4">
          <div className="space-y-1.5 text-xs text-asador-silver">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="font-mono text-asador-parchment">₹{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Statutory Tax</span>
              <span className="font-mono text-asador-parchment">₹{Number(order.tax_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-asador-parchment pt-2 border-t border-asador-border">
              <span>Total Bill Amount</span>
              <span className="font-serif text-asador-ember">₹{Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              size="default"
              onClick={() => router.push(`/t/${token}`)}
              className="flex-1 min-h-12 text-xs font-semibold"
            >
              Order More Items
            </Button>

            <Button
              variant="default"
              size="default"
              disabled={isRequestingBill}
              onClick={handleRequestBill}
              className="flex-1 min-h-12 text-xs font-bold"
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              {isRequestingBill ? "Requesting..." : "Request Bill & Settle"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
