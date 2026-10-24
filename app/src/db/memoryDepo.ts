import type { Attempt, CardReview, CardState, Course, Highlight, KbExport, ProgressPayload, Topic, TopicNote } from "../types";
import { newer, nextSeq, queueKey, topicToLite, topicToText, type Depo, type KbIndexData, type QueueItem, type QueuePayload, type QueueRef, type QueueType } from "./types";

/**
 * Bellek içi depo. Testlerde doğrudan, web'de localStorage kalıcılığıyla (webDepo) kullanılır.
 * `onChange` her yazmadan sonra çağrılır; kalıcılık katmanı buraya bağlanır.
 */
export interface MemoryState {
  meta: Record<string, string>;
  kb: KbExport | null;
  attempts: Record<string, Attempt>;
  reviews: Record<string, CardReview>;
  states: Record<string, CardState>;
  queue: Record<string, QueueItem>;
  notes?: Record<string, TopicNote>;
  highlights?: Record<string, Highlight>;
}

export function emptyState(): MemoryState {
  return { meta: {}, kb: null, attempts: {}, reviews: {}, states: {}, queue: {}, notes: {}, highlights: {} };
}

export class MemoryDepo implements Depo {
  protected s: MemoryState;
  private topicMap = new Map<string, Topic>();

  private onChange?: (part: keyof MemoryState, state: MemoryState) => void;

  constructor(initial?: MemoryState, onChange?: (part: keyof MemoryState, state: MemoryState) => void) {
    this.onChange = onChange;
    this.s = initial ?? emptyState();
    this.reindex();
  }

  protected reindex() {
    this.topicMap = new Map((this.s.kb?.topics ?? []).map((t) => [t.id, t]));
  }

  private changed(part: keyof MemoryState) {
    this.onChange?.(part, this.s);
  }

  async init() {}

  async getMeta(key: string) {
    return this.s.meta[key] ?? null;
  }
  async setMeta(key: string, value: string | null) {
    if (value === null) delete this.s.meta[key];
    else this.s.meta[key] = value;
    this.changed("meta");
  }

  async replaceKb(kb: KbExport) {
    this.s.kb = kb;
    this.s.meta.kb_version = kb.version;
    this.reindex();
    this.changed("kb");
    this.changed("meta");
  }

  async loadKbIndex(): Promise<KbIndexData | null> {
    const kb = this.s.kb;
    if (!kb) return null;
    return {
      version: kb.version,
      courses: kb.courses,
      units: kb.units,
      topics: kb.topics.map(topicToLite),
      questions: kb.questions,
      flashcards: kb.flashcards,
      tables: kb.tables,
    };
  }

  async getTopic(id: string) {
    return this.topicMap.get(id) ?? null;
  }

  async upsertCourse(course: Course) {
    if (!this.s.kb) return;
    const i = this.s.kb.courses.findIndex((c) => c.id === course.id);
    if (i >= 0) this.s.kb.courses[i] = course;
    else this.s.kb.courses.push(course);
    this.changed("kb");
  }

  private enqueue(type: QueueType, payload: QueuePayload) {
    const key = queueKey(type, payload);
    this.s.queue[key] = { key, type, payload, queued_at: new Date().toISOString(), seq: nextSeq() };
    this.changed("queue");
  }

  async addAttempt(a: Attempt, queue = true) {
    this.s.attempts[a.id] = a;
    this.changed("attempts");
    if (queue) this.enqueue("attempt", a);
  }
  async listAttempts() {
    return Object.values(this.s.attempts).sort((x, y) => x.created_at.localeCompare(y.created_at));
  }

  async addCardReview(r: CardReview, queue = true) {
    this.s.reviews[r.id] = r;
    this.changed("reviews");
    if (queue) this.enqueue("card_review", r);
  }
  async listCardReviews() {
    return Object.values(this.s.reviews).sort((x, y) => x.reviewed_at.localeCompare(y.reviewed_at));
  }

  async putCardState(st: CardState, queue = true) {
    this.s.states[st.card_id] = st;
    this.changed("states");
    if (queue) this.enqueue("card_state", st);
  }
  async listCardStates() {
    return Object.values(this.s.states);
  }

  async importProgress(p: ProgressPayload) {
    for (const a of p.attempts) this.s.attempts[a.id] = a;
    for (const r of p.card_reviews) this.s.reviews[r.id] = r;
    for (const st of p.card_states) {
      const cur = this.s.states[st.card_id];
      if (!cur || cur.updated_at < st.updated_at) this.s.states[st.card_id] = st;
    }
    const notes = (this.s.notes ??= {});
    for (const n of p.topic_notes ?? []) if (newer(n, notes[n.topic_id])) notes[n.topic_id] = n;
    const hs = (this.s.highlights ??= {});
    for (const h of p.highlights ?? []) if (newer(h, hs[h.id])) hs[h.id] = h;
    this.changed("attempts");
    this.changed("reviews");
    this.changed("states");
    this.changed("notes");
    this.changed("highlights");
  }

  async listTopicTexts() {
    return (this.s.kb?.topics ?? []).map(topicToText);
  }

  async getTopicNote(topicId: string) {
    return this.s.notes?.[topicId] ?? null;
  }
  async listTopicNotes() {
    return Object.values(this.s.notes ?? {});
  }
  async putTopicNote(n: TopicNote, queue = true) {
    (this.s.notes ??= {})[n.topic_id] = n;
    this.changed("notes");
    if (queue) this.enqueue("topic_note", n);
  }
  async listHighlights(topicId?: string) {
    return Object.values(this.s.highlights ?? {})
      .filter((h) => !h.deleted && (!topicId || h.topic_id === topicId))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  }
  async putHighlight(h: Highlight, queue = true) {
    (this.s.highlights ??= {})[h.id] = h;
    this.changed("highlights");
    if (queue) this.enqueue("highlight", h);
  }

  async listQueue(limit = 500) {
    return Object.values(this.s.queue)
      .sort((x, y) => x.seq - y.seq)
      .slice(0, limit);
  }
  async removeQueue(refs: QueueRef[]) {
    for (const r of refs) if (this.s.queue[r.key]?.seq === r.seq) delete this.s.queue[r.key];
    this.changed("queue");
  }
  async queueCount() {
    return Object.keys(this.s.queue).length;
  }

  async clearAll() {
    this.s = emptyState();
    this.reindex();
    (Object.keys(this.s) as (keyof MemoryState)[]).forEach((k) => this.changed(k));
  }
}
