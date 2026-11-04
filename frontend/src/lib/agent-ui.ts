// Shared class names for the dark Agent CRM screens.
// Kept in a plain (non-"use client") module so server components can import them.

export const PANEL = 'rounded-2xl border border-[#1a2a3f] bg-[#0d1828]';

export const PRIMARY_BTN =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50';

export const GHOST_BTN =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#27405f] bg-[#0b1524] px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-[#13233b] disabled:cursor-not-allowed disabled:opacity-50';

export const FIELD =
  'w-full min-h-[44px] rounded-xl border border-[#27405f] bg-[#0b1524] px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500';

export const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400';
