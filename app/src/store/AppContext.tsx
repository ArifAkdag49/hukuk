import * as Crypto from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { AppState } from "react-native";
import { ApiError, api, errorText, setUnauthorizedHandler } from "../api";
import { buildMastery, type KbLookup } from "../analysis";
import { clearToken, getToken, setToken } from "../auth/token";
import { createDepo } from "../db/depo";
import type { Depo, KbIndexData, TopicText } from "../db/types";
import { blockExcerpt, blockHash } from "../highlights";
import * as Reminders from "../notifications";
import { planReminders } from "../reminders";
import { checkAndFetchUpdate } from "../updates";
import { courseMastery, type Mastery } from "../mastery";
import { isDue, review } from "../sm2";
import { createSync, META_LAST_SYNC } from "../sync";
import type {
  Attempt,
  CardReview,
  CardState,
  Course,
  Flashcard,
  Grade,
  Highlight,
  HighlightSection,
  Question,
  Topic,
  TopicLite,
  TopicNote,
  Unit,
} from "../types";

/**
 * Uygulama durumu: yerel depo, bellekteki KB dizini, ilerleme, ustalık ve senkronizasyon.
 * Ekranlar yalnızca useApp() ile buraya erişir.
 */

export type SyncState = "idle" | "syncing" | "offline" | "error";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  permission: Reminders.PermissionState;
}

const DEFAULT_REMINDER: ReminderSettings = { enabled: true, hour: 20, minute: 0, permission: "undetermined" };

export interface Kb extends KbLookup {
  version: string;
  units: Unit[];
  questions: Question[];
  flashcards: Flashcard[];
  tables: KbIndexData["tables"];
  courseById: Map<string, Course>;
  unitsByCourse: Map<string, Unit[]>;
  topicsByUnit: Map<string, TopicLite[]>;
  topicsByCourse: Map<string, TopicLite[]>;
  topicById: Map<string, TopicLite>;
  questionsByTopic: Map<string, Question[]>;
  cardsByTopic: Map<string, Flashcard[]>;
}

function group<T>(items: T[], key: (t: T) => string | null | undefined): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export function buildKb(d: KbIndexData): Kb {
  const courses = [...d.courses].sort((a, b) => a.year - b.year || a.sort_order - b.sort_order);
  const units = [...d.units].sort((a, b) => a.sort_order - b.sort_order);
  const topics = [...d.topics].sort((a, b) => a.sort_order - b.sort_order);
  return {
    version: d.version,
    courses,
    units,
    topics,
    questions: d.questions,
    flashcards: d.flashcards,
    tables: d.tables,
    courseById: new Map(courses.map((c) => [c.id, c])),
    unitsByCourse: group(units, (u) => u.course_id),
    topicsByUnit: group(topics, (t) => t.unit_id),
    topicsByCourse: group(topics, (t) => t.course_id),
    topicById: new Map(topics.map((t) => [t.id, t])),
    questionById: new Map(d.questions.map((q) => [q.id, q])),
    cardById: new Map(d.flashcards.map((f) => [f.id, f])),
    questionsByTopic: group(d.questions, (q) => q.topic_id),
    cardsByTopic: group(d.flashcards, (f) => f.topic_id),
  };
}

interface AppValue {
  ready: boolean;
  authed: boolean;
  kb: Kb | null;
  attempts: Attempt[];
  reviews: CardReview[];
  cardStates: Map<string, CardState>;
  mastery: Map<string, Mastery>;
  courseScore: (courseId: string) => number | null;
  dueCards: (filter?: (c: Flashcard) => boolean) => Flashcard[];
  sync: { state: SyncState; lastSyncAt: string | null; pending: number; error: string | null };
  disclaimerSeen: boolean;
  lastTopicId: string | null;

