"use client";

/**
 * UI PREVIEW ONLY (development). Installs the sample-data axios adapter while
 * a /property-care-preview page is mounted and restores the real adapter on
 * unmount. The route layout returns 404 in production builds.
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { previewAdapter } from "@/lib/property-care-preview/mock-adapter";
import { CareShell } from "@/components/care/CareShell";
import { CareHistory, CareOverview, CareRequests } from "@/components/care/CareCore";
import { CareComplaints, CareNotifications, CarePassport, CarePayments, CareQuotations } from "@/components/care/CareRecords";
import { OpsShell } from "@/components/care-ops/OpsShell";
import { OpsOverview } from "@/components/care-ops/OpsOverview";
import { OpsRequests } from "@/components/care-ops/OpsRequests";
import { OpsDispatch } from "@/components/care-ops/OpsDispatch";
import { OpsPayments, OpsQuotations } from "@/components/care-ops/OpsFinance";
import { OpsComplaints } from "@/components/care-ops/OpsComplaints";
import { OpsCategories, OpsReports } from "@/components/care-ops/OpsInsights";
import { AdminMaintenanceRequestDetail } from "@/components/admin/maintenance/AdminMaintenanceRequestDetail";
import { AdminTechnicianManager } from "@/components/admin/maintenance/AdminTechnicianManager";
import { AdminTechnicianProfile } from "@/components/admin/maintenance/AdminTechnicianProfile";
import { CustomerMaintenanceDetail } from "@/components/maintenance/customer/CustomerMaintenanceDetail";
import { CustomerMaintenanceRequestForm } from "@/components/maintenance/customer/CustomerMaintenanceRequestForm";
import { TechnicianChrome } from "@/components/technician/TechnicianShell";
import { TechnicianHome, TechnicianJobs, TechnicianProfileView } from "@/components/technician/TechnicianWorkspace";
import { TechnicianDashboard } from "@/components/technician/TechnicianDashboard";
import { TechnicianJobDetail } from "@/components/technician/TechnicianJobDetail";
import { NotificationsPanel } from "@/components/maintenance/MaintenanceShared";

let originalAdapter: typeof apiClient.defaults.adapter | undefined;
let installCount = 0;

function installPreviewAdapter() {
  if (installCount === 0) {
    originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = previewAdapter;
  }
  installCount += 1;
}

function uninstallPreviewAdapter() {
  installCount = Math.max(0, installCount - 1);
  if (installCount === 0 && originalAdapter !== undefined) apiClient.defaults.adapter = originalAdapter;
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  // Install synchronously before children mount so their first fetch is mocked.
  const [installed] = useState(() => {
    if (typeof window !== "undefined") installPreviewAdapter();
    return true;
  });
  useEffect(() => () => uninstallPreviewAdapter(), []);
  if (!installed) return null;
  return (
    <>
      <div role="note" className="relative z-[60] bg-amber-400 px-4 py-1 text-center text-[11px] font-bold text-amber-950">
        UI preview · sample data only · actions disabled · not production
      </div>
      {children}
    </>
  );
}

const SCREENS: Array<[string, string]> = [
  ["/care", "Customer · Overview"], ["/care/requests", "Customer · My requests"], ["/care/new", "Customer · New request"],
  ["/care/requests/sample-quote", "Customer · Quotation review"], ["/care/requests/sample-confirm", "Customer · Completion confirmation"],
  ["/care/quotations", "Customer · Quotations"], ["/care/payments", "Customer · Payments"], ["/care/history", "Customer · History"],
  ["/care/passport", "Customer · Passport"], ["/care/complaints", "Customer · Complaints"], ["/care/notifications", "Customer · Notifications"],
  ["/care-ops", "Ops · Overview"], ["/care-ops/requests", "Ops · Requests"], ["/care-ops/requests/sample-admin", "Ops · Request detail"],
  ["/care-ops/dispatch", "Ops · Dispatch"], ["/care-ops/technicians", "Ops · Technicians"], ["/care-ops/technicians/tech-1", "Ops · Technician profile"],
  ["/care-ops/quotations", "Ops · Quotations"], ["/care-ops/payments", "Ops · Payments"], ["/care-ops/complaints", "Ops · Complaints"],
  ["/care-ops/categories", "Ops · Categories"], ["/care-ops/reports", "Ops · Reports"],
  ["/technician", "Technician · Home"], ["/technician/jobs", "Technician · Jobs"], ["/technician/jobs/sample-new", "Technician · Accept / reject"],
  ["/technician/jobs/sample-working", "Technician · Work in progress"], ["/technician/history", "Technician · History"], ["/technician/profile", "Technician · Profile"],
];

/** Maps a mirrored preview path to the real screen + its real shell. */
export function PreviewRouter({ path, query }: { path: string; query: Record<string, string | undefined> }) {
  const parts = path.split("/").filter(Boolean);
  const [root, section, id] = parts;

  if (root === "care") {
    const screen =
      !section ? <CareOverview /> :
        section === "requests" && id ? <CustomerMaintenanceDetail id={id} /> :
          section === "requests" ? <CareRequests /> :
            section === "new" ? <CustomerMaintenanceRequestForm /> :
              section === "history" ? <CareHistory /> :
                section === "quotations" ? <CareQuotations /> :
                  section === "payments" ? <CarePayments /> :
                    section === "passport" ? <CarePassport /> :
                      section === "complaints" ? <CareComplaints /> :
                        section === "notifications" ? <CareNotifications /> : null;
    return <CareShell>{screen ?? <Missing />}</CareShell>;
  }
  if (root === "care-ops") {
    const screen =
      !section ? <OpsOverview /> :
        section === "requests" && id ? <AdminMaintenanceRequestDetail id={id} /> :
          section === "requests" ? <OpsRequests /> :
            section === "dispatch" ? <OpsDispatch /> :
              section === "technicians" && id ? <AdminTechnicianProfile id={id} /> :
                section === "technicians" ? <AdminTechnicianManager /> :
                  section === "quotations" ? <OpsQuotations /> :
                    section === "payments" ? <OpsPayments /> :
                      section === "complaints" ? <OpsComplaints /> :
                        section === "categories" ? <OpsCategories /> :
                          section === "reports" ? <OpsReports /> : null;
    return <OpsShell>{screen ?? <Missing />}</OpsShell>;
  }
  if (root === "technician") {
    const screen =
      !section ? <TechnicianHome /> :
        section === "jobs" && id ? <TechnicianJobDetail id={id} /> :
          section === "jobs" ? <TechnicianJobs initialBucket={query.bucket} /> :
            section === "history" ? <TechnicianDashboard mode="history" /> :
              section === "profile" ? <TechnicianProfileView /> :
                section === "updates" ? <NotificationsPanel limit={30} /> : null;
    return (
      <TechnicianChrome profile={{ name: "Imran Ali (sample)", availability: "available" }} pathname={`/${parts.join("/")}`} onSignOut={() => undefined}>
        {screen ?? <Missing />}
      </TechnicianChrome>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-[#102b55]">
      <h1 className="text-2xl font-black">Property Care UI preview</h1>
      <p className="mt-1 text-sm text-slate-600">Development-only screens rendered inside their real dashboard layouts with sample data.</p>
      <ul className="mt-6 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {SCREENS.map(([href, label]) => (
          <li key={href}><Link href={`/property-care-preview${href}`} className="text-sm font-semibold underline">{label}</Link></li>
        ))}
      </ul>
    </main>
  );
}

function Missing() {
  return <p className="p-6 text-sm text-slate-500">No preview for this path.</p>;
}
