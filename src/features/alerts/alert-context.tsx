"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { playHospitalityChime, testHospitalityChime } from "./audio-synth";

export interface LiveAlert {
  id: string;
  type: "order" | "enquiry" | "urgent";
  orderNumber?: string;
  tableNumber: string;
  zone?: string;
  summary: string;
  totalAmount?: number;
  specialNotes?: string | null;
  timestamp: string;
}

interface AlertContextValue {
  soundEnabled: boolean;
  repeatAlert: boolean;
  alerts: LiveAlert[];
  unacknowledgedCount: number;
  toggleSound: () => void;
  toggleRepeat: () => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  testAlarm: () => void;
}

const AlertContext = React.createContext<AlertContextValue | null>(null);

const STORAGE_KEY_SOUND = "asador_alarm_sound_enabled";
const STORAGE_KEY_REPEAT = "asador_alarm_repeat_mode";

export function RealtimeAlertProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);
  const [repeatAlert, setRepeatAlert] = React.useState<boolean>(true);
  const [alerts, setAlerts] = React.useState<LiveAlert[]>([]);

  // Track alerted order IDs to avoid duplicate alerts across polling/realtime
  const alertedIdsRef = React.useRef<Set<string>>(new Set());

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedSound = localStorage.getItem(STORAGE_KEY_SOUND);
      if (savedSound !== null) setSoundEnabled(savedSound === "true");

      const savedRepeat = localStorage.getItem(STORAGE_KEY_REPEAT);
      if (savedRepeat !== null) setRepeatAlert(savedRepeat === "true");
    } catch {
      // Ignore localStorage access issues
    }
  }, []);

  const toggleSound = React.useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SOUND, String(next));
      } catch {}
      if (next) {
        testHospitalityChime();
      }
      return next;
    });
  }, []);

  const toggleRepeat = React.useCallback(() => {
    setRepeatAlert((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_REPEAT, String(next));
      } catch {}
      return next;
    });
  }, []);

  const testAlarm = React.useCallback(() => {
    testHospitalityChime();
  }, []);

  const acknowledgeAlert = React.useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const acknowledgeAll = React.useCallback(() => {
    setAlerts([]);
  }, []);

  // Helper to add alert and trigger sound chime
  const triggerNewAlert = React.useCallback(
    (alert: LiveAlert) => {
      if (alertedIdsRef.current.has(alert.id)) return;
      alertedIdsRef.current.add(alert.id);

      setAlerts((prev) => [alert, ...prev.slice(0, 9)]);

      if (soundEnabled) {
        playHospitalityChime(alert.type);
      }
    },
    [soundEnabled]
  );

  // 1. Supabase Realtime Listener Setup
  React.useEffect(() => {
    const supabase = createClient();

    // Channel for orders
    const orderChannel = supabase
      .channel("asador-orders-live-alarm")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const newOrder = payload.new as any;
          if (!newOrder || !newOrder.id) return;

          // Fetch table number for context
          let tableNum = "Table";
          let zoneName = "Floor";
          try {
            if (newOrder.table_id) {
              const res: any = await supabase
                .from("dining_tables")
                .select("table_number, zone")
                .eq("id", newOrder.table_id)
                .maybeSingle();

              if (res.data) {
                tableNum = res.data.table_number || "Table";
                zoneName = res.data.zone || "Floor";
              }
            }
          } catch {}

          triggerNewAlert({
            id: newOrder.id,
            type: "order",
            orderNumber: newOrder.order_number || "NEW",
            tableNumber: tableNum,
            zone: zoneName,
            summary: `Order #${newOrder.order_number || "NEW"} received for ${tableNum}`,
            totalAmount: Number(newOrder.total_amount || 0),
            specialNotes: newOrder.special_notes,
            timestamp: newOrder.created_at || new Date().toISOString(),
          });
        }
      )
      .subscribe();

    // Channel for guest service requests
    const serviceChannel = supabase
      .channel("asador-service-live-alarm")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_requests" },
        async (payload) => {
          const req = payload.new as any;
          if (!req || !req.id) return;

          let tableNum = "Table";
          try {
            if (req.table_id) {
              const res: any = await supabase
                .from("dining_tables")
                .select("table_number")
                .eq("id", req.table_id)
                .maybeSingle();
              if (res.data) tableNum = res.data.table_number || "Table";
            }
          } catch {}

          triggerNewAlert({
            id: req.id,
            type: req.request_type === "urgent" ? "urgent" : "enquiry",
            tableNumber: tableNum,
            summary: `Table Call: ${req.request_type ? req.request_type.toUpperCase() : "WAITER"} requested`,
            specialNotes: req.notes,
            timestamp: req.created_at || new Date().toISOString(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(serviceChannel);
    };
  }, [triggerNewAlert]);

  // 2. Repeat Alarm interval: re-chime every 10 seconds if repeatAlert is enabled and unacknowledged alerts exist
  React.useEffect(() => {
    if (!repeatAlert || !soundEnabled || alerts.length === 0) return;

    const interval = setInterval(() => {
      playHospitalityChime(alerts[0]?.type || "order");
    }, 10000);

    return () => clearInterval(interval);
  }, [repeatAlert, soundEnabled, alerts]);

  return (
    <AlertContext.Provider
      value={{
        soundEnabled,
        repeatAlert,
        alerts,
        unacknowledgedCount: alerts.length,
        toggleSound,
        toggleRepeat,
        acknowledgeAlert,
        acknowledgeAll,
        testAlarm,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useRealtimeAlerts(): AlertContextValue {
  const ctx = React.useContext(AlertContext);
  if (!ctx) {
    // Return safe fallback for components outside provider
    return {
      soundEnabled: true,
      repeatAlert: true,
      alerts: [],
      unacknowledgedCount: 0,
      toggleSound: () => {},
      toggleRepeat: () => {},
      acknowledgeAlert: () => {},
      acknowledgeAll: () => {},
      testAlarm: () => {},
    };
  }
  return ctx;
}
