import NewsPageClient from "./news-client";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFeaturedNews, getNewsList } from "@/lib/seo/news-data";
import { isNewsCategory } from "@/lib/daily-updates";

export const metadata = buildMetadata({
  title: "Latest News — Pakistan, Real Estate, Lahore Development & Business | Ghar Safar",
  description:
    "Today's headlines from trusted Pakistani and international publishers — real estate and property, Lahore development, business and economy, government announcements and technology — with short summaries and links to the original stories.",
  path: "/news",
});

interface NewsRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewsRoute({ searchParams }: NewsRouteProps) {
  const params = await searchParams;
  const category = isNewsCategory(params.category) ? params.category : "";
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const [list, featured] = await Promise.all([
    getNewsList({ category, q: query, page: 1, limit: 12 }),
    category || query ? Promise.resolve(null) : getFeaturedNews(),
  ]);

  return (
    <NewsPageClient
      initialCategory={category}
      initialQuery={query}
      initialList={list}
      initialFeatured={featured ?? []}
    />
  );
}
