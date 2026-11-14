"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { formatPkDateTime, safeExternalUrl, timeAgo, type NewsArticle } from "@/lib/daily-updates";
import { categoryStyle } from "./news-category-style";

/** Publisher thumbnail (served through our API), or a category placeholder — never an invented image. */
export function NewsThumbnail({
  article,
  className = "",
  eager = false,
}: {
  article: Pick<NewsArticle, "thumbnailUrl" | "category">;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const { icon: Icon, placeholder } = categoryStyle(article.category);
  if (!article.thumbnailUrl || failed) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br ${placeholder} ${className}`} aria-hidden="true">
        <Icon className="h-1/3 max-h-10 w-1/3 max-w-10 opacity-70" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same-origin, pre-sized WebP from the API proxy
    <img
      src={article.thumbnailUrl}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-slate-100 object-cover dark:bg-slate-800 ${className}`}
    />
  );
}

function Meta({ article, now }: { article: NewsArticle; now: number | null }) {
  const href = safeExternalUrl(article.url);
  return (
    <div className="relative z-10 mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-w-0 items-center gap-0.5 font-semibold text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400"
          aria-label={`Read the original article on ${article.publisher} (opens in a new tab)`}
        >
          <span className="truncate">{article.publisher}</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span className="font-semibold text-slate-700 dark:text-slate-300">{article.publisher}</span>
      )}
      <span aria-hidden="true">·</span>
      <time dateTime={article.publishedAt} title={formatPkDateTime(article.publishedAt)}>
        {now ? timeAgo(article.publishedAt, now) : formatPkDateTime(article.publishedAt)}
      </time>
    </div>
  );
}

/**
 * One news item. The headline opens our summary page; the publisher link
 * always opens the original article.
 */
export function NewsCard({
  article,
  now,
  layout = "vertical",
  showSummary = true,
  eager = false,
  className = "",
}: {
  article: NewsArticle;
  now: number | null;
  layout?: "vertical" | "row";
  showSummary?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const { chip } = categoryStyle(article.category);
  const detailHref = `/news/${article.slug}`;

  if (layout === "row") {
    return (
      <article className={`group relative flex min-w-0 gap-3 rounded-2xl p-2 transition hover:bg-slate-50 dark:hover:bg-slate-900 ${className}`}>
        <NewsThumbnail article={article} eager={eager} className="h-[72px] w-24 shrink-0 rounded-xl sm:h-20 sm:w-28" />
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${chip}`}>{article.categoryLabel}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-slate-900 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-emerald-300">
            <Link href={detailHref} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-emerald-500">
              {article.title}
            </Link>
          </h3>
          <Meta article={article} now={now} />
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <NewsThumbnail article={article} eager={eager} className="aspect-[16/9] w-full" />
      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${chip}`}>{article.categoryLabel}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-emerald-300">
          <Link href={detailHref} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-emerald-500">
            {article.title}
          </Link>
        </h3>
        {showSummary && article.summary && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {article.summarySource === "ai" && (
              <Sparkles aria-label="AI summary" className="mr-1 inline h-3 w-3 -translate-y-px text-emerald-600 dark:text-emerald-400" />
            )}
            {article.summary}
          </p>
        )}
        <div className="mt-auto pt-1">
          <Meta article={article} now={now} />
        </div>
      </div>
    </article>
  );
}

export function NewsCardSkeleton({ layout = "vertical" }: { layout?: "vertical" | "row" }) {
  if (layout === "row") {
    return (
      <div className="flex gap-3 p-2" aria-hidden="true">
        <div className="h-[72px] w-24 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-20 sm:w-28" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-2/3 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" aria-hidden="true">
      <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800" />
      <div className="space-y-2 p-3.5">
        <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-3/4 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
