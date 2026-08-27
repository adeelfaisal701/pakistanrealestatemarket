import React from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  accentColor?: "rose" | "emerald" | "amber" | "blue" | "purple";
}

export function AdminStatsCard({
  title,
  value,
  icon: Icon,
  change,
  isPositive = true,
  subtitle,
  accentColor = "rose",
}: AdminStatsCardProps) {
  const colorMap = {
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  };

  return (
    <Card className="p-4 sm:p-5 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center border flex-shrink-0", colorMap[accentColor])}>
          <Icon className="h-4 w-4 flex-shrink-0" />
        </div>
      </div>

      <div className="mt-2 sm:mt-3">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-xs">
          {change && (
            <span
              className={cn(
                "inline-flex items-center font-bold",
                isPositive ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 mr-0.5 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 mr-0.5 flex-shrink-0" />
              )}
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-500 truncate text-[11px] sm:text-xs">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
