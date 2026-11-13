import { TechnicianJobs } from "@/components/technician/TechnicianWorkspace";

export default async function TechnicianJobsPage({ searchParams }: { searchParams: Promise<{ bucket?: string }> }) {
  const { bucket } = await searchParams;
  return <TechnicianJobs initialBucket={bucket} />;
}
