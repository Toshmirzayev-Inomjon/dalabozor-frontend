"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Icon } from "@/components/icons";
import { getAIStatus, sendAIMessage, type AIAction, type AIHistoryMessage, type AIStatus } from "@/lib/ai-api";

const HISTORY_KEY_PREFIX = "dalabozor_ai_chat_v1";
const MAX_STORED_MESSAGES = 40;
const MAX_CONTEXT_MESSAGES = 16;
const MAX_CONTEXT_CHARS = 16_000;
const MAX_MESSAGE_LENGTH = 2_000;

type ActionState = "pending" | "running" | "done" | "dismissed" | "error";

type ChatMessage = AIHistoryMessage & {
  id: string;
  createdAt: string;
  action?: AIAction;
  actionState?: ActionState;
  actionError?: string;
};

type FailedRequest = {
  text: string;
  userMessageId: string;
};

type StatusPhase = "idle" | "loading" | "ready" | "error";

export type AIAssistantProps<Role extends string = string> = {
  userId: string;
  activeRole: Role;
  activeSection: string;
  allowedSections: readonly string[];
  onNavigate: (section: string) => void | Promise<void>;
};

const ROLE_LABELS: Record<string, string> = {
  farmer: "Dehqon",
  restaurant: "Restoran",
  collector: "Yig‘uvchi",
  admin: "Administrator",
};

const SECTION_LABELS: Record<string, string> = {
  overview: "Asosiy",
  "new-offer": "Mahsulot berish",
  offers: "E’lonlar",
  payments: "To‘lovlar",
  catalog: "Katalog",
  orders: "Buyurtmalar",
  history: "Qabul holati",
  profile: "Profil",
};

const ROLE_PROMPTS: Record<string, string[]> = {
  farmer: [
    "Bugungi narxlarni qayerdan ko‘raman?",
    "Mahsulot e’lonini qanday beraman?",
    "To‘lov qachon tushishini tushuntiring.",
  ],
  restaurant: [
    "Yangi buyurtma qanday beriladi?",
    "Katalogdagi narxlar nimani anglatadi?",
    "Buyurtmam holatini qayerdan ko‘raman?",
  ],
  collector: [
    "Bugungi marshrutni tushuntirib bering.",
    "Mahsulot qabulini qanday belgilayman?",
    "Bekatdagi muammo bo‘lsa nima qilaman?",
  ],
  admin: [
    "Bugungi ko‘rsatkichlarni tushuntirib bering.",
    "Tekshiruvdagi e’lonlar bilan nima qilaman?",
    "Taqsimlash jarayoni qanday ishlaydi?",
  ],
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  action?: AIAction,
): ChatMessage {
  return {
    id: createId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(action ? { action, actionState: "pending" as const } : {}),
  };
}

function buildContextHistory(
  source: ChatMessage[],
  currentMessageLength: number,
): AIHistoryMessage[] {
  let remainingChars = Math.max(0, MAX_CONTEXT_CHARS - currentMessageLength);
  const selected: AIHistoryMessage[] = [];

  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (selected.length >= MAX_CONTEXT_MESSAGES || remainingChars <= 0) break;
    const item = source[index];
    const content = item.content.slice(0, Math.min(4_000, remainingChars));
    if (!content) continue;
    selected.unshift({ role: item.role, content });
    remainingChars -= content.length;
  }

  return selected;
}

function loadStoredMessages(storageKey: string): ChatMessage[] {
  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => {
        if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
        return (
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim().length > 0
        );
      })
      .slice(-MAX_STORED_MESSAGES)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        role: item.role as ChatMessage["role"],
        content: (item.content as string).slice(0, 10_000),
        createdAt:
          typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role.replaceAll("_", " ");
}

function actionLabel(action: AIAction): string {
  return `“${SECTION_LABELS[action.value] || action.value}” bo‘limiga o‘tish`;
}

function LoadingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 120, 240].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/55"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export function AIAssistant<Role extends string = string>({
  userId,
  activeRole,
  activeSection,
  allowedSections,
  onNavigate,
}: AIAssistantProps<Role>) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedHistoryKey, setLoadedHistoryKey] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [statusPhase, setStatusPhase] = useState<StatusPhase>("idle");

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const statusAbortRef = useRef<AbortController | null>(null);

  const historyKey = useMemo(
    () => `${HISTORY_KEY_PREFIX}:${encodeURIComponent(userId)}`,
    [userId],
  );

  const quickPrompts = useMemo(() => {
    const pageLabel = SECTION_LABELS[activeSection] || activeSection;
    const contextual = `“${pageLabel}” sahifasini tushuntirib bering.`;
    const rolePrompts = ROLE_PROMPTS[activeRole] || [
      "DalaBozordan foydalanishni o‘rgating.",
      "Menga mavjud imkoniyatlarni ayting.",
    ];
    return [contextual, ...rolePrompts].slice(0, 3);
  }, [activeRole, activeSection]);

  const loadStatus = useCallback(async () => {
    statusAbortRef.current?.abort();
    const controller = new AbortController();
    statusAbortRef.current = controller;
    setStatusPhase("loading");
    setError("");
    try {
      const nextStatus = await getAIStatus(controller.signal);
      setStatus(nextStatus);
      setStatusPhase("ready");
    } catch (requestError: unknown) {
      if (controller.signal.aborted) return;
      setStatus({ chatAvailable: false });
      setStatusPhase("error");
      setError(errorMessage(requestError, "AI xizmatining holatini tekshirib bo‘lmadi."));
    }
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setMessages(loadStoredMessages(historyKey));
    setLoadedHistoryKey(historyKey);
    setFailedRequest(null);
    setError("");
  }, [historyKey]);

  useEffect(() => {
    if (loadedHistoryKey !== historyKey) return;
    try {
      const persisted = messages.slice(-MAX_STORED_MESSAGES).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }));
      window.localStorage.setItem(historyKey, JSON.stringify(persisted));
    } catch {
      // Maxfiy rejim yoki to‘lgan storage chatning o‘zini to‘xtatmasligi kerak.
    }
  }, [historyKey, loadedHistoryKey, messages]);

  useEffect(() => {
    if (open) void loadStatus();
  }, [loadStatus, open]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("[data-ai-initial-focus]")
        ?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAssistant();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [closeAssistant, open]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, sending]);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
      statusAbortRef.current?.abort();
    };
  }, []);

  async function askAI(rawText: string, existingUserMessageId?: string) {
    const text = rawText.trim();
    if (!text || sending || status?.chatAvailable !== true) return;

    const existingIndex = existingUserMessageId
      ? messages.findIndex((message) => message.id === existingUserMessageId)
      : -1;
    const historySource = existingIndex >= 0 ? messages.slice(0, existingIndex) : messages;
    const userMessage =
      existingIndex >= 0 ? messages[existingIndex] : createMessage("user", text);

    if (existingIndex < 0) setMessages((current) => [...current, userMessage]);
    setComposer("");
    setSending(true);
    setFailedRequest(null);
    setError("");

    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const result = await sendAIMessage({
        message: text,
        history: buildContextHistory(historySource, text.length),
        activeRole,
        activeSection,
        signal: controller.signal,
      });
      setMessages((current) => [
        ...current,
        createMessage("assistant", result.reply, result.action),
      ]);
    } catch (requestError: unknown) {
      if (controller.signal.aborted) return;
      setFailedRequest({ text, userMessageId: userMessage.id });
      setError(errorMessage(requestError, "AI javob bera olmadi. Qayta urinib ko‘ring."));
    } finally {
      if (chatAbortRef.current === controller) chatAbortRef.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAI(composer);
  }

  function actionAvailability(
    action: AIAction,
  ): { allowed: boolean; reason?: string } {
    if (action.type !== "navigate") {
      return { allowed: false, reason: "Bu amal endi mavjud emas." };
    }
    const safeSection = /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(action.value);
    if (!safeSection || !allowedSections.includes(action.value)) {
      return { allowed: false, reason: "Bu bo‘lim joriy kabinetda mavjud emas." };
    }
    return { allowed: true };
  }

  async function confirmAction(message: ChatMessage) {
    if (!message.action || message.actionState === "running" || message.actionState === "done") return;
    const availability = actionAvailability(message.action);
    if (!availability.allowed) {
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, actionState: "error", actionError: availability.reason }
            : item,
        ),
      );
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, actionState: "running", actionError: undefined }
          : item,
      ),
    );

    try {
      await onNavigate(message.action.value);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, actionState: "done" } : item,
        ),
      );
    } catch (actionError: unknown) {
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                actionState: "error",
                actionError: errorMessage(actionError, "Amalni bajarib bo‘lmadi."),
              }
            : item,
        ),
      );
    }
  }

  function dismissAction(messageId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, actionState: "dismissed" } : message,
      ),
    );
  }

  const chatAvailable = statusPhase === "ready" && status?.chatAvailable === true;
  const composerDisabled = !chatAvailable || sending;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="DalaYordamchi AI suhbatini ochish"
        className={`fixed bottom-[calc(5.8rem+env(safe-area-inset-bottom))] right-4 z-50 flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-gold px-4 text-white shadow-[0_18px_45px_rgba(14,61,40,.28)] transition hover:-translate-y-0.5 hover:bg-gold2 focus-visible:outline-white sm:right-6 lg:bottom-6 ${open ? "pointer-events-none scale-95 opacity-0" : ""}`}
      >
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/12 text-accent">
          <Icon name="leaf" className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-gold bg-accent" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[10px] font-extrabold uppercase tracking-[.13em] text-white/65">AI yordamchi</span>
          <span className="block text-sm font-extrabold">Savolingiz bormi?</span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-end bg-[#0E2E20]/30 p-0 backdrop-blur-[3px] sm:p-4 lg:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAssistant();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assistant-title"
            aria-describedby="ai-assistant-description"
            className="flex h-[min(92dvh,760px)] w-full min-w-0 flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-[#F8FAF5] shadow-[0_28px_90px_rgba(8,42,25,.24)] sm:h-[min(720px,calc(100dvh-2rem))] sm:max-w-[440px] sm:rounded-[28px]"
          >
            <header className="noise-panel shrink-0 px-4 pb-4 pt-4 text-white sm:px-5">
              <div className="flex items-center gap-3">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-accent ring-1 ring-white/10">
                  <Icon name="leaf" className="h-5 w-5" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gold2 bg-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="ai-assistant-title" className="font-head text-base font-extrabold">
                    DalaYordamchi
                  </h2>
                  <p id="ai-assistant-description" className="truncate text-xs text-white/65">
                    {roleLabel(activeRole)} · {SECTION_LABELS[activeSection] || activeSection}
                  </p>
                </div>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setFailedRequest(null);
                      setError("");
                    }}
                    className="rounded-xl px-2.5 py-2 text-xs font-bold text-white/65 hover:bg-white/10 hover:text-white"
                    aria-label="Suhbat tarixini tozalash"
                  >
                    Tozalash
                  </button>
                )}
                <button
                  type="button"
                  data-ai-initial-focus
                  onClick={closeAssistant}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/75 hover:bg-white/15 hover:text-white"
                  aria-label="AI yordamchini yopish"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 overflow-x-auto text-[10px] font-bold text-white/70">
                <span className="whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1.5">
                  {statusPhase === "loading" || statusPhase === "idle"
                    ? "Xizmat tekshirilmoqda…"
                    : status?.chatAvailable
                      ? "Matnli chat tayyor"
                      : "Chat vaqtincha o‘chiq"}
                </span>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
              {statusPhase === "loading" || statusPhase === "idle" ? (
                <div className="flex h-full min-h-52 flex-col items-center justify-center text-center" role="status">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-text">AI yordamchi tayyorlanmoqda</p>
                  <p className="mt-1 text-xs text-muted">Xizmatlar holatini tekshiryapmiz.</p>
                </div>
              ) : statusPhase === "error" || !status?.chatAvailable ? (
                <div className="flex h-full min-h-52 flex-col items-center justify-center px-4 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange/15 text-[#A45D12]">
                    <Icon name="refresh" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-extrabold text-text">AI hozir javob bera olmaydi</h3>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-muted">
                    {error || "Xizmat sozlanmoqda. Birozdan keyin qayta urinib ko‘ring."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadStatus()}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-xs font-bold text-text hover:border-gold/30"
                  >
                    <Icon name="refresh" className="h-4 w-4" /> Qayta tekshirish
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center">
                  <div className="mx-auto max-w-xs text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-gold/10 text-gold">
                      <Icon name="leaf" className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-head text-lg font-extrabold tracking-[-0.02em] text-text">
                      Sizga qanday yordam beray?
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted">
                      Saytdan foydalanish, buyurtma, e’lon yoki to‘lov haqida sodda tilda so‘rang.
                    </p>
                  </div>
                  <div className="mt-6 space-y-2" aria-label="Tezkor savollar">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void askAI(prompt)}
                        className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm font-bold leading-5 text-text shadow-[0_6px_18px_rgba(20,55,39,.035)] transition hover:border-gold/30 hover:bg-gold/[.025]"
                      >
                        <span>{prompt}</span>
                        <Icon name="arrow" className="h-4 w-4 shrink-0 text-gold transition group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const availability = message.action
                      ? actionAvailability(message.action)
                      : null;
                    return (
                      <div
                        key={message.id}
                        className={message.role === "user" ? "flex justify-end" : "flex items-start gap-2.5"}
                      >
                        {message.role === "assistant" && (
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold text-accent">
                            <Icon name="leaf" className="h-4 w-4" />
                          </span>
                        )}
                        <div className={`min-w-0 max-w-[84%] ${message.role === "user" ? "text-right" : ""}`}>
                          <div
                            className={`rounded-2xl px-3.5 py-3 text-left text-sm leading-6 shadow-sm ${
                              message.role === "user"
                                ? "rounded-br-md bg-gold text-white"
                                : "rounded-tl-md border border-line bg-white text-text"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>

                          {message.action && message.actionState !== "dismissed" && (
                            <div className="mt-2 overflow-hidden rounded-2xl border border-gold/20 bg-gold/[.055] text-left">
                              <div className="flex items-start gap-2.5 p-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-gold shadow-sm">
                                  <Icon
                                    name={message.actionState === "done" ? "check" : "shield"}
                                    className="h-4 w-4"
                                  />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-gold">
                                    {message.actionState === "done" ? "Amal bajarildi" : "Tasdiq kerak"}
                                  </p>
                                  <p className="mt-0.5 break-words text-xs font-bold leading-5 text-text">
                                    {actionLabel(message.action)}
                                  </p>
                                  <p className="mt-1 text-[11px] leading-4 text-muted">
                                    AI bu amalni sizning tasdig‘ingizsiz bajarmaydi.
                                  </p>
                                  {(!availability?.allowed || message.actionError) && message.actionState !== "done" && (
                                    <p className="mt-1.5 text-[11px] font-semibold leading-4 text-red" role="alert">
                                      {message.actionError || availability?.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {(message.actionState === "pending" || message.actionState === "error") && (
                                <div className="flex border-t border-gold/10">
                                  <button
                                    type="button"
                                    onClick={() => dismissAction(message.id)}
                                    className="min-h-10 flex-1 border-r border-gold/10 px-3 text-xs font-bold text-muted hover:bg-white/60"
                                  >
                                    Bekor qilish
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void confirmAction(message)}
                                    disabled={!availability?.allowed}
                                    className="min-h-10 flex-1 px-3 text-xs font-extrabold text-gold hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-45"
                                  >
                                    Tasdiqlash
                                  </button>
                                </div>
                              )}
                              {message.actionState === "running" && (
                                <div className="flex min-h-10 items-center justify-center gap-2 border-t border-gold/10 text-xs font-bold text-gold" role="status">
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                                  Bajarilmoqda…
                                </div>
                              )}
                            </div>
                          )}

                          <time className="mt-1 block px-1 text-[10px] text-dim" dateTime={message.createdAt}>
                            {formatTime(message.createdAt)}
                          </time>
                        </div>
                      </div>
                    );
                  })}

                  {sending && (
                    <div className="flex items-start gap-2.5" role="status" aria-label="AI javob yozmoqda">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold text-accent">
                        <Icon name="leaf" className="h-4 w-4" />
                      </span>
                      <div className="rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3.5 shadow-sm">
                        <LoadingDots />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {statusPhase === "ready" && status?.chatAvailable && (
              <footer className="shrink-0 border-t border-line bg-white px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-4">
                {error && (
                  <div className="mb-2.5 flex items-start justify-between gap-3 rounded-xl border border-red/15 bg-red/[.06] px-3 py-2 text-xs font-semibold leading-5 text-red" role="alert">
                    <span>{error}</span>
                    {failedRequest && (
                      <button
                        type="button"
                        onClick={() => void askAI(failedRequest.text, failedRequest.userMessageId)}
                        disabled={sending}
                        className="shrink-0 rounded-lg bg-white px-2 py-1 font-extrabold shadow-sm disabled:opacity-50"
                      >
                        Qayta urinish
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={submit} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 rounded-2xl border border-line bg-[#F8FAF5] px-3 py-2 transition focus-within:border-gold/45 focus-within:bg-white focus-within:ring-4 focus-within:ring-gold/[.06]">
                    <label htmlFor="ai-composer" className="sr-only">AI yordamchiga savol</label>
                    <textarea
                      ref={composerRef}
                      id="ai-composer"
                      data-ai-composer
                      rows={1}
                      maxLength={MAX_MESSAGE_LENGTH}
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          if (!composerDisabled && composer.trim()) void askAI(composer);
                        }
                      }}
                      disabled={composerDisabled}
                      placeholder="Savolingizni yozing…"
                      className="block max-h-28 min-h-7 w-full resize-none bg-transparent text-sm leading-6 text-text outline-none placeholder:text-dim disabled:cursor-not-allowed"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-dim">Enter — yuborish · Shift+Enter — yangi qator</span>
                      {composer.length > MAX_MESSAGE_LENGTH - 200 && (
                        <span className="text-[10px] font-bold text-muted">{composer.length}/{MAX_MESSAGE_LENGTH}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={composerDisabled || !composer.trim()}
                    aria-label="Savolni yuborish"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold text-white shadow-[0_8px_20px_rgba(23,92,58,.2)] transition hover:bg-gold2 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
                  >
                    {sending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    ) : (
                      <Icon name="arrow" className="h-5 w-5" />
                    )}
                  </button>
                </form>
                <p className="mt-2 px-1 text-center text-[10px] leading-4 text-dim">
                  Tarix faqat shu qurilmada, akkauntingiz uchun saqlanadi. AI xato qilishi mumkin; amallar faqat tasdiq bilan bajariladi.
                </p>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}
