import * as Crypto from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { ApiError, api, errorText, setUnauthorizedHandler } from "../api";
import { buildMastery, type KbLookup } from "../analysis";
import { clearToken, getToken, setToken } from "../auth/token";
import { createDepo } from "../db/depo";
import type { Depo, KbIndexData } from "../db/types";
import { courseMastery, type Mastery } from "../mastery";
import { isDue, review } from "../sm2";
import { createSync, META_LAST_SYNC } from "../sync";
import type { Attempt, CardReview, CardState, Course, Flashcard, Grade, Question, Topic, TopicLite, Unit } from "../types";

/**
 * Uygulama durumu: yerel depo, bellekteki KB dizini, ilerleme, ustalık ve senkronizasyon.
 * Ekranlar yalnızca useApp() ile buraya erişir.
 */

export type SyncState = "idle" | "syncing" | "offline" | "error";

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
      await reloadAll();
      if (!alive) return;
      setDisclaimerSeen(seen === "1");
      setAuthed(!!token);
      setReady(true);
      if (token) void syncNow();
    })();
    return () => {
      alive = false;
    };
  }, [reloadAll, syncNow]);

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
      }
    });
    return () => sub.remove();
  }, [authed, syncNow]);

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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
