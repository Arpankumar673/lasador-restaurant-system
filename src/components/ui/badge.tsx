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
    | "crimson"
    | "brass";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    // Heritage Burgundy Accent
    default: "bg-asador-ember/10 text-asador-ember border-asador-ember/30",
    // Occupied / Preparing / Active Warm Honey Amber
    malt: "bg-asador-ochre text-asador-ochreText border-asador-ochreBorder",
    copper: "bg-asador-ochre text-asador-ochreText border-asador-ochreBorder",
    ochre: "bg-asador-ochre text-asador-ochreText border-asador-ochreBorder",
    // Available / Ready Soft Botanical Sage
    hops: "bg-asador-emerald text-asador-emeraldText border-asador-emeraldBorder",
    emerald: "bg-asador-emerald text-asador-emeraldText border-asador-emeraldBorder",
    // Billing / Urgent / Destructive Muted Rose Burgundy
    crimson: "bg-asador-crimson text-asador-crimsonText border-asador-crimsonBorder",
    // Antique Brass Luxury Role Badge
    brass: "bg-[#F5EFE4] text-[#9A7432] border-[#DFD1B5]",
    // Neutral & Subdued
    outline: "border-asador-sandBorder text-asador-silver bg-asador-deep/60",
    secondary: "bg-asador-deep text-asador-parchment border-asador-border",
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
