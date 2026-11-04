"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface InquiryProperty {
  id: string;
  title: string;
  images?: string[];
  location?: { area?: string; city?: string };
  price?: number;
}

interface BuyerInquiry {
  id: string;
  propertyId: string;
  status: string;
  latestMessagePreview?: string;
  latestMessageSender?: "visitor" | "buyer" | "agent" | null;
  lastMessageAt: string;
  unreadMessages: number;
  property: InquiryProperty;
  agent?: { name?: string; agencyName?: string };
}

interface InquiryMessage {
  id: string;
  senderType: "visitor" | "buyer" | "agent";
  content: string;
  createdAt: string;
  readAt?: string | null;
}

interface InquiryMessagePage {
  messages: InquiryMessage[];
  hasMore: boolean;
  nextBefore: string | null;
}

function formatPrice(price?: number) {
  return typeof price === "number"
    ? `PKR ${new Intl.NumberFormat("en-PK").format(price)}`
    : "Price not available";
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function BuyerInquiries() {
  const searchParams = useSearchParams();
  const requestedConversation = searchParams.get("conversation");
  const [items, setItems] = useState<BuyerInquiry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<InquiryMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadInquiries = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await apiClient.get<ApiEnvelope<BuyerInquiry[]>>(
        "/buyer/inquiries",
        { params: query.trim() ? { q: query.trim() } : undefined },
      );
      const inquiries = response.data.data;
      setItems(inquiries);
      setSelectedId((current) => {
        const nextId = requestedConversation || current || inquiries[0]?.id || "";
        return inquiries.some((item) => item.id === nextId) ? nextId : inquiries[0]?.id || "";
      });
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingList(false);
    }
  }, [query, requestedConversation]);

  const loadMessages = useCallback(async (conversationId: string, before?: string) => {
    const response = await apiClient.get<ApiEnvelope<InquiryMessagePage>>(
      `/buyer/conversations/${encodeURIComponent(conversationId)}/messages`,
      { params: { limit: 30, ...(before ? { before } : {}) } },
    );
    return response.data.data;
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!selectedId) return;
    try {
      const page = await loadMessages(selectedId);
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        page.messages.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        );
      });
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }, [loadMessages, selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInquiries(), 200);
    return () => window.clearTimeout(timer);
  }, [loadInquiries]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadInquiries(), 5000);
    return () => window.clearInterval(timer);
  }, [loadInquiries]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingMessages(true);
    loadMessages(selectedId)
      .then((page) => {
        if (!active) return;
        setMessages(page.messages);
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });
    return () => {
      active = false;
    };
  }, [loadMessages, selectedId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadOlderMessages = async () => {
    if (!selectedId || !nextBefore) return;
    try {
      const page = await loadMessages(selectedId, nextBefore);
      setMessages((current) => [...page.messages, ...current]);
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!selectedId || !content || sending) return;
    setSending(true);
    setError("");
    try {
      await apiClient.post(
          `/buyer/conversations/${encodeURIComponent(selectedId)}/messages`,
          { content, idempotencyKey: crypto.randomUUID() },
      );
      setDraft("");
      await Promise.all([refreshMessages(), loadInquiries()]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <p className="mb-2 text-xs text-slate-500">Buyer Account / Agent Inquiries</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Agent Inquiries</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Continue conversations about properties with their agents.</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}<button type="button" onClick={() => void loadInquiries()} className="ml-3 font-semibold underline">Retry</button></div>}
      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Conversations</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Refresh conversations" onClick={() => void loadInquiries()}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <div className="px-4 pb-3">
            <label htmlFor="buyer-inquiry-search" className="sr-only">Search conversations</label>
            <input id="buyer-inquiry-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search property or agent" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          {loadingList && items.length === 0 ? (
            <p role="status" className="p-6 text-center text-sm text-slate-500">Loading conversations…</p>
          ) : items.length ? (
            <ul className="max-h-[440px] space-y-1 overflow-y-auto p-2 lg:max-h-[620px]">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelectedId(item.id)} aria-current={selectedId === item.id ? "true" : undefined} className={`w-full rounded-xl p-3 text-left transition-colors ${selectedId === item.id ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <div className="flex gap-3">
                      {item.property.images?.[0] ? <img src={item.property.images[0]} alt="" className="h-12 w-14 rounded-lg object-cover" /> : <span className="flex h-12 w-14 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><Building2 className="h-5 w-5 text-slate-400" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.agent?.name || "Property agent"}</span>
                          {item.unreadMessages > 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">{item.unreadMessages}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{item.property.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">{item.latestMessagePreview || "Conversation started"}</span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : !error ? (
            <div className="px-6 py-10 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">No inquiries yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Start a conversation from a property detail page to contact an agent.</p>
            </div>
          ) : null}
        </aside>
        <div className="flex min-h-[420px] min-w-0 flex-col">
          {selected ? (
            <>
              <header className="border-b border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  {selected.property.images?.[0] && <img src={selected.property.images[0]} alt="" className="h-14 w-16 rounded-lg object-cover" />}
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-900 dark:text-white">{selected.property.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{selected.agent?.name || "Property agent"}{selected.agent?.agencyName ? ` · ${selected.agent.agencyName}` : ""}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{[selected.property.location?.area, selected.property.location?.city].filter(Boolean).join(", ")} · {formatPrice(selected.property.price)}</p>
                  </div>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                {hasMore && <div className="text-center"><Button type="button" variant="outline" size="sm" onClick={() => void loadOlderMessages()}>Load older messages</Button></div>}
                {loadingMessages ? <p role="status" className="py-12 text-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Loading messages…</p> : messages.length ? messages.map((message) => {
                  const isBuyer = message.senderType === "visitor" || message.senderType === "buyer";
                  return <div key={message.id} className={`flex ${isBuyer ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isBuyer ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}><p className="whitespace-pre-wrap break-words text-sm leading-5">{message.content}</p><time className={`mt-1 block text-[10px] ${isBuyer ? "text-emerald-100" : "text-slate-500"}`}>{formatTime(message.createdAt)}</time></div></div>;
                }) : <p className="py-12 text-center text-sm text-slate-500">Start the conversation with a message.</p>}
                <div ref={messagesEnd} />
              </div>
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:p-4">
                <label htmlFor="buyer-inquiry-message" className="sr-only">Message the agent</label>
                <textarea id="buyer-inquiry-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Write a message…" className="min-h-11 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                <Button type="submit" disabled={!draft.trim() || sending} className="self-end"><Send className="mr-2 h-4 w-4" />Send</Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageCircle className="h-9 w-9" />
              <p className="mt-3 text-sm">Select a conversation to view messages and reply.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
