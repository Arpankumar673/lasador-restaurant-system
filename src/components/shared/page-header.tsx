import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-asador-border",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-asador-parchment">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-asador-silver">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center space-x-3">{children}</div>}
    </div>
  );
}