  login(password: string): Promise<void>;
  logout(): Promise<void>;
  syncNow(): Promise<void>;
  getTopic(id: string): Promise<Topic | null>;
  recordAttempt(a: Omit<Attempt, "id" | "created_at">): Promise<Attempt>;
  reviewCard(cardId: string, grade: Grade): Promise<CardState>;
  acceptDisclaimer(): Promise<void>;
  setLastTopic(id: string): Promise<void>;
  getDraft(key: string): Promise<string | null>;
  setDraft(key: string, value: string | null): Promise<void>;
  setCourseActive(id: string, active: boolean): Promise<void>;
  addCourse(input: { code: string; name: string; year: number }): Promise<void>;

  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string | null): Promise<void>;

  /** Kişisel not ve vurgular */
  getTopicNote(topicId: string): Promise<TopicNote | null>;
  saveTopicNote(topicId: string, body: string): Promise<void>;
  listTopicNotes(): Promise<TopicNote[]>;
  listHighlights(topicId?: string): Promise<Highlight[]>;
  /** Blok vurguluysa kaldırır, değilse vurgular. Güncel listeyi döner. */
  toggleHighlight(topicId: string, section: HighlightSection, blockText: string): Promise<Highlight[]>;
  removeHighlight(h: Highlight): Promise<void>;
  /** Arama için konu metinleri (KB sürümü değişince yenilenir). */
  topicTexts(): Promise<TopicText[]>;

  /** Günlük hatırlatma */
  reminder: ReminderSettings;
  setReminder(patch: Partial<Pick<ReminderSettings, "enabled" | "hour" | "minute">>): Promise<void>;
  rescheduleReminders(): Promise<void>;

  /** Uzaktan güncelleme indirildi, yeniden başlatınca uygulanır */
  updateReady: boolean;
}

