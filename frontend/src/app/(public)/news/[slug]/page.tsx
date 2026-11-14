import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, Sparkles } from "lucide-react";
import Navbar from "@/components/marketplace/Navbar";
import LiveUpdatesTicker from "@/components/daily-updates/LiveUpdatesTicker";
import { NewsCard, NewsThumbnail } from "@/components/daily-updates/NewsCard";
import { categoryStyle } from "@/components/daily-updates/news-category-style";
import { formatPkDateTime, safeExternalUrl } from "@/lib/daily-updates";
import { NOINDEX_FOLLOW, buildMetadata } from "@/lib/seo/metadata";
import { getNewsArticle } from "@/lib/seo/news-data";
import { truncateText } from "@/lib/seo/site";

interface NewsArticlePageProps {
  params: Promise<{ slug: string }>;
}

async function loadArticle(slug: string) {
  if (!/^[a-z0-9-]{3,100}$/.test(slug)) notFound();
  const result = await getNewsArticle(slug);
  if (result.ok) return result.data;
  if (result.status === 404 || result.status === 400) notFound();
  return null;
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArticle(slug);
  const path = `/news/${slug}`;
  if (!data) return { title: "News | Ghar Safar", robots: NOINDEX_FOLLOW, alternates: { canonical: path } };
  // Summaries of other publishers' stories: kept out of the search index.
  return buildMetadata({
    title: `${data.article.title} | Ghar Safar News`,
    description: truncateText(data.article.summary || `${data.article.title} — ${data.article.publisher}`),
    path,
    robots: NOINDEX_FOLLOW,
  });
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const data = await loadArticle(slug);

  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <LiveUpdatesTicker />
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> All news
        </Link>

        {!data ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-bold">This story is temporarily unavailable</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Please try again in a few minutes.</p>
          </div>
        ) : (
          <ArticleBody data={data} />
        )}
      </div>
    </main>
  );
}

function ArticleBody({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadArticle>>> }) {
  const { article, related } = data;
  const originalUrl = safeExternalUrl(article.url);
  const { chip } = categoryStyle(article.category);

  return (
    <>
      <article className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {article.thumbnailUrl && <NewsThumbnail article={article} eager className="aspect-[16/9] w-full" />}
        <div className="p-5 sm:p-7">
          <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${chip}`}>
            <Link href={`/news?category=${article.category}`} className="hover:underline">
              {article.categoryLabel}
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{article.title}</h1>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{article.publisher}</span>
            {" · Published "}
            <time dateTime={article.publishedAt}>{formatPkDateTime(article.publishedAt)}</time> (PKT)
          </p>

          {article.summary ? (
            <section aria-label="Summary" className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-800 dark:text-emerald-300">
                {article.summarySource === "ai" ? (
                  <>
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> AI summary
                  </>
                ) : (
                  <>
                    <Info aria-hidden="true" className="h-3.5 w-3.5" /> Publisher&apos;s excerpt
                  </>
                )}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">{article.summary}</p>
              {article.summarySource === "ai" && (
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Generated automatically from {article.publisher}&apos;s feed excerpt. Read the original for full details and context.
                </p>
              )}
            </section>
          ) : (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">No summary is available for this story.</p>
          )}

          {originalUrl && (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
            >
              Read the full story on {article.publisher}
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            The headline, image and article belong to {article.publisher}. Ghar Safar does not republish the full article.
          </p>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-news-heading" className="mt-10">
          <h2 id="related-news-heading" className="text-lg font-extrabold tracking-tight">
            More in {article.categoryLabel}
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id} className="flex">
                <NewsCard article={item} now={null} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
