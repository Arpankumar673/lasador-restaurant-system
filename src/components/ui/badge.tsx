import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "malt" | "hops" | "copper" | "outline" | "secondary";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-asador-ember/15 text-asador-ember border-asador-ember/40",
    malt: "bg-asador-malt/15 text-asador-malt border-asador-malt/40",
    hops: "bg-asador-hops/25 text-[#5dd974] border-asador-hops/50",
    copper: "bg-asador-copper/15 text-asador-copper border-asador-copper/40",
    outline: "border-asador-border text-asador-silver",
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
