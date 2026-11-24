import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "flame"
    | "copper"
    | "malt"
    | "outline"
    | "ghost"
    | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-asador transition-all duration-200 ease-luxury-decel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asador-ember focus-visible:ring-offset-2 focus-visible:ring-offset-asador-bg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985]";

    const variantStyles = {
      default:
        "bg-asador-ember text-asador-ivory hover:bg-asador-flame shadow-ember-glow font-semibold",
      flame:
        "bg-asador-flame text-asador-ivory hover:bg-[#5C1D24] font-semibold",
      copper:
        "bg-asador-copper text-asador-ivory hover:bg-[#9A7432] shadow-copper-glow font-semibold",
      malt:
        "bg-asador-malt text-asador-ivory hover:bg-[#9A7432] shadow-malt-glow font-semibold",
      outline:
        "border border-asador-border bg-asador-surface text-asador-parchment hover:border-asador-ember hover:bg-asador-surfaceHover hover:text-asador-ember",
      secondary:
        "bg-asador-deep text-asador-parchment hover:bg-asador-surfaceHover border border-asador-border",
      ghost:
        "bg-transparent text-asador-silver hover:text-asador-parchment hover:bg-asador-surfaceHover",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs tracking-wider uppercase",
      default: "h-10 px-5 text-sm",
      lg: "h-12 px-7 text-base font-semibold",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
