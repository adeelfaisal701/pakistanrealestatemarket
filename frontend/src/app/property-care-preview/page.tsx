import Link from "next/link";

const SCREENS = [
  ["Public", [["/maintenance", "Landing page"], ["/maintenance/services/plumbing", "Service detail — Plumbing"]]],
  ["Customer", [
    ["/property-care-preview/customer", "Maintenance dashboard"],
    ["/property-care-preview/customer/new", "Submit request (wizard)"],
    ["/property-care-preview/customer/sample-review", "Request — under review"],
    ["/property-care-preview/customer/sample-quote", "Request — quotation review"],
    ["/property-care-preview/customer/sample-confirm", "Request — completion confirmation"],
    ["/property-care-preview/customer/sample-completed", "Request — feedback"],
  ]],
  ["Technician", [
    ["/property-care-preview/technician", "Jobs dashboard"],
    ["/property-care-preview/technician/history", "Job history"],
    ["/property-care-preview/technician/jobs/sample-new", "Job — accept / reject"],
    ["/property-care-preview/technician/jobs/sample-working", "Job — in progress & checklist"],
    ["/property-care-preview/technician/jobs/sample-reassigned", "Job — reassigned (locked)"],
  ]],
  ["Admin", [
    ["/property-care-preview/admin", "Overview & requests"],
    ["/property-care-preview/admin/requests/sample-admin", "Request detail & reassignment"],
    ["/property-care-preview/admin/technicians", "Technician management"],
    ["/property-care-preview/admin/technicians/tech-1", "Technician profile & history"],
  ]],
] as const;

export default function PreviewIndex() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-[#102b55]">
      <h1 className="text-2xl font-black">Property Care UI preview</h1>
      <p className="mt-1 text-sm text-slate-600">Development-only screens rendered with sample data. Not available in production.</p>
      {SCREENS.map(([group, links]) => (
        <section key={group} className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1768c4]">{group}</h2>
          <ul className="mt-2 space-y-1">
            {links.map(([href, label]) => (
              <li key={href}><Link href={href} className="text-sm font-semibold underline">{label}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
