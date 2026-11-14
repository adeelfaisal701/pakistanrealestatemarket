"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchLatestNews, NEWS_CATEGORIES, type NewsArticle, type NewsCategory } from "@/lib/daily-updates";
import { NewsCard, NewsCardSkeleton } from "./NewsCard";

const ITEMS = 4;

/**
 * Compact homepage news strip: category chips + 4 stories (3 on phones).
 * Rows on narrow containers, cards on wide ones (container queries).
 */
export default function LatestNews({ className = "", innerClassName = "" }: { className?: string; innerClassName?: string }) {
  const [category, setCategory] = useState<NewsCategory | "">("");
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setArticles(null);
    setFailed(false);
    fetchLatestNews(category, ITEMS)
      .then((items) => {
        if (!active) return;
        setArticles(items);
        setNow(Date.now());
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <section aria-labelledby="latest-news-heading" className={`border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${className}`}>
      <div className={`@container ${innerClassName}`}>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Daily Updates</p>
            <h2 id="latest-news-heading" className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white @4xl:text-2xl">
              Latest News
            </h2>
          </div>
          <Link
            href={category ? `/news?category=${category}` : "/news"}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            View All News <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div
          role="group"
          aria-label="Filter news by category"
          className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[{ value: "" as const, short: "All" }, ...NEWS_CATEGORIES].map((option) => {
            const selected = option.value === category;
            return (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setCategory(option.value)}
                aria-pressed={selected}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {option.short}
              </button>
            );
          })}
        </div>

        <div className="mt-2 min-h-[16rem] @2xl:min-h-[11rem] @5xl:min-h-[17rem]">
          {failed ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">News is temporarily unavailable. Please try again shortly.</p>
          ) : articles && articles.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {category ? "No recent stories in this category yet." : "Latest stories will appear here as soon as they are published."}
            </p>
          ) : (
            <>
              {/* Narrow and medium containers: compact rows. */}
              <ul className="grid gap-1 @2xl:grid-cols-2 @2xl:gap-x-4 @5xl:hidden">
                {(articles ?? Array.from({ length: ITEMS }, () => null)).slice(0, ITEMS).map((article, index) => (
                  <li key={article?.id ?? index} className={index === ITEMS - 1 ? "@max-2xl:hidden" : ""}>
                    {article ? <NewsCard article={article} now={now} layout="row" /> : <NewsCardSkeleton layout="row" />}
                  </li>
                ))}
              </ul>
              {/* Wide containers: four cards in one row. */}
              <ul className="hidden gap-4 pt-1 @5xl:grid @5xl:grid-cols-4">
                {(articles ?? Array.from({ length: ITEMS }, () => null)).slice(0, ITEMS).map((article, index) => (
                  <li key={article?.id ?? index} className="flex">
                    {article ? <NewsCard article={article} now={now} className="w-full" /> : <NewsCardSkeleton />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
