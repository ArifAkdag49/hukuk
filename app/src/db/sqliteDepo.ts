import * as SQLite from "expo-sqlite";
import type {
  Attempt,
  CardReview,
  CardState,
  ComparisonTable,
  Course,
  Flashcard,
  Highlight,
  KbExport,
  ProgressPayload,
  Question,
  Topic,
  TopicLite,
  TopicNote,
  Unit,
} from "../types";
import {
  newer,
  nextSeq,
  queueKey,
  type Depo,
  type KbIndexData,
  type QueueItem,
  type QueuePayload,
  type QueueRef,
  type QueueType,
  type TopicText,
} from "./types";

/**
 * Android deposu (expo-sqlite). Sunucudaki KB tablolarının aynası + yerel ilerleme ve sync_queue.
 * İç içe alanlar (glossary, articles, options, rubric...) JSON metni olarak saklanır.
 */

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY NOT NULL, code TEXT, name TEXT, year INTEGER, sort_order INTEGER, is_active INTEGER);
CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY NOT NULL, course_id TEXT, title TEXT, sort_order INTEGER);
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY NOT NULL, unit_id TEXT, course_id TEXT, title TEXT, sort_order INTEGER,
  summary_md TEXT, content_md TEXT, critical_md TEXT, doctrine_md TEXT, glossary TEXT,
  verification_status TEXT, generated_at TEXT, articles TEXT, cases TEXT
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL, topic_id TEXT, course_id TEXT, kind TEXT, stem_md TEXT, options TEXT,
  correct_option INTEGER, explanation_md TEXT, rubric TEXT, model_answer_md TEXT, origin TEXT, note_id TEXT
);
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY NOT NULL, topic_id TEXT, course_id TEXT, front_md TEXT, back_md TEXT, origin TEXT, note_id TEXT
);
CREATE TABLE IF NOT EXISTS comparison_tables (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT, title TEXT, columns_json TEXT, rows_json TEXT, related_topic_ids TEXT
);
CREATE TABLE IF NOT EXISTS local_attempts (
  id TEXT PRIMARY KEY NOT NULL, question_id TEXT, kind TEXT, selected_option INTEGER, answer_text TEXT,
  correct INTEGER, score INTEGER, feedback TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS local_card_reviews (id TEXT PRIMARY KEY NOT NULL, card_id TEXT, grade TEXT, reviewed_at TEXT);
CREATE TABLE IF NOT EXISTS local_card_states (
  card_id TEXT PRIMARY KEY NOT NULL, ease REAL, interval_days INTEGER, repetitions INTEGER,
  due_at TEXT, last_grade TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS sync_queue (key TEXT PRIMARY KEY NOT NULL, type TEXT, payload TEXT, queued_at TEXT, seq INTEGER);
CREATE TABLE IF NOT EXISTS topic_notes (topic_id TEXT PRIMARY KEY NOT NULL, body_md TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY NOT NULL, topic_id TEXT, section TEXT, block_hash TEXT, excerpt TEXT, deleted INTEGER, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_highlights_topic ON highlights(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);
`;

const j = (v: unknown) => JSON.stringify(v ?? null);
function pj<T>(s: unknown, fallback: T): T {
  if (typeof s !== "string") return fallback;
  try {
    return (JSON.parse(s) as T) ?? fallback;
  } catch {
    return fallback;
  }
}
const bool = (v: unknown) => v === 1 || v === true;

type Row = Record<string, unknown>;

export class SqliteDepo implements Depo {
  private db: SQLite.SQLiteDatabase | null = null;
  // Tek bağlantı, sıralı yazım: aynı bağlantıdaki async sorgular açık bir işleme (transaction)
  // karışabilir. İşlemler, yazımlar ve KB okumaları bu kuyruktan sırayla geçer; KB değişimi
  // sürerken öğrencinin quiz/kart yazımı bekler, işleme karışıp onunla geri alınmaz.
  // withExclusiveTransactionAsync ikinci bağlantı açıyor ve Android'de (Expo Go) prepareAsync
  // NullPointerException veriyor; bu yüzden kullanılmıyor.
  private tail: Promise<unknown> = Promise.resolve();

  private get conn(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error("Depo açılmadı");
    return this.db;
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn);
    this.tail = run.catch(() => undefined);
    return run;
  }

  async init() {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync("hukuk.db");
    await this.db.execAsync(SCHEMA);
  }

  async getMeta(key: string) {
    const r = await this.conn.getFirstAsync<{ value: string | null }>("SELECT value FROM meta WHERE key = ?", key);
    return r?.value ?? null;
  }
  setMeta(key: string, value: string | null) {
    return this.serial(async () => {
      if (value === null) await this.conn.runAsync("DELETE FROM meta WHERE key = ?", key);
      else await this.conn.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", key, value);
    });
  }

  replaceKb(kb: KbExport) {
    // Sıralı kuyruk sayesinde uzun KB değişimi sürerken başka yazım bu işleme karışmaz; aksi
    // halde değişim geri alınırsa öğrencinin ilerlemesi de sessizce kaybolurdu.
    return this.serial(() => this.writeKb(kb));
  }

  private async writeKb(kb: KbExport) {
    const db = this.conn;
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        "DELETE FROM courses; DELETE FROM units; DELETE FROM topics; DELETE FROM questions; DELETE FROM flashcards; DELETE FROM comparison_tables;",
      );
      const insert = async (sql: string, rows: unknown[][]) => {
        const st = await db.prepareAsync(sql);
        try {
          for (const r of rows) await st.executeAsync(r as SQLite.SQLiteBindParams);
        } finally {
          await st.finalizeAsync();
        }
      };
      await insert(
        "INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?)",
        kb.courses.map((c) => [c.id, c.code ?? c.id, c.name, c.year, c.sort_order, c.is_active ? 1 : 0]),
      );
      await insert(
        "INSERT INTO units VALUES (?, ?, ?, ?)",
        kb.units.map((u) => [u.id, u.course_id, u.title, u.sort_order]),
      );
      await insert(
        "INSERT INTO topics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        kb.topics.map((t) => [
          t.id, t.unit_id, t.course_id, t.title, t.sort_order, t.summary_md, t.content_md, t.critical_md,
          t.doctrine_md, j(t.glossary), t.verification_status, t.generated_at, j(t.articles), j(t.cases),
        ]),
      );
      await insert(
        "INSERT INTO questions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        kb.questions.map((q) => [
          q.id, q.topic_id, q.course_id, q.kind, q.stem_md, j(q.options), q.correct_option, q.explanation_md,
          j(q.rubric), q.model_answer_md, q.origin, q.note_id,
        ]),
      );
      await insert(
        "INSERT INTO flashcards VALUES (?, ?, ?, ?, ?, ?, ?)",
        kb.flashcards.map((f) => [f.id, f.topic_id, f.course_id, f.front_md, f.back_md, f.origin, f.note_id]),
      );
      await insert(
        "INSERT INTO comparison_tables VALUES (?, ?, ?, ?, ?, ?)",
        kb.tables.map((t) => [t.id, t.course_id, t.title, j(t.columns), j(t.rows), j(t.related_topic_ids)]),
      );
      await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('kb_version', ?)", kb.version);
    });
  }

  loadKbIndex(): Promise<KbIndexData | null> {
    return this.serial(() => this.readKbIndex());
  }

  private async readKbIndex(): Promise<KbIndexData | null> {
    const version = await this.getMeta("kb_version");
    if (!version) return null;
    const db = this.conn;
    const courses = (await db.getAllAsync<Row>("SELECT * FROM courses ORDER BY year, sort_order")).map(
      (r): Course => ({
        id: String(r.id), code: String(r.code ?? r.id), name: String(r.name), year: Number(r.year),
        sort_order: Number(r.sort_order), is_active: bool(r.is_active),
      }),
    );
    const units = (await db.getAllAsync<Row>("SELECT * FROM units ORDER BY sort_order")).map(
      (r): Unit => ({ id: String(r.id), course_id: String(r.course_id), title: String(r.title), sort_order: Number(r.sort_order) }),
    );
    const topics = (
      await db.getAllAsync<Row>(
        "SELECT id, unit_id, course_id, title, sort_order, verification_status FROM topics ORDER BY sort_order",
      )
    ).map(
      (r): TopicLite => ({
        id: String(r.id), unit_id: String(r.unit_id), course_id: String(r.course_id), title: String(r.title),
        sort_order: Number(r.sort_order), verification_status: r.verification_status as TopicLite["verification_status"],
      }),
    );
    const questions = (await db.getAllAsync<Row>("SELECT * FROM questions")).map(
      (r): Question => ({
        id: String(r.id), topic_id: (r.topic_id as string) ?? null, course_id: String(r.course_id),
        kind: r.kind as Question["kind"], stem_md: String(r.stem_md ?? ""), options: pj(r.options, null),
        correct_option: r.correct_option == null ? null : Number(r.correct_option),
        explanation_md: (r.explanation_md as string) ?? null, rubric: pj(r.rubric, null),
        model_answer_md: (r.model_answer_md as string) ?? null, origin: r.origin as Question["origin"],
        note_id: (r.note_id as string) ?? null,
      }),
    );
    const flashcards = (await db.getAllAsync<Row>("SELECT * FROM flashcards")).map(
      (r): Flashcard => ({
        id: String(r.id), topic_id: (r.topic_id as string) ?? null, course_id: String(r.course_id),
        front_md: String(r.front_md ?? ""), back_md: String(r.back_md ?? ""), origin: r.origin as Flashcard["origin"],
        note_id: (r.note_id as string) ?? null,
      }),
    );
    const tables = (await db.getAllAsync<Row>("SELECT * FROM comparison_tables")).map(
      (r): ComparisonTable => ({
        id: String(r.id), course_id: String(r.course_id), title: String(r.title), columns: pj(r.columns_json, []),
        rows: pj(r.rows_json, []), related_topic_ids: pj(r.related_topic_ids, []),
      }),
    );
    return { version, courses, units, topics, questions, flashcards, tables };
  }

  getTopic(id: string): Promise<Topic | null> {
    return this.serial(() => this.readTopic(id));
  }

  private async readTopic(id: string): Promise<Topic | null> {
    const r = await this.conn.getFirstAsync<Row>("SELECT * FROM topics WHERE id = ?", id);
    if (!r) return null;
    return {
      id: String(r.id), unit_id: String(r.unit_id), course_id: String(r.course_id), title: String(r.title),
      sort_order: Number(r.sort_order), summary_md: String(r.summary_md ?? ""), content_md: String(r.content_md ?? ""),
      critical_md: String(r.critical_md ?? ""), doctrine_md: String(r.doctrine_md ?? ""), glossary: pj(r.glossary, []),
      verification_status: r.verification_status as Topic["verification_status"],
      generated_at: (r.generated_at as string) ?? null, articles: pj(r.articles, []), cases: pj(r.cases, []),
    };
  }

  upsertCourse(c: Course) {
    return this.serial(async () => {
      await this.conn.runAsync(
        "INSERT OR REPLACE INTO courses VALUES (?, ?, ?, ?, ?, ?)",
        c.id, c.code ?? c.id, c.name, c.year, c.sort_order, c.is_active ? 1 : 0,
      );
    });
  }

  private async enqueue(type: QueueType, payload: QueuePayload) {
    await this.conn.runAsync(
      "INSERT OR REPLACE INTO sync_queue (key, type, payload, queued_at, seq) VALUES (?, ?, ?, ?, ?)",
      queueKey(type, payload), type, JSON.stringify(payload), new Date().toISOString(), nextSeq(),
    );
  }

  addAttempt(a: Attempt, queue = true) {
    return this.serial(() => this.writeAttempt(a, queue));
  }
  private async writeAttempt(a: Attempt, queue: boolean) {
    await this.conn.runAsync(
      "INSERT OR REPLACE INTO local_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      a.id, a.question_id, a.kind, a.selected_option ?? null, a.answer_text ?? null,
      a.correct == null ? null : a.correct ? 1 : 0, a.score ?? null, j(a.feedback), a.created_at,
    );
    if (queue) await this.enqueue("attempt", a);
  }
  async listAttempts(): Promise<Attempt[]> {
    const rows = await this.conn.getAllAsync<Row>("SELECT * FROM local_attempts ORDER BY created_at");
    return rows.map((r) => ({
      id: String(r.id), question_id: String(r.question_id), kind: r.kind as Attempt["kind"],
      selected_option: r.selected_option == null ? null : Number(r.selected_option),
      answer_text: (r.answer_text as string) ?? null, correct: r.correct == null ? null : bool(r.correct),
      score: r.score == null ? null : Number(r.score), feedback: pj(r.feedback, null), created_at: String(r.created_at),
    }));
  }

  addCardReview(rv: CardReview, queue = true) {
    return this.serial(() => this.writeCardReview(rv, queue));
  }
  private async writeCardReview(rv: CardReview, queue: boolean) {
    await this.conn.runAsync(
      "INSERT OR REPLACE INTO local_card_reviews VALUES (?, ?, ?, ?)",
      rv.id, rv.card_id, rv.grade, rv.reviewed_at,
    );
    if (queue) await this.enqueue("card_review", rv);
  }
  async listCardReviews(): Promise<CardReview[]> {
    const rows = await this.conn.getAllAsync<Row>("SELECT * FROM local_card_reviews ORDER BY reviewed_at");
    return rows.map((r) => ({
      id: String(r.id), card_id: String(r.card_id), grade: r.grade as CardReview["grade"], reviewed_at: String(r.reviewed_at),
    }));
  }

  putCardState(s: CardState, queue = true) {
    return this.serial(() => this.writeCardState(s, queue));
  }
  private async writeCardState(s: CardState, queue: boolean) {
    await this.conn.runAsync(
      "INSERT OR REPLACE INTO local_card_states VALUES (?, ?, ?, ?, ?, ?, ?)",
      s.card_id, s.ease, s.interval_days, s.repetitions, s.due_at, s.last_grade, s.updated_at,
    );
    if (queue) await this.enqueue("card_state", s);
  }
  async listCardStates(): Promise<CardState[]> {
    const rows = await this.conn.getAllAsync<Row>("SELECT * FROM local_card_states");
    return rows.map((r) => ({
      card_id: String(r.card_id), ease: Number(r.ease), interval_days: Number(r.interval_days),
      repetitions: Number(r.repetitions), due_at: String(r.due_at), last_grade: r.last_grade as CardState["last_grade"],
      updated_at: String(r.updated_at),
    }));
  }

  importProgress(p: ProgressPayload) {
    return this.serial(() => this.writeProgress(p));
  }
  private async writeProgress(p: ProgressPayload) {
    const db = this.conn;
    await db.withTransactionAsync(async () => {
      for (const a of p.attempts) await this.writeAttempt(a, false);
      for (const r of p.card_reviews) await this.writeCardReview(r, false);
      for (const s of p.card_states) {
        const cur = await db.getFirstAsync<{ updated_at: string }>(
          "SELECT updated_at FROM local_card_states WHERE card_id = ?", s.card_id,
        );
        if (!cur || cur.updated_at < s.updated_at) await this.writeCardState(s, false);
      }
      for (const n of p.topic_notes ?? []) {
        if (newer(n, await this.getTopicNote(n.topic_id))) await this.writeTopicNote(n, false);
      }
      for (const h of p.highlights ?? []) {
        const cur = await db.getFirstAsync<{ updated_at: string }>("SELECT updated_at FROM highlights WHERE id = ?", h.id);
        if (newer(h, cur)) await this.writeHighlight(h, false);
      }
    });
  }

  listTopicTexts(): Promise<TopicText[]> {
    return this.serial(() => this.readTopicTexts());
  }
  private async readTopicTexts(): Promise<TopicText[]> {
    const rows = await this.conn.getAllAsync<Row>(
      "SELECT id, title, course_id, summary_md, content_md, critical_md, doctrine_md, glossary FROM topics ORDER BY sort_order",
    );
    return rows.map((r) => ({
      id: String(r.id), title: String(r.title), course_id: String(r.course_id),
      summary_md: String(r.summary_md ?? ""), content_md: String(r.content_md ?? ""),
      critical_md: String(r.critical_md ?? ""), doctrine_md: String(r.doctrine_md ?? ""), glossary: pj(r.glossary, []),
    }));
  }

  async getTopicNote(topicId: string): Promise<TopicNote | null> {
    const r = await this.conn.getFirstAsync<Row>("SELECT * FROM topic_notes WHERE topic_id = ?", topicId);
    return r ? { topic_id: String(r.topic_id), body_md: String(r.body_md ?? ""), updated_at: String(r.updated_at) } : null;
  }
  async listTopicNotes(): Promise<TopicNote[]> {
    const rows = await this.conn.getAllAsync<Row>("SELECT * FROM topic_notes");
    return rows.map((r) => ({ topic_id: String(r.topic_id), body_md: String(r.body_md ?? ""), updated_at: String(r.updated_at) }));
  }
  putTopicNote(n: TopicNote, queue = true) {
    return this.serial(() => this.writeTopicNote(n, queue));
  }
  private async writeTopicNote(n: TopicNote, queue: boolean) {
    await this.conn.runAsync(
      "INSERT OR REPLACE INTO topic_notes (topic_id, body_md, updated_at) VALUES (?, ?, ?)",
      n.topic_id, n.body_md, n.updated_at,
    );
    if (queue) await this.enqueue("topic_note", n);
  }
  async listHighlights(topicId?: string): Promise<Highlight[]> {
    const rows = topicId
      ? await this.conn.getAllAsync<Row>("SELECT * FROM highlights WHERE deleted = 0 AND topic_id = ? ORDER BY updated_at", topicId)
      : await this.conn.getAllAsync<Row>("SELECT * FROM highlights WHERE deleted = 0 ORDER BY updated_at");
    return rows.map((r) => ({
      id: String(r.id), topic_id: String(r.topic_id), section: r.section as Highlight["section"],
      block_hash: String(r.block_hash), excerpt: String(r.excerpt ?? ""), deleted: bool(r.deleted), updated_at: String(r.updated_at),
    }));
  }
  putHighlight(h: Highlight, queue = true) {
    return this.serial(() => this.writeHighlight(h, queue));
  }
  private async writeHighlight(h: Highlight, queue: boolean) {
    await this.conn.runAsync(
      "INSERT OR REPLACE INTO highlights (id, topic_id, section, block_hash, excerpt, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      h.id, h.topic_id, h.section, h.block_hash, h.excerpt, h.deleted ? 1 : 0, h.updated_at,
    );
    if (queue) await this.enqueue("highlight", h);
  }

  async listQueue(limit = 500): Promise<QueueItem[]> {
    const rows = await this.conn.getAllAsync<Row>("SELECT * FROM sync_queue ORDER BY seq LIMIT ?", limit);
    return rows.map((r) => ({
      key: String(r.key), type: r.type as QueueType, payload: pj(r.payload, {} as Attempt),
      queued_at: String(r.queued_at), seq: Number(r.seq),
    }));
  }
  removeQueue(refs: QueueRef[]) {
    return this.serial(async () => {
      const db = this.conn;
      await db.withTransactionAsync(async () => {
        for (const r of refs) await db.runAsync("DELETE FROM sync_queue WHERE key = ? AND seq = ?", r.key, r.seq);
      });
    });
  }
  async queueCount() {
    const r = await this.conn.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM sync_queue");
    return r?.n ?? 0;
  }

  clearAll() {
    return this.serial(() => this.conn.execAsync(
      "DELETE FROM meta; DELETE FROM courses; DELETE FROM units; DELETE FROM topics; DELETE FROM questions; DELETE FROM flashcards; DELETE FROM comparison_tables; DELETE FROM local_attempts; DELETE FROM local_card_reviews; DELETE FROM local_card_states; DELETE FROM sync_queue; DELETE FROM topic_notes; DELETE FROM highlights;",
    ));
  }
}
