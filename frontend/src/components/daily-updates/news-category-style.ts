import { Building2, Construction, Cpu, Flag, Landmark, TrendingUp, type LucideIcon } from "lucide-react";
import type { NewsCategory } from "@/lib/daily-updates";

/** Icon and colours per news category (usable from server and client components). */
const CATEGORY_STYLE: Record<NewsCategory, { icon: LucideIcon; chip: string; placeholder: string }> = {
  pakistan: { icon: Flag, chip: "text-emerald-700 dark:text-emerald-400", placeholder: "from-emerald-50 to-emerald-100 text-emerald-600 dark:from-emerald-950 dark:to-slate-900 dark:text-emerald-400" },
  real_estate: { icon: Building2, chip: "text-brand-700 dark:text-brand-500", placeholder: "from-brand-50 to-brand-200 text-brand-600 dark:from-slate-900 dark:to-slate-800 dark:text-brand-500" },
  lahore_development: { icon: Construction, chip: "text-amber-700 dark:text-amber-400", placeholder: "from-amber-50 to-amber-100 text-amber-600 dark:from-amber-950/40 dark:to-slate-900 dark:text-amber-400" },
  business: { icon: TrendingUp, chip: "text-indigo-700 dark:text-indigo-400", placeholder: "from-indigo-50 to-indigo-100 text-indigo-600 dark:from-indigo-950/40 dark:to-slate-900 dark:text-indigo-400" },
  government: { icon: Landmark, chip: "text-sky-700 dark:text-sky-400", placeholder: "from-sky-50 to-sky-100 text-sky-600 dark:from-sky-950/40 dark:to-slate-900 dark:text-sky-400" },
  technology: { icon: Cpu, chip: "text-violet-700 dark:text-violet-400", placeholder: "from-violet-50 to-violet-100 text-violet-600 dark:from-violet-950/40 dark:to-slate-900 dark:text-violet-400" },
};

export function categoryStyle(category: NewsCategory) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.pakistan;
}