const Ctx = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp, AppProvider içinde kullanılmalı");
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const depoRef = useRef<Depo | null>(null);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [kbData, setKbData] = useState<KbIndexData | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [reviews, setReviews] = useState<CardReview[]>([]);
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map());
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [disclaimerSeen, setDisclaimerSeen] = useState(true);
  const [lastTopicId, setLastTopicId] = useState<string | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const syncing = useRef(false);
  const [reminder, setReminderState] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [updateReady, setUpdateReady] = useState(false);
  const textsCache = useRef<{ version: string; texts: TopicText[] } | null>(null);
  // Hatırlatma planı için en güncel değerler (eski kapanışlara takılmamak için)
  const latest = useRef<{ kbData: KbIndexData | null; cardStates: Map<string, CardState>; reminder: ReminderSettings }>({
    kbData: null,
    cardStates: new Map(),
    reminder: DEFAULT_REMINDER,
  });
  latest.current = { kbData, cardStates, reminder: latest.current.reminder };

  const depo = () => {
    if (!depoRef.current) throw new Error("Depo hazır değil");
    return depoRef.current;
  };

  const reloadAll = useCallback(async () => {
    const d = depo();
    const [idx, at, rv, st, q, last, lt] = await Promise.all([
      d.loadKbIndex(),
      d.listAttempts(),
      d.listCardReviews(),
      d.listCardStates(),
      d.queueCount(),
      d.getMeta(META_LAST_SYNC),
      d.getMeta("last_topic_id"),
    ]);
    setKbData(idx);
    setAttempts(at);
    setReviews(rv);
    setCardStates(new Map(st.map((s) => [s.card_id, s])));
    setPending(q);
    setLastSyncAt(last);
    setLastTopicId(lt);
  }, []);

  /** Kuyrukta bekleyenleri arka planda göndermeyi dener. */
  const pushSoon = useCallback(() => {
    const d = depoRef.current;
    if (!d) return;
    void createSync(d, api)
      .pushProgress()
      .catch(() => undefined)
      .then(async () => setPending(await d.queueCount()));
  }, []);

  const rescheduleReminders = useCallback(async () => {
    const { kbData: k, cardStates: cs, reminder: r } = latest.current;
    try {
      if (!r.enabled || !k) {
        await Reminders.cancelReminders();
        return;
      }
      const active = k.courses.filter((c) => c.is_active).map((c) => c.id);
      const plan = planReminders({ cards: k.flashcards, cardStates: cs, activeCourseIds: active, now: new Date(), hour: r.hour, minute: r.minute });
      await Reminders.scheduleReminders(plan);
    } catch {
      // bildirim kurulamazsa uygulama çalışmaya devam eder
    }
  }, []);

  const checkUpdate = useCallback(async () => {
    if (await checkAndFetchUpdate()) setUpdateReady(true);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing.current || !depoRef.current) return;
    if (!(await getToken())) return;
    syncing.current = true;
    setSyncState("syncing");
    setSyncError(null);
    try {
      const r = await createSync(depo(), api).syncAll();
      await reloadAll();
      setSyncState("idle");
      setTick(Date.now());
      void r;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status === 408)) setSyncState("offline");
      else setSyncState("error");
      setSyncError(errorText(e));
      setPending(await depo().queueCount());
    } finally {
      syncing.current = false;
    }
  }, [reloadAll]);

  // Açılış
  useEffect(() => {
    let alive = true;
    (async () => {
      const d = createDepo();
      await d.init();
      depoRef.current = d;
      const token = await getToken();
      const seen = await d.getMeta("disclaimer_seen");
      const rem = await d.getMeta("reminder");
      await reloadAll();
      if (!alive) return;
      let r: ReminderSettings = DEFAULT_REMINDER;
      try {
        if (rem) r = { ...DEFAULT_REMINDER, ...JSON.parse(rem) };
      } catch {
        // bozuk ayar: varsayılan
      }
      r = { ...r, permission: await Reminders.getPermission() };
      latest.current.reminder = r;
      setReminderState(r);
      setDisclaimerSeen(seen === "1");
      setAuthed(!!token);
      setReady(true);
      if (token) void syncNow();
      void checkUpdate();
    })();
    return () => {
      alive = false;
    };
  }, [reloadAll, syncNow, checkUpdate]);

  // Hatırlatma: varsayılan açık. Giriş yapılmış ve KB inmişken izin bir kez istenir, sonra plan kurulur.
  // KB veya kart durumları değişince (oturum bitince dahil) plan yeniden kurulur.
  useEffect(() => {
    if (!ready || !authed || !kbData) return;
    const t = setTimeout(() => {
      void (async () => {
        const d = depoRef.current;
        if (!d) return;
        let r = latest.current.reminder;
        if (r.enabled && r.permission === "undetermined" && !(await d.getMeta("reminder_asked"))) {
          await d.setMeta("reminder_asked", "1");
          r = { ...r, permission: await Reminders.requestPermission() };
          latest.current.reminder = r;
          setReminderState(r);
        }
        await rescheduleReminders();
      })();
    }, 1500);
    return () => clearTimeout(t);
  }, [ready, authed, kbData, cardStates, rescheduleReminders]);

  // Bildirime dokununca kartlar ekranı
  useEffect(() => Reminders.onReminderOpened((url) => router.push(url as "/kartlar")), []);

  // 401 → giriş ekranı
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearToken();
      setAuthed(false);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Ön plana gelince senkronize et
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        setTick(Date.now());
        if (authed) void syncNow();
        void rescheduleReminders();
        void checkUpdate();
      }
    });
    return () => sub.remove();
  }, [authed, syncNow, rescheduleReminders, checkUpdate]);

  const kb = useMemo(() => (kbData ? buildKb(kbData) : null), [kbData]);

  const mastery = useMemo(
    () => (kb ? buildMastery(kb, attempts, reviews, new Date(tick)) : new Map<string, Mastery>()),
    [kb, attempts, reviews, tick],
  );

  const courseScore = useCallback(
    (courseId: string) => {
      const ts = kb?.topicsByCourse.get(courseId) ?? [];
      return courseMastery(ts.map((t) => mastery.get(t.id)?.score ?? null));
    },
    [kb, mastery],
  );

  const dueCards = useCallback(
    (filter?: (c: Flashcard) => boolean) => {
      if (!kb) return [];
      const now = new Date();
      const active = new Set(kb.courses.filter((c) => c.is_active).map((c) => c.id));
      return kb.flashcards.filter((c) => active.has(c.course_id) && isDue(cardStates.get(c.id), now) && (!filter || filter(c)));
    },
    [kb, cardStates],
  );

  const value: AppValue = {
    ready,
    authed,
    kb,
    attempts,
    reviews,
    cardStates,
    mastery,
    courseScore,
    dueCards,
    sync: { state: syncState, lastSyncAt, pending, error: syncError },
    disclaimerSeen,
    lastTopicId,

    async login(password) {
      const { token } = await api.login(password);
      await setToken(token);
      setAuthed(true);
      await syncNow();
    },
    async logout() {
      try {
        await createSync(depo(), api).pushProgress();
      } catch {
        // gönderilemeyenler kuyrukta kalır, sonraki girişte gönderilir
      }
      await clearToken();
      setAuthed(false);
    },
    syncNow,
    getTopic: (id) => depo().getTopic(id),
    async recordAttempt(input) {
      const a: Attempt = { ...input, id: Crypto.randomUUID(), created_at: new Date().toISOString() };
      await depo().addAttempt(a);
      setAttempts((prev) => [...prev, a]);
      setPending((p) => p + 1);
      void createSync(depo(), api)
        .pushProgress()
        .then(async () => setPending(await depo().queueCount()))
        .catch(() => undefined);
      return a;
    },
    async reviewCard(cardId, grade) {
      const now = new Date();
      const st = review(cardStates.get(cardId) ?? null, grade, now, cardId);
      const r: CardReview = { id: Crypto.randomUUID(), card_id: cardId, grade, reviewed_at: now.toISOString() };
      await depo().addCardReview(r);
      await depo().putCardState(st);
      setReviews((prev) => [...prev, r]);
      setCardStates((prev) => new Map(prev).set(cardId, st));
      setPending(await depo().queueCount());
      return st;
    },
    async acceptDisclaimer() {
      await depo().setMeta("disclaimer_seen", "1");
      setDisclaimerSeen(true);
    },
    async setLastTopic(id) {
      await depo().setMeta("last_topic_id", id);
      setLastTopicId(id);
    },
    getDraft: (key) => depo().getMeta(`draft:${key}`),
    setDraft: (key, v) => depo().setMeta(`draft:${key}`, v),
    async setCourseActive(id, active) {
      const c = await api.updateCourse(id, { is_active: active });
      await depo().upsertCourse(c);
      await reloadAll();
    },
    async addCourse(input) {
      const c = await api.createCourse(input);
      await depo().upsertCourse(c);
      await reloadAll();
    },

    getMeta: (key) => depo().getMeta(key),
    setMeta: (key, v) => depo().setMeta(key, v),

    getTopicNote: (topicId) => depo().getTopicNote(topicId),
    async saveTopicNote(topicId, body) {
      await depo().putTopicNote({ topic_id: topicId, body_md: body, updated_at: new Date().toISOString() });
      setPending(await depo().queueCount());
      pushSoon();
    },
    listTopicNotes: () => depo().listTopicNotes(),
    listHighlights: (topicId) => depo().listHighlights(topicId),
    async toggleHighlight(topicId, section, blockText) {
      const hash = blockHash(blockText);
      const existing = (await depo().listHighlights(topicId)).find((h) => h.section === section && h.block_hash === hash);
      const now = new Date().toISOString();
      if (existing) await depo().putHighlight({ ...existing, deleted: true, updated_at: now });
      else
        await depo().putHighlight({
          id: Crypto.randomUUID(),
          topic_id: topicId,
          section,
          block_hash: hash,
          excerpt: blockExcerpt(blockText),
          deleted: false,
          updated_at: now,
        });
      setPending(await depo().queueCount());
      pushSoon();
      return depo().listHighlights(topicId);
    },
    async removeHighlight(h) {
      await depo().putHighlight({ ...h, deleted: true, updated_at: new Date().toISOString() });
      setPending(await depo().queueCount());
      pushSoon();
    },
    async topicTexts() {
      const v = kbData?.version ?? "";
      if (textsCache.current && textsCache.current.version === v) return textsCache.current.texts;
      const texts = await depo().listTopicTexts();
      textsCache.current = { version: v, texts };
      return texts;
    },

    reminder,
    async setReminder(patch) {
      let next: ReminderSettings = { ...latest.current.reminder, ...patch };
      if (patch.enabled && next.permission !== "granted" && next.permission !== "unsupported") {
        next = { ...next, permission: await Reminders.requestPermission() };
      }
      latest.current.reminder = next;
      setReminderState(next);
      await depo().setMeta("reminder", JSON.stringify({ enabled: next.enabled, hour: next.hour, minute: next.minute }));
      await rescheduleReminders();
    },
    rescheduleReminders,
    updateReady,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
