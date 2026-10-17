import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { ChevronDown, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { FAQ } from "@/lib/legal";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; text: string; failed?: boolean };

export default function Help() {
  const ask = useAction(api.help.ask);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, thinking]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    const history = messages.filter((m) => !m.failed).map(({ role, text }) => ({ role, text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const { reply } = await ask({ message: text, history });
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", failed: true, text: errorMessage(err, "The assistant is unavailable right now. The FAQ has most answers.") },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div>
      <PageHeader title="Help" subtitle="Answers to common questions, or ask the assistant." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {FAQ.map((group) => (
            <section key={group.topic}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{group.topic}</h2>
              <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
                {group.items.map((item) => (
                  <details key={item.q} className="group px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <Card className="flex h-[32rem] flex-col p-0 sm:p-0 lg:sticky lg:top-8">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Ask the assistant</h2>
            <p className="text-xs text-muted-foreground">AI answers can be wrong. For account issues, email support@studentloop.com.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Try “How does the delivery code work?” or “What happens if nobody accepts my order?”
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : m.failed
                        ? "rounded-bl-sm bg-danger-soft text-danger"
                        : "rounded-bl-sm bg-subtle",
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {thinking && <p className="text-sm text-muted-foreground">Thinking…</p>}
            <div ref={end} />
          </div>

          <form onSubmit={(e) => void send(e)} className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question"
              aria-label="Your question"
              maxLength={500}
              disabled={thinking}
            />
            <Button type="submit" aria-label="Send" disabled={!input.trim() || thinking}>
              <Send className="size-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
