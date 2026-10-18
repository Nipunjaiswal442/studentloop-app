import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAction, useQuery } from "convex/react";
import { ChevronDown, MessageCircleQuestion, RotateCcw, Send, Sparkles, SquarePen } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { MAX_HISTORY_TURNS, MAX_MESSAGE_CHARS } from "../../convex/lib/assistant";
import { FAQ, SUPPORT_EMAIL } from "../../convex/lib/knowledge";
import { Button, Card, Input, PageHeader, Skeleton } from "@/components/ui";
import { isActive } from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "assistant"; text: string; failed?: boolean };

const SUGGESTIONS = [
  "How does the delivery code work?",
  "What if nobody accepts my order?",
  "How do I start delivering and earning?",
  "How do I add money to my wallet?",
  "How do I put StudentLoop on my home screen?",
];

// Tall enough for a conversation, short enough that the question box clears
// the phone tab bar without scrolling.
const CHAT_HEIGHT = "h-[min(38rem,calc(100dvh-14rem))] min-h-[24rem]";

export default function Help() {
  const status = useQuery(api.help.status);
  const off = status?.available === false;

  return (
    <div>
      <PageHeader title="Help" subtitle="Ask the assistant, or browse the common questions." />

      {/* Chat first on phones; on wide screens it sits beside the questions. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-6">
        {status === undefined ? (
          <Skeleton className={cn(CHAT_HEIGHT, "lg:col-start-2 lg:row-start-1")} />
        ) : off ? (
          <AssistantOff className="lg:col-span-2" />
        ) : (
          <Chat className="lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1" />
        )}
        <Faq wide={off} className={off ? "lg:col-span-2" : "lg:col-start-1 lg:row-start-1"} />
      </div>
    </div>
  );
}

function AssistantOff({ className }: { className?: string }) {
  return (
    <Card className={cn("flex items-start gap-3", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-muted-foreground">
        <MessageCircleQuestion className="size-[18px]" aria-hidden />
      </span>
      <div>
        <h2 className="font-semibold">Ask the assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The assistant isn't switched on yet. The answers below cover the common questions.
        </p>
      </div>
    </Card>
  );
}

function Faq({ wide, className }: { wide: boolean; className?: string }) {
  return (
    <div className={className}>
      <h2 className="mb-4 text-lg font-semibold">Common questions</h2>
      <div className={cn("space-y-6", wide && "lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0")}>
        {FAQ.map((group) => (
          <section key={group.topic}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{group.topic}</h3>
            <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
              {group.items.map((item) => (
                <details key={item.q} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Still stuck? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}

/* ───────────── Chat ───────────── */

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// sessionStorage can be missing or full (private mode, quotas): the chat then
// simply isn't kept, it still works.
function loadChat(key: string): Message[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message =>
        typeof m === "object" &&
        m !== null &&
        typeof m.id === "string" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.text === "string",
    );
  } catch {
    return [];
  }
}

function saveChat(key: string, messages: Message[]) {
  try {
    if (messages.length) sessionStorage.setItem(key, JSON.stringify(messages.slice(-40)));
    else sessionStorage.removeItem(key);
  } catch {
    // Not kept for this tab; nothing else depends on it.
  }
}

/** The answered turns, as the server wants them: failed replies and their questions are left out. */
function historyOf(list: Message[]) {
  const turns: { role: "user" | "assistant"; text: string }[] = [];
  list.forEach((m, i) => {
    const next = list[i + 1];
    if (m.failed || (m.role === "user" && (next?.role !== "assistant" || next.failed))) return;
    turns.push({ role: m.role, text: m.text });
  });
  return turns.slice(-MAX_HISTORY_TURNS);
}

function Chat({ className }: { className?: string }) {
  const me = useMe();
  const ask = useAction(api.help.ask);
  const requested = useQuery(api.deliveries.listRequested);
  const key = `sl_help_chat_${me.id}`;
  const [messages, setMessages] = useState<Message[]>(() => loadChat(key));
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);
  const opened = useRef(false);

  useEffect(() => saveChat(key, messages), [key, messages]);

  // Keep the newest message in view by scrolling the conversation, never the
  // page: jump there when the page opens, glide for new messages. An empty
  // chat starts at the top so the greeting isn't cut off.
  useEffect(() => {
    const el = log.current;
    if (!el) return;
    if (messages.length === 0) {
      el.scrollTop = 0;
      return;
    }
    const glide = opened.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    opened.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: glide ? "smooth" : "auto" });
  }, [messages, pending]);

  // The field is disabled while waiting, which drops focus. Give it back to
  // keyboard users; on touch screens that would pop the keyboard over the answer.
  useEffect(() => {
    if (!pending && refocus.current) {
      refocus.current = false;
      field.current?.focus();
    }
  }, [pending]);

  async function run(question: string, before: Message[]) {
    setPending(true);
    try {
      const { reply } = await ask({ message: question, history: historyOf(before) });
      setMessages((m) => [...m, { id: newId(), role: "assistant", text: reply }]);
    } catch (err) {
      const text = errorMessage(err, "The assistant couldn't answer just now. Please try again.");
      setMessages((m) => [...m, { id: newId(), role: "assistant", text, failed: true }]);
    } finally {
      setPending(false);
    }
  }

  function send(text: string, fromField = false) {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || pending) return;
    refocus.current = fromField && window.matchMedia("(pointer: fine)").matches;
    setMessages([...messages, { id: newId(), role: "user", text: question }]);
    setInput("");
    void run(question, messages);
  }

  /** Asks the last question again: after a failed reply, or one that never came back. */
  function retry() {
    const last = messages[messages.length - 1];
    const at = last?.failed ? messages.length - 2 : messages.length - 1;
    const question = messages[at];
    if (pending || question?.role !== "user") return;
    setMessages(messages.slice(0, at + 1));
    void run(question.text, messages.slice(0, at));
  }

  function newChat() {
    setMessages([]);
    setInput("");
    if (window.matchMedia("(pointer: fine)").matches) field.current?.focus();
  }

  const last = messages[messages.length - 1];
  const unanswered = !pending && last?.role === "user";
  const hasActiveOrder = requested?.some((r) => isActive(r.status)) ?? false;
  const suggestions = hasActiveOrder ? ["What's happening with my order?", ...SUGGESTIONS] : SUGGESTIONS;

  return (
    <Card className={cn("flex flex-col p-0 sm:p-0", CHAT_HEIGHT, className)}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <BotMark className="size-9" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Ask the assistant</h2>
          <p className="text-xs text-muted-foreground">AI can make mistakes, and it can't change your account.</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-2.5"
            onClick={newChat}
            disabled={pending}
            title="New chat"
          >
            <SquarePen className="size-4" aria-hidden />
            {/* Icon only on phones, where the header is tight. */}
            <span className="sr-only sm:not-sr-only">New chat</span>
          </Button>
        )}
      </div>

      <div
        ref={log}
        role="log"
        aria-label="Conversation with the assistant"
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center gap-5 py-2">
            <div>
              <p className="font-medium">Hi{me.firstName ? ` ${me.firstName}` : ""}! How can I help?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask about orders, deliveries, your wallet or your account. I can see how your active orders are
                doing, too.
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Try asking</p>
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-control bg-card px-3.5 py-1.5 text-left text-sm text-foreground transition-colors hover:border-primary/60 hover:bg-primary-soft hover:text-primary-soft-foreground"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-2">
                <BotMark className="mt-0.5 size-7" />
                <div className="min-w-0 max-w-[85%]">
                  <div
                    className={cn(
                      "break-words rounded-2xl rounded-tl-md px-3.5 py-2 text-sm",
                      m.failed ? "bg-danger-soft text-danger" : "bg-subtle text-foreground",
                    )}
                  >
                    {m.failed ? m.text : <Formatted text={m.text} />}
                  </div>
                  {m.failed && i === messages.length - 1 && !pending && (
                    <Button variant="secondary" size="sm" className="mt-2" onClick={retry}>
                      <RotateCcw className="size-4" aria-hidden />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ),
          )
        )}

        {unanswered && (
          <div className="flex items-center gap-3 pl-9 text-sm text-muted-foreground">
            No answer yet.
            <Button variant="secondary" size="sm" onClick={retry}>
              <RotateCcw className="size-4" aria-hidden />
              Retry
            </Button>
          </div>
        )}
        {pending && <Typing />}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input, true);
        }}
        className="border-t border-border p-3"
      >
        {input.length > MAX_MESSAGE_CHARS - 100 && (
          <p className="tabular mb-1.5 text-right text-xs text-muted-foreground">
            {input.length}/{MAX_MESSAGE_CHARS}
          </p>
        )}
        <div className="flex gap-2">
          <Input
            ref={field}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pending ? "Waiting for the answer…" : "Type your question"}
            aria-label="Your question"
            maxLength={MAX_MESSAGE_CHARS}
            enterKeyHint="send"
            autoComplete="off"
            disabled={pending}
          />
          <Button type="submit" aria-label="Send" className="w-10 shrink-0 px-0" disabled={!input.trim() || pending}>
            <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BotMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-foreground", className)}
    >
      <Sparkles className="size-[45%]" />
    </span>
  );
}

