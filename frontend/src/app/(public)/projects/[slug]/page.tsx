import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectDetailsPage from "./project-client";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublishedProject } from "@/lib/seo/public-data";
import { truncateText } from "@/lib/seo/site";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

async function loadProject(slug: string) {
  const result = await getPublishedProject(slug);
  if (result.ok) return result.data;
  if (result.status === 404 || result.status === 400) notFound();
  return undefined; // Backend unreachable: the client loads it.
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await loadProject(slug);
  const path = `/projects/${encodeURIComponent(slug)}`;
  if (!project) return { title: "Real Estate Project | Ghar Safar", alternates: { canonical: path } };
  const summary = project.shortDescription?.trim() || project.description?.trim() || "";
  return buildMetadata({
    title: `${project.name}${project.location ? ` — ${project.location}` : ""} | Ghar Safar Projects`,
    description: truncateText(
      `${project.name} by ${project.developer}${project.location ? ` in ${project.location}` : ""}: ${project.projectType}, ${project.status}${project.priceRange ? `, ${project.priceRange}` : ""}. ${summary}`,
    ),
    path,
    images: project.coverImage ? [{ url: project.coverImage, alt: `${project.name}${project.location ? `, ${project.location}` : ""}` }] : undefined,
  });
}

export default async function ProjectRoute({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await loadProject(slug);
  return <ProjectDetailsPage slug={slug} initialProject={project} />;
}
