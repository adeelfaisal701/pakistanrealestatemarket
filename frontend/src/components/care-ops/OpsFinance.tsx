"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink, ReceiptText } from "lucide-react";
import { QUOTATION_LABELS, formatDate, formatMoney } from "@/lib/maintenance";
import { countBy, useAdminRequestDetails, useAdminRequests, useApiGet } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { AdminMaintenanceRequest, QuotationStatus } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { DonutChart } from "@/components/property-care/Charts";
import { OpsPageHeader, OpsPanel, OpsStat } from "./OpsShell";

const QUOTE_TABS: Array<{ key: QuotationStatus | "needs"; label: string }> = [
  { key: "needs", label: "Needs quotation" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Awaiting customer" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const QUOTE_TONE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  sent: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
};

const NEEDS_QUOTE_STATUSES = ["under_review", "awaiting_technician_acceptance", "accepted", "on_the_way", "in_progress"];

export function OpsQuotations() {
  const list = useAdminRequests({ page: 1, limit: 100 }, "quotes");
  const [tab, setTab] = useState<QuotationStatus | "needs">("sent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = list.data?.items ?? [];
  const groups = useMemo(() => {
    const map: Record<string, typeof items> = { needs: [], draft: [], sent: [], approved: [], rejected: [] };
    for (const item of items) {
      if (item.quotationStatus) map[item.quotationStatus].push(item);
      else if (NEEDS_QUOTE_STATUSES.includes(item.status)) map.needs.push(item);
    }
    return map;
  }, [items]);
  const visible = groups[tab] ?? [];
  const detail = useApiGet<AdminMaintenanceRequest>(selectedId ? `/admin/maintenance/requests/${encodeURIComponent(selectedId)}` : null, undefined, selectedId ?? "none");
  const quotation = selectedId ? detail.data?.quotation : null;

  return (
    <div>
      <OpsPageHeader title="Quotations" description="Prepare, send and track quotations. Customers must approve before chargeable work starts." />
      {list.error && <div className="mb-4"><ErrorBanner message={list.error} onRetry={list.reload} dark /></div>}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {QUOTE_TABS.map((item) => (
          <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => { setTab(item.key); setSelectedId(null); }} className={cn("min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold", tab === item.key ? "border-care-500 bg-care-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5")}>
            {item.label} <span className="ml-1 tabular-nums opacity-70">{groups[item.key]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {list.loading && !list.data ? <LoadingState label="Loading quotations…" dark /> : !visible.length ? (
            <EmptyState dark icon={<ReceiptText className="h-5 w-5" />} title={tab === "needs" ? "Every active job has a quotation" : "No quotations here"} />
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelectedId(item.id)} aria-pressed={selectedId === item.id} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition", selectedId === item.id ? "border-care-500 bg-care-600/10" : "border-white/5 bg-[#081d40] hover:border-white/15")}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                      <span className="block text-xs text-slate-500">{item.reference} · {item.customerName}</span>
                    </span>
                    {item.quotationStatus ? (
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", QUOTE_TONE[item.quotationStatus])}>{QUOTATION_LABELS[item.quotationStatus]}</span>
                    ) : <StatusBadge status={item.status} dark ops />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <OpsPanel title="Customer view preview">
            {!selectedId ? (
              <p className="text-sm text-slate-500">Select a request to preview its quotation as the customer sees it.</p>
            ) : detail.loading ? <LoadingState label="Loading…" dark /> : detail.error ? <ErrorBanner message={detail.error} dark /> : !quotation ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">No quotation yet for this request.</p>
                <Link href={`/care-ops/requests/${selectedId}#mr-quotation`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-care-600 px-4 text-sm font-bold text-white hover:bg-care-700">Create quotation</Link>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-4 text-[#0f2747]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1660d0]">Quotation v{quotation.version}</p>
                  <span className="text-[11px] font-bold text-[#64748b]">{QUOTATION_LABELS[quotation.status]}</span>
                </div>
                <dl className="mt-3 divide-y divide-[#edf2f8] text-sm">
                  {[["Inspection", quotation.inspectionCharge], ["Labour", quotation.laborCharge], ["Materials", quotation.materialCharge], ...quotation.additionalCharges.map((line) => [line.label, line.amount] as const)].map(([label, amount]) => (
                    <div key={String(label)} className="flex justify-between py-2"><dt className="text-[#7a8594]">{label}</dt><dd className="font-semibold">{formatMoney(Number(amount))}</dd></div>
                  ))}
                </dl>
                <div className="mt-2 flex justify-between rounded-xl bg-[#0f2747] px-3 py-2.5 text-white"><span className="text-sm">Total</span><span className="font-black">{formatMoney(quotation.total)}</span></div>
                {quotation.notes && <p className="mt-2 text-xs text-[#64748b]">{quotation.notes}</p>}
              </div>
            )}
            {selectedId && (
              <Link href={`/care-ops/requests/${selectedId}#mr-quotation`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-care-300 hover:underline">
                Open quotation editor <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </OpsPanel>
        </aside>
      </div>
    </div>
  );
}

export function OpsPayments() {
  const result = useAdminRequestDetails({}, "payments", (item) => item.quotationStatus === "approved");
  const rows = (result.data?.details ?? []).flatMap((request) =>
    request.payments.map((payment) => ({ ...payment, request })),
  ).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const outstanding = (result.data?.details ?? []).reduce((sum, request) => {
    const paid = request.payments.reduce((acc, payment) => acc + payment.amount, 0);
    return sum + Math.max(0, (request.quotation?.total ?? 0) - paid);
  }, 0);
  const statusOf = (request: AdminMaintenanceRequest) => request.paymentStatus.replace("_", " ");

  return (
    <div>
      <OpsPageHeader title="Payments" description="Manually recorded payment transactions. No payment gateway is connected." />
      {result.error && <div className="mb-4"><ErrorBanner message={result.error} onRetry={result.reload} dark /></div>}
      {result.data?.truncated && <p className="mb-3 text-xs text-slate-500">Showing jobs from the latest 20 approved quotations.</p>}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OpsStat label="Recorded" value={result.data ? formatMoney(total) : "–"} icon={<CreditCard className="h-5 w-5" />} tone="text-care-300" />
        <OpsStat label="Outstanding" value={result.data ? formatMoney(outstanding) : "–"} icon={<ReceiptText className="h-5 w-5" />} tone="text-amber-300" />
        <OpsStat label="Transactions" value={result.data ? rows.length : "–"} icon={<CreditCard className="h-5 w-5" />} />
        <OpsStat label="Fully paid jobs" value={result.data ? result.data.details.filter((request) => request.paymentStatus === "paid").length : "–"} icon={<CreditCard className="h-5 w-5" />} tone="text-emerald-300" />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <OpsPanel title="Payment history">
          {result.loading && !result.data ? <LoadingState label="Loading payments…" dark /> : !rows.length ? (
            <EmptyState dark icon={<CreditCard className="h-5 w-5" />} title="No payments recorded" description="Payments are recorded from a request once its quotation is approved." />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-slate-500"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Request</th><th className="py-2 pr-3">Customer</th><th className="py-2 pr-3">Method</th><th className="py-2 pr-3 text-right">Amount</th><th className="py-2 pl-3">Job status</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2.5 pr-3 text-xs text-slate-300">{formatDate(row.recordedAt, true)}</td>
                        <td className="py-2.5 pr-3"><Link href={`/care-ops/requests/${row.request.id}#mr-payments`} className="font-semibold text-white hover:underline">{row.request.reference}</Link></td>
                        <td className="py-2.5 pr-3 text-slate-300">{row.request.customer?.name ?? row.request.contact.name}</td>
                        <td className="py-2.5 pr-3 capitalize text-slate-300">{row.method.replace("_", " ")}{row.reference ? <span className="block text-xs text-slate-500">{row.reference}</span> : null}</td>
                        <td className="py-2.5 pr-3 text-right font-bold tabular-nums text-white">{formatMoney(row.amount)}</td>
                        <td className="py-2.5 pl-3 text-xs font-semibold capitalize text-slate-300">{statusOf(row.request)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2 md:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between"><span className="font-bold text-white">{formatMoney(row.amount)}</span><span className="text-xs capitalize text-slate-400">{row.method.replace("_", " ")}</span></div>
                    <p className="text-xs text-slate-400">{row.request.reference} · {row.request.customer?.name ?? row.request.contact.name}</p>
                    <p className="text-[11px] text-slate-500">{formatDate(row.recordedAt, true)} · {statusOf(row.request)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </OpsPanel>
        <OpsPanel title="Methods">
          {rows.length ? <DonutChart dark label="Payments by method" data={countBy(rows, (row) => row.method.replace("_", " "))} /> : <p className="text-sm text-slate-500">No data yet.</p>}
        </OpsPanel>
      </div>
    </div>
  );
}
