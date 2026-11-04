"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface ConversationProperty {
  id: string;
  title: string;
  images: string[];
  location: { area: string; city: string };
  price: number;
  status?: string;
  availability: string;
}

interface PropertyConversation {
  id: string;
  visitorName: string;
  property: ConversationProperty;
  agent?: { name?: string; agencyName?: string };
  unreadForVisitor: number;
}

interface ConversationMessage {
  id: string;
  senderType: "visitor" | "agent";
  content: string;
  createdAt: string;
  readAt?: string | null;
  deliveryStatus: "sent";
}

interface MessagesPage {
  messages: ConversationMessage[];
  hasMore: boolean;
  nextBefore: string | null;
}

interface PropertyConversationChatProps {
  propertyId: string;
  propertyTitle: string;
  coverImage?: string;
  location: string;
  price: number;
  availability: string;
  disabled?: boolean;
  buttonLabel?: string;
}

function getSessionStorageKey(propertyId: string) {
  return `estatepro.visitor-chat-session.v2.${propertyId}`;
}
const POLL_INTERVAL_MS = 3000;

function getConversationStorageKey(propertyId: string) {
  return `estatepro.visitor-chat.${propertyId}.conversation`;
}

function formatAvailability(status: string) {
  const labels: Record<string, string> = {
    available: "Available",
    sold: "Sold",
    rented: "Rented",
    reserved: "Reserved",
    unavailable: "Unavailable",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function formatPrice(price: number) {
  return `PKR ${new Intl.NumberFormat("en-PK").format(price)}`;
}

export function PropertyConversationChat({
  propertyId,
  propertyTitle,
  coverImage,
  location,
  price,
  availability,
  disabled = false,
  buttonLabel,
}: PropertyConversationChatProps) {
  const [open, setOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [conversation, setConversation] = useState<PropertyConversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveAvailability, setLiveAvailability] = useState(availability);
  const [canStartConversation, setCanStartConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [failedDraft, setFailedDraft] = useState<{ content: string; key: string } | null>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const scrollToBottomAfterLoad = useRef(true);

  const withVisitorHeader = useCallback(
    (token = sessionToken) => ({ headers: { "X-Visitor-Session": token } }),
    [sessionToken],
  );

  const fetchMessages = useCallback(
    async (conversationId: string, before?: string) => {
      const response = await apiClient.get<ApiEnvelope<MessagesPage>>(
        `/messages/visitor/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          ...withVisitorHeader(),
          params: { limit: 30, ...(before ? { before } : {}) },
        },
      );
      return response.data.data;
    },
    [withVisitorHeader],
  );

  const loadExistingConversation = useCallback(
    async (conversationId: string, token: string) => {
      const [conversationResponse, messagePage] = await Promise.all([
        apiClient.get<ApiEnvelope<PropertyConversation>>(
          `/messages/visitor/conversations/${encodeURIComponent(conversationId)}`,
          withVisitorHeader(token),
        ),
        apiClient.get<ApiEnvelope<MessagesPage>>(
          `/messages/visitor/conversations/${encodeURIComponent(conversationId)}/messages`,
          { ...withVisitorHeader(token), params: { limit: 30 } },
        ),
      ]);
      setConversation(conversationResponse.data.data);
      setMessages(messagePage.data.data.messages);
      setHasMore(messagePage.data.data.hasMore);
      setNextBefore(messagePage.data.data.nextBefore);
      scrollToBottomAfterLoad.current = true;
    },
    [withVisitorHeader],
  );

  const openChat = async () => {
    setOpen(true);
    setError("");
    setLoading(true);
    setCanStartConversation(false);
    try {
      const conversationId = localStorage.getItem(
        getConversationStorageKey(propertyId),
      );
      if (!conversationId) {
        const propertyResponse = await apiClient.get<
          ApiEnvelope<{ availabilityStatus?: string }>
        >(`/properties/${encodeURIComponent(propertyId)}`);
        const currentStatus = propertyResponse.data.data.availabilityStatus;
        if (!currentStatus) {
          throw new Error("The property's current availability could not be verified.");
        }
        setLiveAvailability(currentStatus);
        if (currentStatus !== "available") {
          setError(
            `This property is ${formatAvailability(currentStatus)} and is not accepting new chats. Browse current listings to find an available property.`,
          );
          return;
        }
        setCanStartConversation(true);
      }

      const sessionStorageKey = getSessionStorageKey(propertyId);
      let token = localStorage.getItem(sessionStorageKey) ?? "";
      if (!token) {
        const response = await apiClient.post<
          ApiEnvelope<{ visitorSessionToken: string }>
        >("/messages/visitor-session", { propertyId });
        token = response.data.data.visitorSessionToken;
        if (!/^[0-9a-f]{64}$/i.test(token)) {
          throw new Error("The server returned an invalid visitor session.");
        }
        localStorage.setItem(sessionStorageKey, token);
      }
      setSessionToken(token);
      if (conversationId) {
        try {
          await loadExistingConversation(conversationId, token);
        } catch (requestError) {
          const status = (
            requestError as { response?: { status?: number } }
          )?.response?.status;
          if (status === 404) {
            localStorage.removeItem(getConversationStorageKey(propertyId));
            const propertyResponse = await apiClient.get<
              ApiEnvelope<{ availabilityStatus?: string }>
            >(`/properties/${encodeURIComponent(propertyId)}`);
            const currentStatus = propertyResponse.data.data.availabilityStatus;
            if (!currentStatus) {
              throw new Error("The property's current availability could not be verified.");
            }
            setLiveAvailability(currentStatus);
            setCanStartConversation(currentStatus === "available");
            setError(
              currentStatus === "available"
                ? "This saved chat is no longer available. You can start a new conversation."
                : `This property is ${formatAvailability(currentStatus)} and is not accepting new chats.`,
            );
          } else if (status === 401) {
            localStorage.removeItem(sessionStorageKey);
            localStorage.removeItem(getConversationStorageKey(propertyId));
            setSessionToken("");
            setConversation(null);
            setMessages([]);
            const propertyResponse = await apiClient.get<
              ApiEnvelope<{ availabilityStatus?: string }>
            >(`/properties/${encodeURIComponent(propertyId)}`);
            const currentStatus = propertyResponse.data.data.availabilityStatus;
            if (!currentStatus) {
              throw new Error("The property's current availability could not be verified.");
            }
            setLiveAvailability(currentStatus);
            setCanStartConversation(currentStatus === "available");
            setError(
              currentStatus === "available"
                ? "Your chat session expired. Start a new conversation to continue."
                : `This property is ${formatAvailability(currentStatus)} and is not accepting new chats.`,
            );
          } else {
            throw requestError;
          }
        }
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStarting(true);
    setError("");
    try {
      const sessionStorageKey = getSessionStorageKey(propertyId);
      let token = sessionToken || localStorage.getItem(sessionStorageKey) || "";
      if (!token) {
        const sessionResponse = await apiClient.post<
          ApiEnvelope<{ visitorSessionToken: string }>
        >("/messages/visitor-session", { propertyId });
        token = sessionResponse.data.data.visitorSessionToken;
        localStorage.setItem(sessionStorageKey, token);
        setSessionToken(token);
      }
      const response = await apiClient.post<ApiEnvelope<PropertyConversation>>(
        `/messages/properties/${encodeURIComponent(propertyId)}/conversation`,
        {
          visitorName: visitorName.trim(),
          ...(visitorEmail.trim() ? { visitorEmail: visitorEmail.trim() } : {}),
          ...(visitorPhone.trim() ? { visitorPhone: visitorPhone.trim() } : {}),
        },
        { headers: { "X-Visitor-Session": token } },
      );
      const savedConversation = response.data.data;
      setConversation(savedConversation);
      localStorage.setItem(
        getConversationStorageKey(propertyId),
        savedConversation.id,
      );
      setMessages([]);
      setHasMore(false);
      setNextBefore(null);
      scrollToBottomAfterLoad.current = true;
    } catch (requestError) {
      const status = (
        requestError as { response?: { status?: number } }
      )?.response?.status;
      if (status === 401) {
        localStorage.removeItem(getSessionStorageKey(propertyId));
        localStorage.removeItem(getConversationStorageKey(propertyId));
        setSessionToken("");
        setConversation(null);
        setMessages([]);
        setCanStartConversation(true);
        setError("Your chat session expired. Reopen this chat to start a new conversation.");
      } else {
        setError(getApiErrorMessage(requestError));
      }
    } finally {
      setStarting(false);
    }
  };

  const refreshMessages = useCallback(async () => {
    if (!conversation || !sessionToken) return;
    try {
      const [messagePage, conversationResponse] = await Promise.all([
        fetchMessages(conversation.id),
        apiClient.get<ApiEnvelope<PropertyConversation>>(
          `/messages/visitor/conversations/${encodeURIComponent(conversation.id)}`,
          withVisitorHeader(),
        ),
      ]);
      const byId = new Map(
        messages.map((message) => [message.id, message]),
      );
      messagePage.messages.forEach((message) => byId.set(message.id, message));
      setMessages(
        [...byId.values()].sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
            left.id.localeCompare(right.id),
        ),
      );
      setConversation(conversationResponse.data.data);
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }, [conversation, fetchMessages, messages, sessionToken, withVisitorHeader]);

  useEffect(() => {
    if (!open || !conversation || !sessionToken) return;
    void refreshMessages();
    const timer = window.setInterval(() => void refreshMessages(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [conversation, open, refreshMessages, sessionToken]);

  useEffect(() => {
    if (!scrollToBottomAfterLoad.current) return;
    const container = scrollContainer.current;
    if (container) container.scrollTop = container.scrollHeight;
    scrollToBottomAfterLoad.current = false;
  }, [messages, open]);

  const loadOlderMessages = async () => {
    if (!conversation || !nextBefore || loading) return;
    setLoading(true);
    setError("");
    try {
      const page = await fetchMessages(conversation.id, nextBefore);
      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id));
        return [...page.messages.filter((message) => !existingIds.has(message.id)), ...current];
      });
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = async (content: string, idempotencyKey: string) => {
    if (!conversation || sending) return;
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    setSending(true);
    setError("");
    try {
      const response = await apiClient.post<ApiEnvelope<ConversationMessage>>(
        `/messages/visitor/conversations/${encodeURIComponent(conversation.id)}/messages`,
        { content: trimmedContent, idempotencyKey },
        withVisitorHeader(),
      );
      setMessages((current) => {
        if (current.some((message) => message.id === response.data.data.id)) return current;
        return [...current, response.data.data];
      });
      setDraft("");
      setFailedDraft(null);
      scrollToBottomAfterLoad.current = true;
    } catch (requestError) {
      setFailedDraft({ content: trimmedContent, key: idempotencyKey });
      setError(getApiErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    void submitMessage(draft.trim(), crypto.randomUUID());
  };

  const property = conversation?.property;
  const currentAvailability = property?.availability ?? liveAvailability;
  const unavailable = currentAvailability !== "available";
  const canStartNewConversation = canStartConversation && !unavailable;

  return (
    <>
      <button
        type="button"
        onClick={() => void openChat()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <MessageCircle className="h-4 w-4" />
        {buttonLabel ?? (unavailable || disabled ? "Chat about this property" : "Chat with Agent")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`property-chat-title-${propertyId}`}
            className="flex h-[min(760px,94dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl"
          >
            <header className="flex items-start gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt=""
                  className="h-14 w-16 shrink-0 rounded-lg bg-slate-100 object-cover dark:bg-slate-800"
                />
              ) : (
                <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <Building2Icon />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2
                  id={`property-chat-title-${propertyId}`}
                  className="truncate text-sm font-bold text-slate-900 dark:text-white"
                >
                  {conversation?.agent?.name
                    ? `Chat with ${conversation.agent.name}`
                    : "Chat with Agent"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                  {property?.title ?? propertyTitle}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {property?.location
                    ? `${property.location.area}, ${property.location.city}`
                    : location}{" "}
                  · {formatPrice(property?.price ?? price)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/50">
              <span className="text-slate-500">Property availability:</span>{" "}
              <span className={`font-semibold ${unavailable ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                {formatAvailability(currentAvailability)}
              </span>
              {unavailable && (
                <p className="mt-1 text-slate-500">
                  This property is no longer available. You can ask the agent about similar properties.
                </p>
              )}
            </div>

            {loading && !conversation ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Opening your secure chat…
              </div>
            ) : conversation ? (
              <>
                <div
                  ref={scrollContainer}
                  className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/30"
                  aria-live="polite"
                  aria-label="Chat messages"
                >
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => void loadOlderMessages()}
                      disabled={loading}
                      className="mx-auto flex min-h-9 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    >
                      {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      Load older messages
                    </button>
                  )}
                  {messages.length === 0 && (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
                      <MessageCircle className="h-8 w-8 text-emerald-500" />
                      <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
                        Start the conversation
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Ask the agent about this property. Replies will appear here.
                      </p>
                    </div>
                  )}
                  {messages.map((message) => {
                    const ownMessage = message.senderType === "visitor";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                            ownMessage
                              ? "rounded-br-md bg-emerald-600 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${ownMessage ? "text-emerald-100" : "text-slate-500"}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {ownMessage && <Check className="h-3 w-3" aria-label="Sent" />}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {error && (
                  <p role="alert" className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    {error}
                  </p>
                )}
                {failedDraft && (
                  <button
                    type="button"
                    onClick={() =>
                      void submitMessage(failedDraft.content, failedDraft.key)
                    }
                    disabled={sending}
                    className="mx-4 mb-2 min-h-9 rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300"
                  >
                    {sending ? "Retrying…" : "Retry sending"}
                  </button>
                )}
                <form
                  onSubmit={sendMessage}
                  className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <label className="sr-only" htmlFor={`property-chat-message-${propertyId}`}>
                    Write a message
                  </label>
                  <textarea
                    id={`property-chat-message-${propertyId}`}
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
                    placeholder="Write a message…"
                    className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={sending ? "Sending message" : "Send message"}
                  >
                    {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </>
            ) : !canStartNewConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <p role={error ? "alert" : "status"} className="text-sm text-slate-600 dark:text-slate-300">
                  {error || "This property is no longer accepting new chats."}
                </p>
                <a
                  href="/properties"
                  className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Browse available properties
                </a>
              </div>
            ) : (
              <form onSubmit={(event) => void startConversation(event)} className="space-y-4 overflow-y-auto p-5">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Start a private conversation
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Enter your name so the agent knows who is contacting them. Contact details are optional.
                  </p>
                </div>
                {error && (
                  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    {error}
                  </p>
                )}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Your name</span>
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={visitorName}
                    onChange={(event) => setVisitorName(event.target.value)}
                    autoComplete="name"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Email <span className="font-normal text-slate-500">(optional)</span>
                  </span>
                  <input
                    type="email"
                    maxLength={254}
                    value={visitorEmail}
                    onChange={(event) => setVisitorEmail(event.target.value)}
                    autoComplete="email"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Phone <span className="font-normal text-slate-500">(optional)</span>
                  </span>
                  <input
                    type="tel"
                    maxLength={16}
                    value={visitorPhone}
                    onChange={(event) => setVisitorPhone(event.target.value)}
                    autoComplete="tel"
                    placeholder="+923001234567"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={starting || visitorName.trim().length < 2}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {starting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {starting ? "Starting chat…" : "Start chat"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Building2Icon() {
  return <MessageCircle className="h-6 w-6" aria-hidden="true" />;
}
