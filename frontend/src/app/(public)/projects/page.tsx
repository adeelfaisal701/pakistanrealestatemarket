import ProjectsPage from "./projects-client";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "New Real Estate Projects & Housing Societies in Lahore | Ghar Safar",
  description:
    "Explore published real estate development projects and housing societies on Ghar Safar — project details, locations, price ranges and payment plans from the developers.",
  path: "/projects",
});

export default function ProjectsRoute() {
  return <ProjectsPage />;
}
