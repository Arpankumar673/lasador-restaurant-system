"use server";

import { getCurrentStaff } from "@/features/auth/server";
import { hasPermission } from "@/features/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  averageOrderValue: number;
  totalSettledBills: number;
  paymentMethodDistribution: {
    method: string;
    amount: number;
    count: number;
  }[];
  bestsellingProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  stationBreakdown: {
    station: string;
    itemCount: number;
  }[];
}

/**
 * Computes authentic analytical metrics from database records.
 * Never invents mock numbers or fake metrics.
 */
export async function fetchAnalyticsData(): Promise<AnalyticsSummary | null> {
  const caller = await getCurrentStaff();
  // Viewing financial analytics requires settings:view or staff:manage (Owner, Admin)
  if (!caller || !hasPermission(caller.profile.role, "settings:view")) {
    return null;
  }

  const supabase = createAdminClient();

  // 1. Fetch completed payments
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, payment_method, status, created_at")
    .eq("status", "completed");

  const totalRevenue = (payments || []).reduce((acc, p) => acc + Number(p.amount), 0);

  // Group by payment method
  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const p of payments || []) {
    const existing = methodMap.get(p.payment_method) || { amount: 0, count: 0 };
    existing.amount += Number(p.amount);
    existing.count += 1;
    methodMap.set(p.payment_method, existing);
  }

  const paymentMethodDistribution = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    amount: Number(data.amount.toFixed(2)),
    count: data.count,
  }));

  // 2. Fetch orders summary
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_amount");

  const totalOrdersCount = (orders || []).length;
  const completedOrders = (orders || []).filter(
    (o) => o.status === "completed" || o.status === "ready"
  );
  const completedOrdersCount = completedOrders.length;

  const averageOrderValue =
    completedOrdersCount > 0
      ? Number((totalRevenue / completedOrdersCount).toFixed(2))
      : 0;

  // 3. Fetch bills summary
  const { count: settledBillsCount } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("status", "settled");

  // 4. Fetch line items for bestselling dishes & station volumes
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_name_snapshot, quantity, subtotal, station, prep_status")
    .neq("prep_status", "cancelled");

  const productAggMap = new Map<string, { quantity: number; revenue: number }>();
  const stationAggMap = new Map<string, number>();

  for (const item of orderItems || []) {
    // Product aggregation
    const pExisting = productAggMap.get(item.product_name_snapshot) || { quantity: 0, revenue: 0 };
    pExisting.quantity += item.quantity;
    pExisting.revenue += Number(item.subtotal);
    productAggMap.set(item.product_name_snapshot, pExisting);

    // Station aggregation
    const sExisting = stationAggMap.get(item.station) || 0;
    stationAggMap.set(item.station, sExisting + item.quantity);
  }

  const bestsellingProducts = Array.from(productAggMap.entries())
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: Number(data.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const stationBreakdown = Array.from(stationAggMap.entries()).map(([station, itemCount]) => ({
    station,
    itemCount,
  }));

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalOrdersCount,
    completedOrdersCount,
    averageOrderValue,
    totalSettledBills: settledBillsCount || 0,
    paymentMethodDistribution,
    bestsellingProducts,
    stationBreakdown,
  };
}
