import type {
  Attempt,
  CardReview,
  CardState,
  ComparisonTable,
  Course,
  Flashcard,
  GlossaryItem,
  Highlight,
  KbExport,
  ProgressPayload,
  Question,
  Topic,
  TopicLite,
  TopicNote,
  Unit,
} from "../types";

/**
 * Yerel depo arayüzü. Android'de expo-sqlite (sqliteDepo), web'de bellek + localStorage (webDepo).
 * Uygulamanın geri kalanı yalnızca bu arayüzü görür.
 */

export type QueueType = "attempt" | "card_review" | "card_state" | "topic_note" | "highlight";

export type QueuePayload = Attempt | CardReview | CardState | TopicNote | Highlight;

export interface QueueItem {
  key: string; // attempt:<id> | card_review:<id> | card_state:<card_id>
  type: QueueType;
  payload: QueuePayload;
  queued_at: string;
  /** Artan sıra numarası. Gönderim sırasında aynı anahtar yeniden kuyruğa girerse yenisi silinmesin diye. */
  seq: number;
}

export type QueueRef = Pick<QueueItem, "key" | "seq">;

let lastSeq = 0;
/** Tekil ve artan sıra numarası (aynı milisaniyede bile). */
export function nextSeq(): number {
  const n = Date.now() * 1000;
  lastSeq = n > lastSeq ? n : lastSeq + 1;
  return lastSeq;
}

/** Bellekte tutulan hafif bilgi bankası (konu metinleri hariç). */
export interface KbIndexData {
  version: string;
  courses: Course[];
  units: Unit[];
  topics: TopicLite[];
  questions: Question[];
  flashcards: Flashcard[];
  tables: ComparisonTable[];
}

export interface Depo {
  init(): Promise<void>;

  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string | null): Promise<void>;

  replaceKb(kb: KbExport): Promise<void>;
  loadKbIndex(): Promise<KbIndexData | null>;
  getTopic(id: string): Promise<Topic | null>;
  upsertCourse(course: Course): Promise<void>;

  /** queue=false: sunucudan geri yüklenen kayıtlar için (yeniden gönderilmez). */
  addAttempt(a: Attempt, queue?: boolean): Promise<void>;
  listAttempts(): Promise<Attempt[]>;
  addCardReview(r: CardReview, queue?: boolean): Promise<void>;
  listCardReviews(): Promise<CardReview[]>;
  putCardState(s: CardState, queue?: boolean): Promise<void>;
  listCardStates(): Promise<CardState[]>;
  importProgress(p: ProgressPayload): Promise<void>;

  listQueue(limit?: number): Promise<QueueItem[]>;
  /** Yalnızca sıra numarası hâlâ aynı olan kayıtları siler. */
  removeQueue(refs: QueueRef[]): Promise<void>;
  queueCount(): Promise<number>;

  /** Arama için konu metinleri (uzun alanlar dahil). */
  listTopicTexts(): Promise<TopicText[]>;

  getTopicNote(topicId: string): Promise<TopicNote | null>;
  listTopicNotes(): Promise<TopicNote[]>;
  putTopicNote(n: TopicNote, queue?: boolean): Promise<void>;
  /** Silinmemiş vurgular; topicId verilirse yalnız o konunun. */
  listHighlights(topicId?: string): Promise<Highlight[]>;
  putHighlight(h: Highlight, queue?: boolean): Promise<void>;

  /** Çıkışta: ilerleme ve kuyruk dahil her şeyi siler. */
  clearAll(): Promise<void>;
}

export interface TopicText {
  id: string;
  title: string;
  course_id: string;
  summary_md: string;
  content_md: string;
  critical_md: string;
  doctrine_md: string;
  glossary: GlossaryItem[];
}

export function topicToText(t: Topic): TopicText {
  return {
    id: t.id,
    title: t.title,
    course_id: t.course_id,
    summary_md: t.summary_md ?? "",
    content_md: t.content_md ?? "",
    critical_md: t.critical_md ?? "",
    doctrine_md: t.doctrine_md ?? "",
    glossary: t.glossary ?? [],
  };
}

/** Son yazan kazanır: aday daha yeniyse true. */
export function newer(candidate: { updated_at: string }, current: { updated_at: string } | null | undefined): boolean {
  return !current || current.updated_at < candidate.updated_at;
}

export function topicToLite(t: Topic): TopicLite {
  return {
    id: t.id,
    unit_id: t.unit_id,
    course_id: t.course_id,
    title: t.title,
    sort_order: t.sort_order,
    verification_status: t.verification_status,
  };
}

export function queueKey(type: QueueType, payload: QueuePayload): string {
  if (type === "card_state") return `card_state:${(payload as CardState).card_id}`;
  if (type === "topic_note") return `topic_note:${(payload as TopicNote).topic_id}`;
  return `${type}:${(payload as Attempt | CardReview | Highlight).id}`;
}
