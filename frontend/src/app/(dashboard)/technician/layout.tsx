import { TechnicianShell } from "@/components/technician/TechnicianShell";

export const metadata = {
  title: "Technician Console | Ghar Safar",
  description: "Assigned Ghar Safar Property Care jobs.",
};

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return <TechnicianShell>{children}</TechnicianShell>;
}
