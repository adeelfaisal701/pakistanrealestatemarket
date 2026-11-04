"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD, PANEL } from "@/lib/agent-ui";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface ConversationProperty {
  id: string;
  title: string;
  images: string[];
  location: { area: string; city: string };
  price: number;
  purpose: string;
  propertyType: string;
  areaSize: number;
  areaUnit: string;
  availability: string;
}

interface AgentConversation {
  id: string;
  propertyId: string;
  advertisementId: string;
  leadId: string;
  visitorName: string;
  status: string;
  latestMessagePreview: string;
  latestMessageSender: "visitor" | "buyer" | "agent" | null;
  lastMessageAt: string;
  unreadForAgent: number;
  property: ConversationProperty;
}

interface ConversationMessage {
  id: string;
  senderType: "visitor" | "buyer" | "agent";
  content: string;
  createdAt: string;
  readAt?: string | null;
  deliveryStatus: "sent";
}

interface MessagePage {
  messages: ConversationMessage[];
  hasMore: boolean;
  nextBefore: string | null;
}

const REFRESH_INTERVAL_MS = 4000;

function formatPrice(price: number) {
  return `PKR ${new Intl.NumberFormat("en-PK").format(price)}`;
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    available: "Available",
    sold: "Sold",
    rented: "Rented",
    reserved: "Reserved",
    unavailable: "Unavailable",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function PropertyConversationsInbox() {
  const initializedSelection = useRef(false);
  const accountVersion = useRef(0);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread">("all");
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [failedDraft, setFailedDraft] = useState<{ content: string; key: string } | null>(null);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );
  const visibleConversations = useMemo(
    () =>
      conversationFilter === "unread"
        ? conversations.filter((conversation) => conversation.unreadForAgent > 0)
        : conversations,
    [conversationFilter, conversations],
  );

  const loadConversations = useCallback(async () => {
    const requestVersion = accountVersion.current;
    setLoadingList(true);
    try {
      const response = await apiClient.get<ApiEnvelope<AgentConversation[]>>(
        "/messages/agent/conversations",
        { params: query.trim() ? { q: query.trim() } : undefined },
      );
      if (requestVersion !== accountVersion.current) return;
      setConversations(response.data.data);
      setSelectedId((current) => {
        const requestedId =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("conversation")
            : null;
        const nextId =
          requestedId ||
          current ||
          (!initializedSelection.current ? response.data.data[0]?.id : "");
        initializedSelection.current = true;
        return response.data.data.some((conversation) => conversation.id === nextId)
          ? nextId ?? ""
          : "";
      });
      setError("");
    } catch (requestError) {
      if (requestVersion === accountVersion.current) {
        setError(getApiErrorMessage(requestError));
      }
    } finally {
      if (requestVersion === accountVersion.current) setLoadingList(false);
    }
  }, [query]);

  const loadMessages = useCallback(
    async (conversationId: string, before?: string) => {
      const requestVersion = accountVersion.current;
      try {
        const response = await apiClient.get<ApiEnvelope<MessagePage>>(
          `/messages/agent/conversations/${encodeURIComponent(conversationId)}/messages`,
          { params: { limit: 30, ...(before ? { before } : {}) } },
        );
        return requestVersion === accountVersion.current
          ? response.data.data
          : null;
      } catch (requestError) {
        if (requestVersion !== accountVersion.current) return null;
        throw requestError;
      }
    },
    [],
  );

  const refreshSelectedMessages = useCallback(async () => {
    if (!selectedId) return;
    try {
      const page = await loadMessages(selectedId);
      if (!page) return;
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        page.messages.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
            left.id.localeCompare(right.id),
        );
      });
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }, [loadMessages, selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadConversations(), 250);
    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadConversations(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    const clearAccountState = () => {
      accountVersion.current += 1;
      initializedSelection.current = false;
      setConversations([]);
      setSelectedId("");
      setMessages([]);
      setHasMore(false);
      setNextBefore(null);
      setError("");
      setDraft("");
      setFailedDraft(null);
      setLoadingMessages(false);
      void loadConversations();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "auth_user" || event.key === "auth_token") {
        clearAccountState();
      }
    };

    window.addEventListener("estatepro:auth-changed", clearAccountState);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("estatepro:auth-changed", clearAccountState);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadConversations]);

  useEffect(() => {
    setMessages([]);
    if (!selectedId) return;
    setLoadingMessages(true);
    void loadMessages(selectedId)
      .then((page) => {
        if (!page) return;
        setMessages(page.messages);
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore);
        void loadConversations();
      })
      .catch((requestError: unknown) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoadingMessages(false));
    const timer = window.setInterval(
      () => void refreshSelectedMessages(),
      REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, refreshSelectedMessages, selectedId]);

  const chooseConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      next.searchParams.set("conversation", conversationId);
      window.history.replaceState({}, "", next);
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedId || !nextBefore || loadingMessages) return;
    setLoadingMessages(true);
    try {
      const page = await loadMessages(selectedId, nextBefore);
      if (!page) return;
      setMessages((current) => {
        const ids = new Set(current.map((message) => message.id));
        return [...page.messages.filter((message) => !ids.has(message.id)), ...current];
      });
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = async (content: string, idempotencyKey: string) => {
    if (!selectedId || sending || !content.trim()) return;
    const requestVersion = accountVersion.current;
    setSending(true);
    setError("");
    try {
      const response = await apiClient.post<ApiEnvelope<ConversationMessage>>(
        `/messages/agent/conversations/${encodeURIComponent(selectedId)}/messages`,
        { content: content.trim(), idempotencyKey },
      );
      if (requestVersion !== accountVersion.current) return;
      setMessages((current) =>
        current.some((message) => message.id === response.data.data.id)
          ? current
          : [...current, response.data.data],
      );
      setDraft("");
      setFailedDraft(null);
      await loadConversations();
    } catch (requestError) {
      if (requestVersion === accountVersion.current) {
        setFailedDraft({ content, key: idempotencyKey });
        setError(getApiErrorMessage(requestError));
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    void sendReply(draft.trim(), crypto.randomUUID());
  };

  return (
    <section className={cn(PANEL, "overflow-hidden")} aria-label="Client conversations">
      <header className="flex flex-col gap-3 border-b border-[#1a2a3f] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            Property Chats
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Visitor conversations are saved with their property and lead.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConversations()}
          disabled={loadingList}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-[#2a3d56] px-3 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loadingList && "animate-spin")} />
          Refresh
        </button>
      </header>

      <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <aside
          className={cn(
            "border-b border-[#1a2a3f] lg:border-b-0 lg:border-r",
            selectedId && "hidden lg:block",
          )}
          aria-label="Conversation list"
        >
          <div className="border-b border-[#1a2a3f] p-3">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search client or property"
                className={`${FIELD} min-h-10 pl-9`}
              />
            </label>
            <div className="mt-2 flex gap-2" role="group" aria-label="Filter conversations">
              {(["all", "unread"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={conversationFilter === filter}
                  onClick={() => setConversationFilter(filter)}
                  className={cn(
                    "min-h-8 rounded-full border px-3 text-xs font-semibold capitalize",
                    conversationFilter === filter
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-[#2a3d56] text-slate-400 hover:bg-white/5",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          {loadingList && conversations.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading conversations…
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <MessageCircle className="h-8 w-8 text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-slate-200">
                {conversationFilter === "unread"
                  ? "No unread conversations"
                  : conversations.length === 0
                    ? "No client chats yet"
                    : "No conversations match this search"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {conversationFilter === "unread"
                  ? "New client messages will be highlighted here."
                  : "New property conversations will appear here."}
              </p>
            </div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-[#17263a] overflow-y-auto lg:max-h-[680px]">
              {visibleConversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => chooseConversation(conversation.id)}
                    aria-current={selectedId === conversation.id ? "true" : undefined}
                    className={cn(
                      "w-full px-4 py-4 text-left transition-colors hover:bg-white/[0.04]",
                      selectedId === conversation.id && "bg-emerald-500/[0.08]",
                      conversation.unreadForAgent > 0 && "bg-emerald-500/[0.04]",
                    )}
                  >
                    <span className="flex items-start gap-3">
                      {conversation.property.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conversation.property.images[0]}
                          alt=""
                          className="h-12 w-14 shrink-0 rounded-lg bg-[#16243a] object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-[#16243a] text-slate-500">
                          <Building2 className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-100">
                            {conversation.visitorName}
                          </span>
                          {conversation.unreadForAgent > 0 && (
                            <span
                              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white"
                              aria-label={`${conversation.unreadForAgent} unread messages`}
                            >
                              {conversation.unreadForAgent > 99 ? "99+" : conversation.unreadForAgent}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {conversation.property.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {conversation.latestMessageSender === "visitor" || conversation.latestMessageSender === "buyer" ? "Client: " : "You: "}
                          {conversation.latestMessagePreview || "Conversation started"}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-500">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className={cn("flex min-h-[520px] flex-col", !selectedId && "hidden lg:flex")}>
          {error && (
            <p role="alert" className="border-b border-rose-900/50 bg-rose-950/25 px-4 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageCircle className="h-10 w-10 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                Select a conversation to view messages and reply.
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-start gap-3 border-b border-[#1a2a3f] p-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId("");
                    const next = new URL(window.location.href);
                    next.searchParams.delete("conversation");
                    window.history.replaceState({}, "", next);
                  }}
                  aria-label="Back to conversations"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a3d56] text-slate-300 lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {selected.property.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.property.images[0]}
                    alt=""
                    className="h-12 w-14 shrink-0 rounded-lg bg-[#16243a] object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-[#16243a] text-slate-500">
                    <Building2 className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-white">{selected.visitorName}</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{selected.property.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selected.property.location.area}, {selected.property.location.city}
                    </span>
                    <span>{formatPrice(selected.property.price)}</span>
                    <span className={selected.property.availability === "available" ? "text-emerald-300" : "text-amber-300"}>
                      {formatStatus(selected.property.availability)}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/agent/listings/${encodeURIComponent(selected.propertyId)}/edit`}
                  className="hidden min-h-9 items-center rounded-lg border border-[#2a3d56] px-3 text-xs font-semibold text-slate-300 hover:bg-white/5 sm:inline-flex"
                >
                  Property
                </Link>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#091321]/50 p-4" aria-live="polite">
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => void loadOlderMessages()}
                    disabled={loadingMessages}
                    className="mx-auto flex min-h-9 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    {loadingMessages ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Load older messages
                  </button>
                )}
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-400">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading message history…
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-500">No messages in this conversation yet.</p>
                ) : (
                  messages.map((message) => {
                    const agentMessage = message.senderType === "agent";
                    return (
                      <div key={message.id} className={cn("flex", agentMessage ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                          agentMessage
                            ? "rounded-br-md bg-emerald-600 text-white"
                            : "rounded-bl-md border border-[#263951] bg-[#111e2f] text-slate-100",
                        )}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                          <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", agentMessage ? "text-emerald-100" : "text-slate-500")}>
                            {formatTime(message.createdAt)}
                            {agentMessage && <span>{message.readAt ? "Read" : "Sent"}</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {error && failedDraft && (
                <button
                  type="button"
                  onClick={() => void sendReply(failedDraft.content, failedDraft.key)}
                  disabled={sending}
                  className="mx-4 mt-2 min-h-9 self-start rounded-lg border border-rose-800/60 px-3 text-xs font-semibold text-rose-200 hover:bg-rose-950/30 disabled:opacity-50"
                >
                  {sending ? "Retrying…" : "Retry sending"}
                </button>
              )}
              <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-[#1a2a3f] bg-[#0b1524] p-3">
                <label className="sr-only" htmlFor={`agent-reply-${selected.id}`}>Write a reply</label>
                <textarea
                  id={`agent-reply-${selected.id}`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Reply to the client…"
                  className="min-h-11 max-h-28 flex-1 resize-y rounded-xl border border-[#2a3d56] bg-[#08111e] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label={sending ? "Sending reply" : "Send reply"}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
