import { requirePermission } from "@/features/auth/server";
import { fetchAnalyticsData } from "@/features/analytics/actions";
import { AnalyticsView } from "@/features/analytics/components/analytics-view";

export default async function AdminAnalyticsPage() {
  await requirePermission("settings:view");
  const summary = await fetchAnalyticsData();

  return <AnalyticsView summary={summary} />;
}
