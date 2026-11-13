import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold tracking-[-0.005em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none rounded-xl";

    const variantStyles = {
      default: "bg-brand-600 hover:bg-brand-700 text-white shadow-[0_1px_2px_rgba(16,29,50,0.12),0_6px_16px_-6px_rgba(0,143,104,0.45)] active:scale-[0.98]",
      secondary: "bg-slate-100 hover:bg-slate-200/80 text-ink-700",
      outline: "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-ink-700 shadow-[0_1px_2px_rgba(16,29,50,0.05)]",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
      danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base font-semibold",
      icon: "h-10 w-10 p-2",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
