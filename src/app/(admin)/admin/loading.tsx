import { Flame } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-asador-border/40">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-asador bg-asador-surface/80" />
          <div className="h-4 w-96 rounded-asador bg-asador-surface/40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-asador bg-asador-surface/60" />
          <div className="h-9 w-32 rounded-asador bg-asador-ember/40" />
        </div>
      </div>

      {/* Stats / Metric Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-asador-lg border border-asador-border bg-asador-card/80 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-asador-surface/60" />
              <div className="h-6 w-6 rounded-full bg-asador-surface/40" />
            </div>
            <div className="h-7 w-24 rounded bg-asador-surface/80" />
            <div className="h-3 w-36 rounded bg-asador-surface/30" />
          </div>
        ))}
      </div>

      {/* Main Content Area Placeholder */}
      <div className="rounded-asador-lg border border-asador-border bg-asador-card/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 rounded bg-asador-surface/70" />
          <div className="flex items-center space-x-2">
            <Flame className="h-4 w-4 text-asador-ember animate-pulse" />
            <span className="text-xs text-asador-ash tracking-wide">Syncing station...</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-4 rounded-asador bg-asador-surface/30 border border-asador-border/20"
            >
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-asador bg-asador-surface/60" />
                <div className="space-y-1.5">
                  <div className="h-4 w-48 rounded bg-asador-surface/70" />
                  <div className="h-3 w-32 rounded bg-asador-surface/40" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-6 w-16 rounded bg-asador-surface/50" />
                <div className="h-6 w-20 rounded bg-asador-surface/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
