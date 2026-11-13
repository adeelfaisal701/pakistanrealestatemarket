import { TechnicianJobDetail } from "@/components/technician/TechnicianJobDetail";

export default async function TechnicianJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TechnicianJobDetail id={id} />;
}
