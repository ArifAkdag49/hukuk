import { AppState } from "react-native";
import { ApiError, api } from "./api";
import type { ChatMessage } from "./types";

/**
 * Asistana giden mesajlar sohbet ekranından bağımsız yürür: ekrandan çıkıp başka bir sohbete ya da derse
 * geçince istek yarıda kalmaz. Ekrana geri dönünce gönderilen mesaj ve "Asistan yazıyor" yeniden görünür,
 * cevap gelince sohbete düşer.
 */

/** Bağlantı kopunca cevabın sunucuda bitmesi için beklenen en uzun süre (derin cevap 2-4 dk sürebilir). */
const REPLY_WAIT_MS = 5 * 60_000;
const POLL_MS = 4_000;

export type SendOutcome =
  | { ok: true; reply?: ChatMessage; fresh?: ChatMessage[]; suggestNew: boolean }
  | { ok: false; error: unknown };

export type PendingSend = {
  threadId: string;
  text: string;
  deep: boolean;
  /** Cevap gelene kadar sohbette gösterilen kullanıcı mesajı. */
  optimistic: ChatMessage;
  done: Promise<SendOutcome>;
};

type SetDraft = (key: string, value: string | null) => Promise<void>;

const pending = new Map<string, PendingSend>();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function getPending(threadId: string): PendingSend | undefined {
  return pending.get(threadId);
}

export function isPending(threadId: string): boolean {
  return pending.has(threadId);
}

/** Bekleyen gönderimler değişince (başlayınca ya da bitince) çağrılır. */
export function subscribePending(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function hasReply(msgs: ChatMessage[], text: string): boolean {
  const n = msgs.length;
  return n >= 2 && msgs[n - 1].role === "assistant" && msgs[n - 2].role === "user" && msgs[n - 2].content_md === text;
}

/**
 * Gönderilen mesajın cevabı sunucuda kaydolana kadar sohbeti yokla. Uygulama ön plana dönünce hemen
 * bakar. waitMs 0 ise bir kez bakar. Cevap gelmezse null.
 */
async function waitForReply(threadId: string, text: string, waitMs: number): Promise<ChatMessage[] | null> {
  const until = Date.now() + waitMs;
  for (;;) {
    try {
      const fresh = await api.getMessages(threadId);
      if (hasReply(fresh, text)) return fresh;
    } catch {
      // uygulama arka plandayken ya da bağlantı yokken istek düşer; beklemeye devam
    }
    if (Date.now() >= until) return null;
    await new Promise<void>((resolve) => {
      const t = setTimeout(done, POLL_MS);
      const sub = AppState.addEventListener("change", (s) => s === "active" && done());
      function done() {
        clearTimeout(t);
        sub.remove();
        resolve();
      }
    });
  }
}

async function run(threadId: string, text: string, deep: boolean, setDraft: SetDraft): Promise<SendOutcome> {
  const key = `chat:${threadId}`;
  try {
    const r = await api.sendMessage(threadId, text, deep);
    await setDraft(key, null);
    return { ok: true, reply: r.message, suggestNew: r.suggest_new_thread };
  } catch (e) {
    // Bağlantı koptuysa (başka uygulamaya geçince Android bağlantıyı keser) ya da zaman aşımı
    // olduysa sunucu cevabı yine de yazıp kaydeder: tekrar göndertip iki kez ücretlendirmek
    // yerine cevabın sohbete düşmesini bekle.
    const dropped = e instanceof ApiError && (e.status === 0 || e.status === 408);
    const fresh = await waitForReply(threadId, text, dropped ? REPLY_WAIT_MS : 0);
    if (fresh) {
      await setDraft(key, null);
      return { ok: true, fresh, suggestNew: false };
    }
    // Mesaj kaybolmasın: ekran kapalı olsa bile taslak olarak sakla
    await setDraft(key, text);
    return { ok: false, error: e };
  }
}

/** Mesajı gönderir. Aynı sohbette bekleyen bir gönderim varsa onu döndürür. */
export function startSend(threadId: string, text: string, deep: boolean, setDraft: SetDraft): PendingSend {
  const existing = pending.get(threadId);
  if (existing) return existing;
  const optimistic: ChatMessage = { id: `local-${Date.now()}`, thread_id: threadId, role: "user", content_md: text, created_at: new Date().toISOString() };
  const done = run(threadId, text, deep, setDraft).finally(() => {
    pending.delete(threadId);
    emit();
  });
  const p: PendingSend = { threadId, text, deep, optimistic, done };
  pending.set(threadId, p);
  emit();
  return p;
}
