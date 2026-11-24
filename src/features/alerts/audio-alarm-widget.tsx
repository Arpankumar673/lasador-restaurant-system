"use client";

import * as React from "react";
import { useRealtimeAlerts } from "./alert-context";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Repeat, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioAlarmWidgetProps {
  className?: string;
  variant?: "default" | "compact";
}

export function AudioAlarmWidget({ className, variant = "default" }: AudioAlarmWidgetProps) {
  const {
    soundEnabled,
    repeatAlert,
    unacknowledgedCount,
    toggleSound,
    toggleRepeat,
    testAlarm,
  } = useRealtimeAlerts();

  return (
    <div className={cn("flex items-center space-x-1 sm:space-x-1.5", className)}>
      {/* Sound On / Muted Toggle Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleSound}
        className={cn(
          "min-h-11 min-w-11 sm:min-w-0 sm:h-8 px-2 text-xs transition-colors rounded-asador",
          soundEnabled
            ? "text-[#235C3B] bg-[#E7F2EC] hover:bg-[#D5EADF] border border-[#C2DEC9]"
            : "text-[#8C8175] bg-[#F3EDE2] hover:bg-[#E5DEC9] border border-[#DDD3C0]"
        )}
        title={soundEnabled ? "Audio Alarm: ON (Click to Mute)" : "Audio Alarm: MUTED (Click to Enable)"}
      >
        {soundEnabled ? (
          <Volume2 className="h-4 w-4 sm:mr-1 text-[#235C3B]" />
        ) : (
          <VolumeX className="h-4 w-4 sm:mr-1 text-[#8C8175]" />
        )}
        <span className="hidden md:inline font-medium">
          {soundEnabled ? "Alarm On" : "Muted"}
        </span>
      </Button>

      {/* Repeat Mode Toggle */}
      {variant !== "compact" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleRepeat}
          className={cn(
            "min-h-11 min-w-11 sm:min-w-0 sm:h-8 px-2 text-xs transition-colors rounded-asador hidden sm:inline-flex",
            repeatAlert && soundEnabled
              ? "text-[#9A7432] bg-[#F5EFE4] hover:bg-[#EED4AC] border border-[#DFD1B5]"
              : "text-[#8C8175] bg-[#F3EDE2] hover:bg-[#E5DEC9] border border-[#DDD3C0]"
          )}
          title={
            repeatAlert
              ? "Repeat Alarm: Repeating every 10s until acknowledged"
              : "Repeat Alarm: Off (Single chime per order)"
          }
        >
          <Repeat className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden lg:inline text-[11px] font-medium">
            {repeatAlert ? "Repeat (10s)" : "Single Chime"}
          </span>
        </Button>
      )}

      {/* Test Chime Trigger */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={testAlarm}
        className="min-h-11 min-w-11 sm:min-w-0 sm:h-8 px-2 text-xs text-[#5E554C] hover:text-[#1E1916] hover:bg-[#F3EDE2] border border-[#E5DEC9] rounded-asador"
        title="Test hospitality service chime"
      >
        <Bell className="h-3.5 w-3.5 sm:mr-1 text-[#B08943]" />
        <span className="hidden xl:inline text-[11px]">Test Bell</span>
      </Button>

      {/* Active Alerts Live Badge */}
      {unacknowledgedCount > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-[#FAF7F2] bg-[#5C1D24] rounded-full animate-pulse-calm shadow-sm"
          title={`${unacknowledgedCount} unacknowledged orders/enquiries`}
        >
          {unacknowledgedCount}
        </span>
      )}
    </div>
  );
}
