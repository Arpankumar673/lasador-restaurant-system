import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("bg-asador-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-asador-silver">
            {label}
          </span>
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-asador bg-asador-surface border border-asador-border text-asador-ember">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="font-serif text-2xl font-bold tracking-tight text-asador-parchment">
            {value}
          </div>
          {(description || trendValue) && (
            <div className="mt-1 flex items-center space-x-2 text-xs text-asador-silver">
              {trendValue && (
                <span
                  className={cn(
                    "font-semibold",
                    trend === "up" && "text-[#5dd974]",
                    trend === "down" && "text-asador-ember",
                    trend === "neutral" && "text-asador-silver"
                  )}
                >
                  {trendValue}
                </span>
              )}
              {description && <span>{description}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
