import type {
  Attempt,
  CardReview,
  CardState,
  ComparisonTable,
  Course,
  Flashcard,
  KbExport,
  ProgressPayload,
  Question,
  Topic,
  TopicLite,
  Unit,
} from "../types";

/**
 * Yerel depo arayüzü. Android'de expo-sqlite (sqliteDepo), web'de bellek + localStorage (webDepo).
 * Uygulamanın geri kalanı yalnızca bu arayüzü görür.
 */

export type QueueType = "attempt" | "card_review" | "card_state";

export interface QueueItem {
  key: string; // attempt:<id> | card_review:<id> | card_state:<card_id>
  type: QueueType;
  payload: Attempt | CardReview | CardState;
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

  /** Çıkışta: ilerleme ve kuyruk dahil her şeyi siler. */
  clearAll(): Promise<void>;
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

export function queueKey(type: QueueType, payload: Attempt | CardReview | CardState): string {
  if (type === "card_state") return `card_state:${(payload as CardState).card_id}`;
  return `${type}:${(payload as Attempt | CardReview).id}`;
}
