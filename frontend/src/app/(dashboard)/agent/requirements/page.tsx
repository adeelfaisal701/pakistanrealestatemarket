import { AgentRequirementsManager } from "@/components/crm/AgentRequirementsManager";

export const metadata = {
  title: "Client Requirements | EstatePro Agent",
  description: "Browse client requirements and offer eligible published listings.",
};

export default function AgentRequirementsPage() {
  return <AgentRequirementsManager />;
}
