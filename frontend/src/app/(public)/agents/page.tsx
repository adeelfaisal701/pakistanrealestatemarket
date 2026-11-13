import AgentsDirectoryPage from "./agents-client";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Real Estate Agents & Property Dealers in Lahore | Ghar Safar",
  description:
    "Find verified real estate agents and property dealers in Lahore. Compare agent profiles, agencies and listings, and contact local property experts directly on Ghar Safar.",
  path: "/agents",
  keywords: ["real estate agents in Lahore", "property dealers in Lahore", "verified property agents Pakistan"],
});

export default function AgentsPage() {
  return <AgentsDirectoryPage />;
}