/** Three bouncing dots. Animated in script so reduced motion can leave them still. */
function Typing() {
  const dots = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const running = dots.current.map((dot, i) =>
      dot?.animate(
        [
          { transform: "translateY(0)", opacity: 0.45 },
          { transform: "translateY(-4px)", opacity: 1 },
          { transform: "translateY(0)", opacity: 0.45 },
        ],
        { duration: 900, delay: i * 150, iterations: Infinity, easing: "ease-in-out" },
      ),
    );
    return () => running.forEach((a) => a?.cancel());
  }, []);

  return (
    <div className="flex items-start gap-2" role="status">
      <BotMark className="mt-0.5 size-7" />
      <div className="flex h-9 items-center gap-1.5 rounded-2xl rounded-tl-md bg-subtle px-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            ref={(el) => {
              dots.current[i] = el;
            }}
            aria-hidden
            className="size-2 rounded-full bg-muted-foreground"
          />
        ))}
        <span className="sr-only">The assistant is typing</span>
      </div>
    </div>
  );
}

/* ───────────── Reply formatting ───────────── */

/** **bold** inside a line; everything else stays plain text. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part.replace(/`/g, "")
    ),
  );
}

/**
 * Renders the light formatting the assistant is asked to use: paragraphs,
 * "- " and "1. " lists and **bold**. Built from elements, never from HTML.
 */
function Formatted({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let lines: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!lines.length) return;
    const body = lines;
    blocks.push(
      <p key={blocks.length}>
        {body.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {inline(line)}
          </span>
        ))}
      </p>,
    );
    lines = [];
  };
  const flushList = () => {
    if (!list) return;
    const { ordered, start, items } = list;
    const children = items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      ordered ? (
        <ol key={blocks.length} start={start} className="list-decimal space-y-1 pl-5">
          {children}
        </ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {children}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const numbered = /^(\d+)[.)]\s+(.+)$/.exec(line);
    const item = numbered ? numbered[2] : /^[-*•]\s+(.+)$/.exec(line)?.[1];
    if (item) {
      flushParagraph();
      const ordered = numbered !== null;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, start: numbered ? Number(numbered[1]) : 1, items: [] };
      list.items.push(item);
    } else if (!line) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      lines.push(line.replace(/^#{1,6}\s+/, ""));
    }
  }
  flushParagraph();
  flushList();
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
