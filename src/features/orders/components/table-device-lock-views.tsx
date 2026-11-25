"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Lock, RefreshCw, Bell, AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableBrowsingHoldViewProps {
  table: {
    id: string;
    table_number: string;
    zone: string;
    label?: string | null;
  };
  holdExpiresAt: string | null;
}

/**
 * Rendered when a customer scans a table QR code while another guest's device
 * is currently in an active browsing hold countdown.
 */
export function TableBrowsingHoldView({
  table,
  holdExpiresAt,
}: TableBrowsingHoldViewProps) {
  const router = useRouter();
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(() => {
    if (!holdExpiresAt) return 0;
    const diff = Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (!holdExpiresAt) return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsRemaining(remaining);

      // When countdown reaches 0, auto-refresh page to allow this visitor to claim the table
      if (remaining === 0) {
        clearInterval(interval);
        setTimeout(() => {
          router.refresh();
        }, 1200);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt, router]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const isExpired = secondsRemaining <= 0;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 selection:bg-[#5C1D24] selection:text-[#FAF7F2]">
      <div className="max-w-md w-full rounded-2xl border border-[#E5DEC9] bg-[#FFFDF9] p-6 sm:p-8 text-center space-y-5 shadow-xl">
        {/* Animated Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-[#F5EFE4] border border-[#DFD1B5] text-[#9A7432] mx-auto flex items-center justify-center shadow-inner">
          <Clock className="h-8 w-8 animate-pulse text-[#9A7432]" />
        </div>

        {/* Heading & Table Identity */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#9A7432] block">
            Table {table.table_number} • {table.zone}
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1E1916]">
            {isExpired ? "Hold Expired" : "Table Currently Being Browsed"}
          </h2>
        </div>

        {/* Live Countdown Display */}
        <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#5E554C] block">
            {isExpired ? "Status" : "Hold Time Remaining"}
          </span>
          <div className="font-mono text-3xl font-bold tracking-tight text-[#5C1D24]">
            {isExpired ? "00:00" : formatCountdown(secondsRemaining)}
          </div>
          <p className="text-[11px] text-[#5E554C]">
            {isExpired
              ? "The previous browsing hold has expired. Tap below to claim this table."
              : "If no order is submitted within this countdown, the table will be freed for you."}
          </p>
        </div>

        {/* Detailed Explanation */}
        <p className="text-xs text-[#5E554C] leading-relaxed">
          Another guest at Table <strong>{table.table_number}</strong> scanned the QR code and is holding the table to place their initial order.
        </p>

        {/* Action Controls */}
        <div className="pt-2 space-y-2.5">
          <Button
            type="button"
            size="lg"
            variant="default"
            disabled={isRefreshing}
            className="w-full min-h-12 bg-[#5C1D24] hover:bg-[#70242D] text-[#FAF7F2] font-semibold text-xs tracking-wider uppercase shadow-md"
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isExpired ? "Claim Table & Open Menu" : "Check Table Availability"}
          </Button>

          <p className="text-[11px] text-[#A89F91]">
            Are you dining together? You can share the menu on the other phone, or request your server to assist you.
          </p>
        </div>
      </div>
    </div>
  );
}

interface TableSessionLockedViewProps {
  table: {
    id: string;
    table_number: string;
    zone: string;
    label?: string | null;
  };
}

/**
 * Rendered when a customer scans a table QR code while an active order is already
 * locked to another guest's device.
 */
export function TableSessionLockedView({
  table,
}: TableSessionLockedViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 selection:bg-[#5C1D24] selection:text-[#FAF7F2]">
      <div className="max-w-md w-full rounded-2xl border border-[#E5DEC9] bg-[#FFFDF9] p-6 sm:p-8 text-center space-y-5 shadow-xl">
        {/* Security Shield Lock Icon */}
        <div className="w-16 h-16 rounded-full bg-[#5C1D24]/10 border border-[#5C1D24]/30 text-[#70242D] mx-auto flex items-center justify-center shadow-inner">
          <Lock className="h-8 w-8 text-[#5C1D24]" />
        </div>

        {/* Heading & Table Identity */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#9A7432] block">
            Table {table.table_number} • {table.zone}
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1E1916]">
            Table Session Locked
          </h2>
        </div>

        {/* Lock Information Banner */}
        <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-left space-y-2">
          <div className="flex items-center space-x-2 text-[#5C1D24]">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">Active Order In Progress</span>
          </div>
          <p className="text-xs text-[#5E554C] leading-relaxed">
            An active order has already been placed at Table <strong>{table.table_number}</strong>. To guarantee accurate bill splitting and prevent accidental duplicate orders, ordering is locked to the original device.
          </p>
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#5E554C] leading-relaxed">
          If you wish to order additional items, please add them from the phone that placed the first order, or let our staff know.
        </p>

        {/* Actions */}
        <div className="pt-2 space-y-2.5">
          <Button
            type="button"
            size="lg"
            variant="default"
            disabled={isRefreshing}
            className="w-full min-h-12 bg-[#5C1D24] hover:bg-[#70242D] text-[#FAF7F2] font-semibold text-xs tracking-wider uppercase shadow-md"
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Table Status
          </Button>

          <div className="p-3 rounded-lg bg-[#F5EFE4] border border-[#DFD1B5] text-[11px] text-[#9A7432] leading-relaxed">
            Need to change devices or has your phone battery died? Ask your server to release the device lock from the staff terminal.
          </div>
        </div>
      </div>
    </div>
  );
}
