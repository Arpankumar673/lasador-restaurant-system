"use client";

import * as React from "react";
import Link from "next/link";
import { useRealtimeAlerts, LiveAlert } from "./alert-context";
import { Button } from "@/components/ui/button";
import { Bell, Flame, Check, X, ExternalLink, AlertTriangle } from "lucide-react";

export function OrderAlertBanner() {
  const { alerts, acknowledgeAlert, acknowledgeAll } = useRealtimeAlerts();

  if (alerts.length === 0) return null;

  return (
    <aside
      aria-label="Live Operational Alerts"
      className="fixed top-4 right-3 sm:right-6 z-50 flex flex-col space-y-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {/* Alert Cards Container (Top 3 items) */}
      <div className="space-y-2.5 pointer-events-auto">
        {alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className="rounded-asador-lg border border-[#B08943]/50 bg-[#FFFDF9] p-3.5 sm:p-4 shadow-[0_12px_32px_-4px_rgba(30,25,22,0.18)] backdrop-blur-md animate-in slide-in-from-top-3 duration-300 transition-all text-[#1E1916]"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start space-x-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-asador flex items-center justify-center shrink-0 ${
                    alert.type === "urgent"
                      ? "bg-[#A33B3B]/15 text-[#A33B3B] border border-[#A33B3B]/30"
                      : "bg-[#B08943]/15 text-[#9A7432] border border-[#B08943]/30"
                  }`}
                >
                  {alert.type === "urgent" ? (
                    <AlertTriangle className="h-4 w-4 animate-bounce" />
                  ) : alert.type === "order" ? (
                    <Flame className="h-4 w-4 animate-pulse-calm" />
                  ) : (
                    <Bell className="h-4 w-4 animate-pulse-calm" />
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="font-serif text-sm font-bold tracking-tight text-[#1E1916]">
                      Table {alert.tableNumber}
                    </span>
                    {alert.zone && (
                      <span className="text-[10px] text-[#8C8175] uppercase tracking-wider font-semibold">
                        &bull; {alert.zone}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-[#5E554C] leading-snug">
                    {alert.summary}
                  </p>

                  {typeof alert.totalAmount === "number" && alert.totalAmount > 0 && (
                    <p className="text-xs font-bold text-[#5C1D24] font-mono">
                      ₹{alert.totalAmount.toFixed(2)}
                    </p>
                  )}

                  {alert.specialNotes && (
                    <p className="text-[11px] text-[#A33B3B] bg-[#FAF7F2] p-1.5 rounded border border-[#E5DEC9] mt-1 italic">
                      Note: &ldquo;{alert.specialNotes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => acknowledgeAlert(alert.id)}
                className="text-[#8C8175] hover:text-[#1E1916] p-1 rounded-asador transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2.5 mt-2 border-t border-[#E5DEC9]">
              <Link
                href={alert.type === "order" ? "/kitchen" : "/admin/operations"}
                className="inline-flex items-center text-xs font-semibold text-[#9A7432] hover:text-[#5C1D24] px-2.5 py-1 rounded hover:bg-[#F3EDE2] transition-colors"
                onClick={() => acknowledgeAlert(alert.id)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {alert.type === "order" ? "View in KDS" : "View Floor"}
              </Link>

              <Button
                size="sm"
                variant="default"
                className="h-7 px-3 bg-[#5C1D24] hover:bg-[#70242D] text-[#FAF7F2] text-xs font-semibold"
                onClick={() => acknowledgeAlert(alert.id)}
              >
                <Check className="h-3 w-3 mr-1 text-[#6EE7B7]" />
                Acknowledge
              </Button>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 3 && (
        <div className="text-right pointer-events-auto">
          <button
            type="button"
            onClick={acknowledgeAll}
            className="text-[11px] font-semibold text-[#8C8175] hover:text-[#1E1916] bg-[#FFFDF9]/90 border border-[#E5DEC9] px-2.5 py-1 rounded-asador shadow-sm backdrop-blur"
          >
            Acknowledge all ({alerts.length}) alerts
          </button>
        </div>
      )}
    </aside>
  );
}
