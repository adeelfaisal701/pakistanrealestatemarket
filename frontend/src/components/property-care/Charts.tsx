"use client";

/**
 * Lightweight, dependency-free SVG charts for Property Care dashboards.
 * Colours follow the Ghar Safar blue/navy palette. Each chart has an
 * accessible text summary for screen readers.
 */
import { cn } from "@/lib/utils";

export const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#64748b", "#ec4899"];

export function BarChart({
  data,
  height = 180,
  dark = false,
  valueSuffix = "",
  label,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  dark?: boolean;
  valueSuffix?: string;
  label: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <figure>
      <figcaption className="sr-only">
        {label}: {data.map((item) => `${item.label} ${item.value}${valueSuffix}`).join(", ")}
      </figcaption>
      <div aria-hidden="true" className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((item) => (
          <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className={cn("text-[10px] font-bold tabular-nums", dark ? "text-slate-300" : "text-[#36506f]")}>{item.value}</span>
            <div
              className="w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-[#1d4ed8] to-[#60a5fa] transition-all"
              style={{ height: `${Math.max(3, (item.value / max) * (height - 36))}px` }}
            />
            <span className={cn("w-full truncate text-center text-[10px] font-semibold", dark ? "text-slate-500" : "text-[#6b7a90]")}>{item.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function DonutChart({
  data,
  dark = false,
  label,
  centerLabel,
}: {
  data: Array<{ label: string; value: number }>;
  dark?: boolean;
  label: string;
  centerLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <figcaption className="sr-only">
        {label}: {data.map((item) => `${item.label} ${item.value}`).join(", ")}
      </figcaption>
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="16" className={dark ? "stroke-slate-800" : "stroke-[#e6eef8]"} />
        {total > 0 &&
          data.map((item, index) => {
            const length = (item.value / total) * circumference;
            const segment = (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="16"
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" transform="rotate(90 60 60)" className={cn("text-[20px] font-black", dark ? "fill-white" : "fill-[#102b55]")}>
          {centerLabel ?? total}
        </text>
      </svg>
      <ul className="w-full space-y-1.5" aria-hidden="true">
        {data.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
            <span className={cn("min-w-0 flex-1 truncate", dark ? "text-slate-300" : "text-[#36506f]")}>{item.label}</span>
            <span className={cn("font-bold tabular-nums", dark ? "text-white" : "text-[#102b55]")}>{item.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function LineChart({
  data,
  height = 160,
  dark = false,
  label,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  dark?: boolean;
  label: string;
}) {
  const width = 320;
  const max = Math.max(1, ...data.map((item) => item.value));
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((item, index) => [index * step, height - 20 - (item.value / max) * (height - 40)] as const);
  const path = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height - 20} L0,${height - 20} Z`;
  return (
    <figure>
      <figcaption className="sr-only">
        {label}: {data.map((item) => `${item.label} ${item.value}`).join(", ")}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-40 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="pc-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1="0" x2={width} y1={(height - 20) * ratio} y2={(height - 20) * ratio} className={dark ? "stroke-slate-800" : "stroke-[#e6eef8]"} strokeWidth="1" />
        ))}
        <path d={area} fill="url(#pc-line-fill)" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden="true" className={cn("mt-1 flex justify-between text-[10px] font-semibold", dark ? "text-slate-500" : "text-[#6b7a90]")}>
        {data.filter((_, index) => index % Math.ceil(data.length / 6) === 0 || index === data.length - 1).map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </figure>
  );
}

export function ProgressBar({ value, max, dark = false, tone = "blue" }: { value: number; max: number; dark?: boolean; tone?: "blue" | "green" | "amber" | "rose" }) {
  const toneClass = { blue: "bg-[#3b82f6]", green: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500" }[tone];
  return (
    <div className={cn("h-2 overflow-hidden rounded-full", dark ? "bg-slate-800" : "bg-[#e6eef8]")} aria-hidden="true">
      <div className={cn("h-full rounded-full", toneClass)} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}
