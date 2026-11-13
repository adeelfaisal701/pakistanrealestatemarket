import { NotificationsPanel } from "@/components/maintenance/MaintenanceShared";

export default function TechnicianUpdatesPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1660d0]">Updates</p>
        <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em]">Notifications</h1>
        <p className="mt-1 text-sm text-[#64748b]">New assignments, reassignments and job changes from Ghar Safar operations.</p>
      </header>
      <NotificationsPanel limit={30} />
    </div>
  );
}
