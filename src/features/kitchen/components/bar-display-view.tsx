"use client";

import * as React from "react";
import { ItemPrepStatus, ItemStation } from "@/types/database.types";
import { updateOrderItemStatus, fetchBarTickets } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioAlarmWidget } from "@/features/alerts/audio-alarm-widget";
import {
  Beer,
  Sparkles,
  Clock,
  Volume2,
  VolumeX,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface BarTicketItem {
  id: string;
  order_id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  quantity: number;
  station: ItemStation;
  prep_status: ItemPrepStatus;
  customer_notes: string | null;
  created_at: string;
  order: {
    id: string;
    order_number: string;
    status: string;
    special_notes: string | null;
    created_at: string;
    table?: {
      table_number: string;
      zone: string;
    };
  };
  modifiers: {
    id: string;
    modifier_name_snapshot: string;
  }[];
}

interface BarDisplayViewProps {
  initialItems: BarTicketItem[];
  canUpdate: boolean;
}

export function BarDisplayView({ initialItems, canUpdate }: BarDisplayViewProps) {
  const [items, setItems] = React.useState<BarTicketItem[]>(initialItems);
  const [stationFilter, setStationFilter] = React.useState<string>("all_bar");
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(false);
  const [prevCount, setPrevCount] = React.useState<number>(initialItems.length);

  // Play audio chime using Web Audio API on new incoming orders
  const playChime = React.useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, audioCtx.currentTime + 0.3); // B5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Audio autoplay restrictions
    }
  }, [soundEnabled]);

  // Polling fallback every 5 seconds for live bar tickets
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await fetchBarTickets(stationFilter);
      if (updated && updated.length > prevCount) {
        playChime();
      }
      setPrevCount(updated?.length || 0);
      setItems((updated as unknown) as BarTicketItem[]);
    }, 5000);

    return () => clearInterval(interval);
  }, [stationFilter, prevCount, playChime]);

  // Group items by order
  const ordersGrouped = React.useMemo(() => {
    const map = new Map<string, { order: BarTicketItem["order"]; items: BarTicketItem[] }>();

    for (const item of items) {
      if (!map.has(item.order_id)) {
        map.set(item.order_id, { order: item.order, items: [] });
      }
      map.get(item.order_id)!.items.push(item);
    }

    return Array.from(map.values());
  }, [items]);

  const handleStatusAdvance = async (itemId: string, currentStatus: ItemPrepStatus) => {
    let nextStatus: ItemPrepStatus = "preparing";
    if (currentStatus === "pending") nextStatus = "preparing";
    else if (currentStatus === "preparing") nextStatus = "ready";
    else if (currentStatus === "ready") nextStatus = "served";

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, prep_status: nextStatus } : i))
    );

    await updateOrderItemStatus(itemId, nextStatus);
  };

  const getElapsedMinutes = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    return Math.floor(diffMs / 60000);
  };

  return (
    <div className="min-h-screen bg-asador-bg text-asador-parchment p-4 sm:p-6 space-y-6">
      {/* Top Console Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-asador-border">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-asador bg-asador-malt text-asador-deep shadow-malt-glow font-bold">
            <Beer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-asador-parchment">
              Bar Display System (BDS)
            </h1>
            <p className="text-xs text-asador-silver">
              Craft Beer Taps & Cocktail Mixology Station Tickets
            </p>
          </div>
        </div>

        {/* Station Filters & Sound Toggle */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <Button
            variant={stationFilter === "all_bar" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 px-3 shrink-0 whitespace-nowrap"
            onClick={() => setStationFilter("all_bar")}
          >
            All Drinks ({items.length})
          </Button>

          <Button
            variant={stationFilter === "bar_taps" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 px-3 shrink-0 whitespace-nowrap"
            onClick={() => setStationFilter("bar_taps")}
          >
            <Beer className="h-3.5 w-3.5 mr-1 text-asador-malt" /> Beer Taps
          </Button>

          <Button
            variant={stationFilter === "bar_cocktails" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 px-3 shrink-0 whitespace-nowrap"
            onClick={() => setStationFilter("bar_cocktails")}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-asador-copper" /> Cocktails
          </Button>

          <div className="border-l border-asador-border pl-2 shrink-0">
            <AudioAlarmWidget />
          </div>
        </div>
      </div>

      {/* Active Orders Grid */}
      {ordersGrouped.length === 0 ? (
        <div className="text-center py-24 text-asador-silver">
          <Beer className="h-12 w-12 mx-auto mb-3 opacity-30 text-asador-malt" />
          <h2 className="font-serif text-lg font-bold text-asador-parchment">All Tap & Cocktail Lines Clear</h2>
          <p className="text-xs mt-1">Incoming microbrewery pours and craft cocktails will appear here immediately.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {ordersGrouped.map(({ order, items: orderItems }) => {
            const elapsed = getElapsedMinutes(order.created_at);
            const isUrgent = elapsed > 15;
            const isWarning = elapsed > 8 && !isUrgent;

            return (
              <div
                key={order.id}
                className={`rounded-asador-lg border bg-asador-card shadow-card-elevation flex flex-col justify-between overflow-hidden transition-all duration-300 ease-luxury-decel hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(92,29,36,0.12)] ${
                  isUrgent
                    ? "border-asador-crimsonBorder ring-1 ring-asador-crimsonBorder"
                    : isWarning
                    ? "border-asador-ochreBorder"
                    : "border-asador-border"
                }`}
              >
                {/* Ticket Header */}
                <div
                  className={`p-3.5 border-b flex items-center justify-between ${
                    isUrgent
                      ? "bg-asador-crimson border-asador-crimsonBorder text-asador-crimsonText"
                      : isWarning
                      ? "bg-asador-ochre border-asador-ochreBorder text-asador-ochreText"
                      : "bg-asador-deep border-asador-border text-asador-parchment"
                  }`}
                >
                  <div>
                    <span className="font-mono text-xl font-black block">
                      TABLE {order.table?.table_number || "BAR-01"}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">
                      {order.order_number}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono text-sm font-bold flex items-center justify-end ${
                        isUrgent ? "text-asador-flame" : isWarning ? "text-asador-malt" : "text-asador-silver"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {elapsed}m
                    </span>
                    <span className="text-[10px] opacity-75">{order.table?.zone || "Brew Deck"}</span>
                  </div>
                </div>

                {/* Special Instructions */}
                {order.special_notes && (
                  <div className="px-3.5 py-1.5 bg-asador-malt/10 border-b border-asador-malt/20 text-[11px] text-asador-malt flex items-center space-x-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="truncate">&quot;{order.special_notes}&quot;</span>
                  </div>
                )}

                {/* Ticket Line Items */}
                <div className="p-3.5 space-y-3 flex-1 divide-y divide-asador-border/50">
                  {orderItems.map((item) => {
                    const isTap = item.station === "bar_taps";
                    const isPending = item.prep_status === "pending";
                    const isPrep = item.prep_status === "preparing";
                    const isReady = item.prep_status === "ready";

                    return (
                      <div key={item.id} className="pt-2 first:pt-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-base text-asador-parchment font-mono">
                                {item.quantity}x
                              </span>
                              <span className="font-bold text-sm text-asador-parchment">
                                {item.product_name_snapshot}
                              </span>
                            </div>

                            {item.variant_name_snapshot && (
                              <span className="text-xs text-asador-malt font-medium block">
                                Pour: {item.variant_name_snapshot}
                              </span>
                            )}

                            {item.modifiers.length > 0 && (
                              <div className="text-[11px] text-asador-silver space-y-0.5">
                                {item.modifiers.map((m) => (
                                  <div key={m.id} className="flex items-center space-x-1">
                                    <span className="text-asador-copper">&bull;</span>
                                    <span>{m.modifier_name_snapshot}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {item.customer_notes && (
                              <p className="text-[11px] text-asador-copper italic">
                                Note: &quot;{item.customer_notes}&quot;
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center space-x-1">
                            {isTap ? (
                              <Beer className="h-3.5 w-3.5 text-asador-malt" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-asador-copper" />
                            )}
                          </div>
                        </div>

                        {/* Status Transition Action Button */}
                        {canUpdate && (
                          <div className="flex justify-end pt-1">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-11 h-11 text-xs font-bold w-full bg-asador-deep text-asador-parchment hover:bg-asador-ember hover:text-asador-ivory hover:border-asador-ember"
                                onClick={() => handleStatusAdvance(item.id, "pending")}
                              >
                                {isTap ? "Pour Draft" : "Mix Drink"}
                              </Button>
                            )}

                            {isPrep && (
                              <Button
                                size="sm"
                                variant="default"
                                className="min-h-11 h-11 text-xs font-bold w-full bg-asador-ember text-asador-ivory hover:bg-asador-flame shadow-ember-glow"
                                onClick={() => handleStatusAdvance(item.id, "preparing")}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Poured
                              </Button>
                            )}

                            {isReady && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="min-h-11 h-11 text-xs font-bold w-full border-asador-emeraldBorder text-asador-emeraldText bg-asador-emerald hover:bg-asador-emerald/80"
                                onClick={() => handleStatusAdvance(item.id, "ready")}
                              >
                                <Check className="h-4 w-4 mr-1.5" /> Handed to Server
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
