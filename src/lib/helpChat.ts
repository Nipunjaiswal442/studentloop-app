import { useSyncExternalStore } from "react";
import { MAX_HISTORY_TURNS, MAX_MESSAGE_CHARS } from "../../convex/lib/assistant";
import { errorMessage } from "./errors";

// Each person's help chat, kept outside the Help page so a reply that comes
// back after they've moved on still lands, and returning to Help mid-question
// shows the answer on its way instead of offering to ask again.

export type Message = { id: string; role: "user" | "assistant"; text: string; failed?: boolean };
type Turn = { role: "user" | "assistant"; text: string };
/** The help.ask action. */
export type Ask = (args: { message: string; history: Turn[] }) => Promise<{ reply: string }>;

export type HelpChat = {
  messages: Message[];
  /** Id of the question being answered right now, if any. */
  asking: string | null;
  /** Whether sessionStorage holds this chat. */
  stored: boolean;
};

const KEY_PREFIX = "sl_help_chat_";
const KEPT = 40;
const chats = new Map<string, HelpChat>();
const listeners = new Set<() => void>();

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// sessionStorage can be missing or full (private mode, quotas): the chat then
// simply isn't kept across reloads, it still works.
function load(userId: string): Message[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY_PREFIX + userId) ?? "[]");
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

function save(userId: string, messages: Message[]): boolean {
  try {
    if (!messages.length) {
      sessionStorage.removeItem(KEY_PREFIX + userId);
      return false;
    }
    sessionStorage.setItem(KEY_PREFIX + userId, JSON.stringify(messages.slice(-KEPT)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Signing out deletes the stored chats. A chat whose key has gone since it was
 * saved belongs to a session that ended: start afresh instead of writing it back.
 */
function wiped(userId: string, chat: HelpChat) {
  try {
    return chat.stored && sessionStorage.getItem(KEY_PREFIX + userId) === null;
  } catch {
    return false;
  }
}

export function getHelpChat(userId: string): HelpChat {
  let chat = chats.get(userId);
  if (!chat || wiped(userId, chat)) {
    const messages = load(userId);
    chat = { messages, asking: null, stored: messages.length > 0 };
    chats.set(userId, chat);
  }
  return chat;
}

function update(userId: string, change: Partial<Pick<HelpChat, "messages" | "asking">>) {
  const chat = { ...getHelpChat(userId), ...change };
  if (change.messages) chat.stored = save(userId, change.messages);
  chats.set(userId, chat);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHelpChat(userId: string): HelpChat {
  return useSyncExternalStore(subscribe, () => getHelpChat(userId));
}

/** The answered turns, as the server wants them: failed replies and their questions are left out. */
function historyOf(list: Message[]): Turn[] {
  const turns: Turn[] = [];
  list.forEach((m, i) => {
    const next = list[i + 1];
    if (m.failed || (m.role === "user" && (next?.role !== "assistant" || next.failed))) return;
    turns.push({ role: m.role, text: m.text });
  });
  return turns.slice(-MAX_HISTORY_TURNS);
}

async function answer(userId: string, ask: Ask, question: Message, before: Message[]) {
  let reply: Message;
  try {
    const { reply: text } = await ask({ message: question.text, history: historyOf(before) });
    reply = { id: newId(), role: "assistant", text };
  } catch (err) {
    const text = errorMessage(err, "The assistant couldn't answer just now. Please try again.");
    reply = { id: newId(), role: "assistant", text, failed: true };
  }
  const chat = getHelpChat(userId);
  // The chat was cleared while this was on its way.
  if (chat.asking !== question.id) return;
  update(userId, { messages: [...chat.messages, reply], asking: null });
}

/** Sends a question. False when there's nothing to send or another question is still being answered. */
export function sendHelpQuestion(userId: string, ask: Ask, text: string): boolean {
  const { messages, asking } = getHelpChat(userId);
  const question: Message = { id: newId(), role: "user", text: text.trim().slice(0, MAX_MESSAGE_CHARS) };
  if (!question.text || asking) return false;
  update(userId, { messages: [...messages, question], asking: question.id });
  void answer(userId, ask, question, messages);
  return true;
}

/** Asks the last question again: after a failed reply, or one that never came back. */
export function retryHelpQuestion(userId: string, ask: Ask) {
  const { messages, asking } = getHelpChat(userId);
  const at = messages.at(-1)?.failed ? messages.length - 2 : messages.length - 1;
  const question = messages[at];
  if (asking || question?.role !== "user") return;
  update(userId, { messages: messages.slice(0, at + 1), asking: question.id });
  void answer(userId, ask, question, messages.slice(0, at));
}

export function clearHelpChat(userId: string) {
  update(userId, { messages: [], asking: null });
}
