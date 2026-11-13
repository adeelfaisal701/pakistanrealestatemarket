import { Suspense } from "react";
import { PreviewRouter } from "@/components/property-care/preview/PreviewShells";

/**
 * UI PREVIEW ONLY — mirrors real Property Care paths, e.g.
 * /property-care-preview/care/payments renders the /care/payments screen
 * inside its real shell with sample data. The parent layout 404s in production.
 */
export default async function PropertyCarePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ slug = [] }, query] = await Promise.all([params, searchParams]);
  return (
    <Suspense>
      <PreviewRouter path={`/${slug.join("/")}`} query={query} />
    </Suspense>
  );
}
