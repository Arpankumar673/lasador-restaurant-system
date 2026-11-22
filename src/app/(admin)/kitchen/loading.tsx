import { ChefHat } from "lucide-react";

export default function KitchenLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-asador-border/40">
        <div className="space-y-2">
          <div className="h-8 w-60 rounded-asador bg-asador-surface/80" />
          <div className="h-4 w-80 rounded-asador bg-asador-surface/40" />
        </div>
        <div className="flex items-center space-x-2 text-asador-flame">
          <ChefHat className="h-5 w-5 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-semibold">Live KDS Sync</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-asador-lg border border-asador-border bg-asador-card/70 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded bg-asador-surface/80" />
              <div className="h-5 w-16 rounded bg-asador-surface/60" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full rounded bg-asador-surface/50" />
              <div className="h-4 w-3/4 rounded bg-asador-surface/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
