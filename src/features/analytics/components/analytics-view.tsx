"use client";

import * as React from "react";
import { AnalyticsSummary } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  UtensilsCrossed,
  Flame,
  Beer,
  CreditCard,
  QrCode,
  Layers,
  Sparkles,
} from "lucide-react";

interface AnalyticsViewProps {
  summary: AnalyticsSummary | null;
}

export function AnalyticsView({ summary }: AnalyticsViewProps) {
  if (!summary) {
    return (
      <div className="p-8 text-center text-asador-silver">
        <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <h3 className="font-serif text-lg font-bold text-asador-parchment">No Analytics Available</h3>
        <p className="text-xs mt-1">Analytics access is restricted to Owner and Admin roles.</p>
      </div>
    );
  }

  const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    cash: DollarSign,
    upi_qr: QrCode,
    card: CreditCard,
    pos_machine: Receipt,
  };

  const methodLabels: Record<string, string> = {
    cash: "Cash Currency",
    upi_qr: "UPI QR Payment",
    card: "Card Transaction",
    pos_machine: "POS Terminal",
  };

  const stationLabels: Record<string, string> = {
    kitchen_grill: "Wood-Fired Hearth",
    kitchen_fry: "Fry & Sauté",
    kitchen_pantry: "Cold Pantry & Salads",
    bar_taps: "Craft Beer Taps",
    bar_cocktails: "Smoked Mixology",
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
            Restaurant Sales & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-asador-silver mt-1">
            Ground-truth performance metrics aggregated directly from L&apos;Asador PostgreSQL records.
          </p>
        </div>

        <Badge variant="hops" className="text-xs w-fit">
          <TrendingUp className="h-3.5 w-3.5 mr-1" /> Realtime Metrics
        </Badge>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Gross Revenue
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-ember font-serif">
              ₹{summary.totalRevenue.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            From {summary.totalSettledBills} settled bills
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Avg Order Value
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-malt font-serif">
              ₹{summary.averageOrderValue.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            Average per guest ticket
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Total Order Volume
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-asador-parchment font-mono">
              {summary.totalOrdersCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            {summary.completedOrdersCount} served
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider text-asador-silver truncate">
              Settled Tables
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold text-[#5dd974] font-mono">
              {summary.totalSettledBills}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 text-[10px] sm:text-[11px] text-asador-silver">
            Closed dining sessions
          </CardContent>
        </Card>
      </div>

      {/* Grid: Payment Breakdown & Bestsellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="p-4 pb-3 border-b border-asador-border">
            <CardTitle className="text-base text-asador-parchment flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-asador-copper" />
              <span>Payment Tender Breakdown</span>
            </CardTitle>
            <CardDescription className="text-xs text-asador-silver">
              Collections distributed by customer payment method
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {summary.paymentMethodDistribution.length === 0 ? (
              <p className="text-xs text-asador-silver italic">No settled payments recorded yet.</p>
            ) : (
              summary.paymentMethodDistribution.map((pm) => {
                const Icon = methodIcons[pm.method] || Receipt;
                const percent =
                  summary.totalRevenue > 0
                    ? ((pm.amount / summary.totalRevenue) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div key={pm.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-asador-ember" />
                        <span className="font-semibold text-asador-parchment">
                          {methodLabels[pm.method] || pm.method}
                        </span>
                        <span className="text-asador-silver text-[11px]">({pm.count} bills)</span>
                      </div>
                      <span className="font-serif font-bold text-asador-parchment">
                        ₹{pm.amount.toFixed(2)} ({percent}%)
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-asador-deep overflow-hidden">
                      <div
                        className="h-full bg-asador-ember rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Bestselling Dishes & Brews */}
        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="p-4 pb-3 border-b border-asador-border">
            <CardTitle className="text-base text-asador-parchment flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-asador-malt" />
              <span>Bestselling Dishes & Drafts</span>
            </CardTitle>
            <CardDescription className="text-xs text-asador-silver">
              Highest-volume menu items ordered across table sessions
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            {summary.bestsellingProducts.length === 0 ? (
              <p className="text-xs text-asador-silver italic">No item orders recorded yet.</p>
            ) : (
              <div className="divide-y divide-asador-border/50">
                {summary.bestsellingProducts.map((p, idx) => (
                  <div key={p.name} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 text-center font-mono font-bold text-asador-copper">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-asador-parchment block">
                          {p.name.replace(/\[.*?\]/g, "").trim()}
                        </span>
                        <span className="text-[11px] text-asador-silver">
                          {p.quantity} portions ordered
                        </span>
                      </div>
                    </div>

                    <span className="font-serif font-bold text-asador-ember text-sm">
                      ₹{p.revenue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Station Volume Breakdown */}
      <Card className="border-asador-border bg-asador-card">
        <CardHeader className="p-4 pb-3 border-b border-asador-border">
          <CardTitle className="text-base text-asador-parchment flex items-center space-x-2">
            <Layers className="h-4 w-4 text-asador-ember" />
            <span>Preparation Station Workload</span>
          </CardTitle>
          <CardDescription className="text-xs text-asador-silver">
            Workload distribution across kitchen fire hearths and draft beer tap lines
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {summary.stationBreakdown.map((st) => (
              <div
                key={st.station}
                className="rounded-asador border border-asador-border bg-asador-deep p-3 text-center space-y-1"
              >
                <span className="text-[10px] uppercase font-mono tracking-wider text-asador-silver block truncate">
                  {stationLabels[st.station] || st.station}
                </span>
                <span className="font-serif text-xl font-bold text-asador-parchment">
                  {st.itemCount} Items
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
