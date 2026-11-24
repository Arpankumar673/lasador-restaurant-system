import * as React from "react";
import { RealtimeAlertProvider } from "@/features/alerts/alert-context";
import { OrderAlertBanner } from "@/features/alerts/order-alert-banner";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeAlertProvider>
      {children}
      <OrderAlertBanner />
    </RealtimeAlertProvider>
  );
}
