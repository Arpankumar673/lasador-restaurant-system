import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "malt"
    | "hops"
    | "copper"
    | "outline"
    | "secondary"
    | "emerald"
    | "ochre"
    | "crimson";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    // Luxury Brand Burnished Copper Accent
    default: "bg-asador-ember/15 text-asador-ember border-asador-ember/40",
    // Occupied / Preparing / Active Warm Amber Ochre
    malt: "bg-asador-ochre text-asador-ochreText border-asador-ochreBorder",
    copper: "bg-asador-ochre text-asador-ochreText border-asador-ochreBorder",
    ochre: "bg-asador-ochre text-asador-ochreText border-asador-ochreBorder",
    // Available / Ready Deep Sage Emerald
    hops: "bg-asador-emerald text-asador-emeraldText border-asador-emeraldBorder",
    emerald: "bg-asador-emerald text-asador-emeraldText border-asador-emeraldBorder",
    // Billing / Urgent / Destructive Terracotta Crimson
    crimson: "bg-asador-crimson text-asador-crimsonText border-asador-crimsonBorder",
    // Neutral & Subdued
    outline: "border-asador-border text-asador-silver bg-asador-deep/40",
    secondary: "bg-asador-surface text-asador-parchment border-asador-borderMuted",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
