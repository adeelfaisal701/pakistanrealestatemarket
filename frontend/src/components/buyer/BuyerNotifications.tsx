"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, Clock } from "lucide-react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface BuyerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
  propertyId?: string;
  conversationId?: string;
  requirementId?: string;
  offerId?: string;
}

interface NotificationPage {
  items: BuyerNotification[];
  unreadCount: number;
  total: number;
}

function relatedHref(notification: BuyerNotification) {
  if (notification.requirementId) return `/buyer/requirements/${encodeURIComponent(notification.requirementId)}`;
  if (notification.propertyId) return `/property/${encodeURIComponent(notification.propertyId)}`;
  if (notification.conversationId) return `/buyer/inquiries?conversation=${encodeURIComponent(notification.conversationId)}`;
  return null;
}

export function BuyerNotifications() {
  const [data, setData] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<NotificationPage>>(
        "/buyer/notifications",
        { params: { limit: 100 } },
      );
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/buyer/notifications/${encodeURIComponent(id)}/read`);
      setData((current) => current ? {
        ...current,
        unreadCount: Math.max(0, current.unreadCount - (current.items.some((item) => item.id === id && !item.readAt) ? 1 : 0)),
        items: current.items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item),
      } : current);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.post("/buyer/notifications/read-all");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs text-slate-500">Buyer Account / Notifications</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Property matches, price changes and agent replies.</p>
        </div>
        <Button type="button" variant="outline" disabled={!data?.unreadCount} onClick={() => void markAllRead()}>
          <CheckCheck className="mr-2 h-4 w-4" />Mark all as read
        </Button>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}<button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Retry</button></div>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading notifications…</p>
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((notification) => {
            const href = relatedHref(notification);
            return (
              <article key={notification.id} className={`rounded-2xl border p-4 sm:p-5 ${notification.readAt ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h2>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />{new Date(notification.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {href && <Link href={href} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">View related item</Link>}
                      {!notification.readAt && <button type="button" onClick={() => void markRead(notification.id)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300">Mark as read</button>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : !error ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <Bell className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No notifications</h2>
          <p className="mt-1 text-sm text-slate-500">New matching properties and agent replies will appear here.</p>
        </div>
      ) : null}
      {!loading && data && data.total > data.items.length && (
        <p className="text-center text-xs text-slate-500">
          Showing the latest {data.items.length} of {data.total} notifications.
        </p>
      )}
    </section>
  );
}
