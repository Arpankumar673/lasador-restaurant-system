import { Flame } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 bg-asador-bg text-asador-parchment">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-asador-ember/20 animate-ping" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-asador-ember to-asador-flame shadow-ember-glow">
          <Flame className="h-7 w-7 text-asador-parchment animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="font-serif text-lg font-semibold tracking-wide text-asador-parchment">
          L&apos;Asador
        </p>
        <p className="text-xs text-asador-silver tracking-widest uppercase">
          Tending the fire...
        </p>
      </div>
    </div>
  );
}
