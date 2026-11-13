/**
 * Shown instantly while a public page is fetched (prefetched by Next.js), so
 * navigation gives immediate feedback instead of waiting on the server.
 */
export default function PublicLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-canvas px-4">
      <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
      <span className="text-sm font-semibold text-slate-500">Loading Ghar Safar…</span>
    </div>
  );
}
