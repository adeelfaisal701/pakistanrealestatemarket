"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Newspaper, Search, X } from "lucide-react";
import Navbar from "@/components/marketplace/Navbar";
import LiveUpdatesTicker from "@/components/daily-updates/LiveUpdatesTicker";
import { NewsCard, NewsCardSkeleton } from "@/components/daily-updates/NewsCard";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchNewsPage,
  NEWS_CATEGORIES,
  type NewsArticle,
  type NewsCategory,
  type NewsListMeta,
} from "@/lib/daily-updates";

interface NewsPageClientProps {
  initialCategory: NewsCategory | "";
  initialQuery: string;
  initialList: { items: NewsArticle[]; meta: NewsListMeta | null } | null;
  initialFeatured: NewsArticle[];
}

const PAGE_SIZE = 12;

export default function NewsPageClient({ initialCategory, initialQuery, initialList, initialFeatured }: NewsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState<NewsCategory | "">(initialCategory);
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<NewsArticle[]>(initialList?.items ?? []);
  const [meta, setMeta] = useState<NewsListMeta | null>(initialList?.meta ?? null);
  const [loading, setLoading] = useState(!initialList);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const firstRender = useRef(Boolean(initialList));
  const requestId = useRef(0);

  useEffect(() => setNow(Date.now()), []);

  // Debounce typing into the applied search query.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  // Load page 1 whenever the filters change (the server already rendered the initial one).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    fetchNewsPage({ category, q: query, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (id !== requestId.current) return;
        setItems(result.items);
        setMeta(result.meta);
        setNow(Date.now());
      })
      .catch((requestError: unknown) => {
        if (id === requestId.current) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("q", query);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [category, query, pathname, router]);

  const loadMore = () => {
    if (!meta || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    fetchNewsPage({ category, q: query, page: meta.page + 1, limit: PAGE_SIZE })
      .then((result) => {
        if (id !== requestId.current) return;
        setItems((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...result.items.filter((item) => !seen.has(item.id))];
        });
        setMeta(result.meta);
      })
      .catch((requestError: unknown) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoadingMore(false));
  };

  const showFeatured = !category && !query && initialFeatured.length > 0;
  const featuredIds = new Set(showFeatured ? initialFeatured.map((item) => item.id) : []);
  const listItems = items.filter((item) => !featuredIds.has(item.id));
  const hasMore = meta ? meta.page < meta.totalPages : false;
  const unavailable = !initialList && !loading && items.length === 0 && Boolean(error);

  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <LiveUpdatesTicker />

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Daily Updates</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Latest News</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Headlines from trusted publishers, refreshed automatically throughout the day. Each story has a short summary
              and a link to the full article on the publisher&apos;s website.
            </p>
          </div>
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(queryInput.trim());
            }}
            className="relative w-full sm:w-80"
          >
            <label htmlFor="news-search" className="sr-only">
              Search news
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="news-search"
              type="search"
              value={queryInput}
              maxLength={80}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search headlines, publishers…"
              className="h-11 w-full rounded-full border border-slate-200 bg-white pl-10 pr-10 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 [&::-webkit-search-cancel-button]:hidden"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => setQueryInput("")}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="Clear search"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        <div
          role="group"
          aria-label="Filter news by category"
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {[{ value: "" as const, label: "All news" }, ...NEWS_CATEGORIES].map((option) => {
            const selected = option.value === category;
            return (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setCategory(option.value)}
                aria-pressed={selected}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {showFeatured && (
        <section aria-labelledby="featured-news-heading" className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="featured-news-heading" className="text-lg font-extrabold tracking-tight">
            Featured
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {initialFeatured.map((article, index) => (
              <NewsCard key={article.id} article={article} now={now} eager={index === 0} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all-news-heading" className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="all-news-heading" className="text-lg font-extrabold tracking-tight">
            {query
              ? `Results for “${query}”`
              : category
                ? NEWS_CATEGORIES.find((option) => option.value === category)?.label
                : "Latest stories"}
          </h2>
          {meta && !loading && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {meta.total} {meta.total === 1 ? "story" : "stories"}
            </p>
          )}
        </div>

        {error && !unavailable && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <NewsCardSkeleton key={index} />
            ))}
          </div>
        ) : unavailable || (!initialList && items.length === 0 && !meta) ? (
          <EmptyState title="News is temporarily unavailable" text="We couldn't load the latest stories. Please try again in a few minutes." />
        ) : listItems.length === 0 ? (
          <EmptyState
            title={query || category ? "No matching stories" : "No stories yet"}
            text={
              query || category
                ? "Try a different search or category. Stories are kept for 45 days."
                : "Stories will appear here automatically as publishers release them."
            }
          />
        ) : (
          <>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listItems.map((article) => (
                <li key={article.id} className="flex">
                  <NewsCard article={article} now={now} className="w-full" />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {loadingMore && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  Load more stories
                </button>
              </div>
            )}
          </>
        )}

        <p className="mt-10 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Headlines, images and links belong to their publishers. Ghar Safar shows short summaries only — written by AI from
          the publisher&apos;s own feed excerpt where marked, otherwise the publisher&apos;s excerpt — and links to the
          original article for the full story.
        </p>
      </section>
    </main>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <Newspaper aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
