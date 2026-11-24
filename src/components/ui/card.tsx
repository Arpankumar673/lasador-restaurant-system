import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { glow?: "ember" | "copper" | "malt" | "none" }
>(({ className, glow = "none", ...props }, ref) => {
  const glowStyles = {
    none: "",
    ember: "hover:shadow-ember-glow transition-shadow duration-300",
    copper: "hover:shadow-copper-glow transition-shadow duration-300",
    malt: "hover:shadow-malt-glow transition-shadow duration-300",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-asador-lg border border-asador-border bg-asador-card text-asador-parchment shadow-card-elevation transition-all duration-300 ease-luxury-decel",
        glowStyles[glow],
        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-serif text-xl font-bold leading-none tracking-wide text-asador-parchment", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-asador-silver leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 border-t border-asador-borderMuted mt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
