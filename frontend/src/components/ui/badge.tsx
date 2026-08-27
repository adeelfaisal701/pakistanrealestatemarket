import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-transparent",
    secondary: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-transparent",
    success: "bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-transparent",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-transparent",
    danger: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-transparent",
    outline: "border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
