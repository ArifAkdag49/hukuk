import type { TopicText } from "./db/types";
import type { Flashcard, Highlight, Question, TopicNote } from "./types";

/**
 * Çevrimdışı uygulama içi arama (saf). Türkçe katlama, AND mantığı, tür önceliğine göre sıralama
 * ve eşleşmesi işaretli kısa önizleme.
 */

export type DocKind =
  | "topic_title"
  | "glossary"
  | "summary"
  | "critical"
  | "content"
  | "doctrine"
  | "question"
  | "card"
  | "note"
  | "highlight";

/** Küçük sayı = önce gelir. */
export const KIND_RANK: Record<DocKind, number> = {
  topic_title: 0,
  glossary: 1,
  summary: 2,
  critical: 2,
  content: 3,
  doctrine: 3,
  question: 4,
  card: 5,
  note: 6,
  highlight: 6,
};

export type SearchGroup = "Konular" | "Kavramlar" | "Sorular" | "Kartlar" | "Notlarım";

export const KIND_GROUP: Record<DocKind, SearchGroup> = {
  topic_title: "Konular",
  summary: "Konular",
  critical: "Konular",
  content: "Konular",
  doctrine: "Konular",
  glossary: "Kavramlar",
  question: "Sorular",
  card: "Kartlar",
  note: "Notlarım",
  highlight: "Notlarım",
};

export interface SearchTarget {
  pathname: string;
  params?: Record<string, string>;
}

export interface SearchDoc {
  key: string;
  kind: DocKind;
  /** Sonuç satırında görünen başlık (ör. konu adı ya da sözlük terimi). */
  title: string;
  /** Aranan metin (markdown olabilir). */
  text: string;
  course_id: string;
  topic_id: string | null;
  target: SearchTarget;
}

export interface SnippetPart {
  text: string;
  match: boolean;
}

export interface Snippet {
  parts: SnippetPart[];
  /** Başta kesildi mi (… gösterilir) */
  start: boolean;
  /** Sonda kesildi mi */
  end: boolean;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  snippet: Snippet;
}

// ------------------------------------------------------------------ Katlama

const FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ç: "c", ö: "o", ü: "u", â: "a", î: "i", û: "u" };

function foldChar(ch: string): string {
  let c = ch.toLocaleLowerCase("tr");
  c = c
    .split("")
    .map((x) => FOLD[x] ?? x)
    .join("");
  // kalan birleşik aksanları at (ör. "é")
  return c.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "ZİLYETLİK" / "zilyetlık" / "Zilyetlik" → "zilyetlik" */
export function foldTr(s: string): string {
  let out = "";
  for (const ch of s) out += foldChar(ch);
  return out;
}

/** Katlanmış metin + her katlanmış karakterin özgün metindeki konumu. */
function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of s) {
    const f = foldChar(ch);
    for (let k = 0; k < f.length; k++) {
      folded += f[k];
      map.push(i);
    }
    i += ch.length;
  }
  map.push(i);
  return { folded, map };
}

/** Önizleme için markdown işaretlerini kaldırır. */
export function stripMd(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function queryTerms(query: string): string[] {
  return foldTr(query)
    .split(/[\s,.;:!?()"'“”]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ------------------------------------------------------------------ Önizleme

const SNIPPET_LEN = 120;
const LEAD = 40;

export function makeSnippet(text: string, terms: string[]): Snippet {
  const plain = stripMd(text);
  const { folded, map } = foldWithMap(plain);
  let first = -1;
  for (const t of terms) {
    const p = folded.indexOf(t);
    if (p >= 0 && (first < 0 || p < first)) first = p;
  }
  const origFirst = first >= 0 ? map[first] : 0;
  let start = Math.max(0, origFirst - LEAD);
  // sözcük ortasından başlama
  if (start > 0) {
    const sp = plain.indexOf(" ", start);
    if (sp >= 0 && sp < origFirst) start = sp + 1;
  }
  let end = Math.min(plain.length, start + SNIPPET_LEN);
  if (end < plain.length) {
    const sp = plain.lastIndexOf(" ", end);
    if (sp > origFirst) end = sp;
  }

  // Penceredeki bütün eşleşmeleri işaretle
  const ranges: [number, number][] = [];
  for (const t of terms) {
    let from = 0;
    while (t.length > 0) {
      const p = folded.indexOf(t, from);
      if (p < 0) break;
      const a = map[p];
      const b = map[p + t.length];
      if (a >= start && b <= end) ranges.push([a, b]);
      from = p + t.length;
    }
  }
  ranges.sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const parts: SnippetPart[] = [];
  let cur = start;
  for (const [a, b] of merged) {
    if (a > cur) parts.push({ text: plain.slice(cur, a), match: false });
    parts.push({ text: plain.slice(a, b), match: true });
    cur = b;
  }
  if (cur < end) parts.push({ text: plain.slice(cur, end), match: false });
  return { parts, start: start > 0, end: end < plain.length };
}

// ------------------------------------------------------------------ Arama

export interface SearchOptions {
  courseId?: string | null;
  limit?: number;
}

/** Katlanmış metin önbelleği (aynı belge listesiyle tekrar tekrar aramak için). */
const foldCache = new WeakMap<SearchDoc, string>();
function foldedText(d: SearchDoc): string {
  let f = foldCache.get(d);
  if (f === undefined) {
    f = foldTr(stripMd(d.text));
    foldCache.set(d, f);
  }
  return f;
}

function countOcc(hay: string, needle: string): number {
  let n = 0;
  let from = 0;
  for (;;) {
    const p = hay.indexOf(needle, from);
    if (p < 0) return n;
    n++;
    from = p + needle.length;
  }
}

export function searchKb(docs: SearchDoc[], query: string, opts: SearchOptions = {}): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.join("").length < 2) return [];
  const hits: SearchHit[] = [];
  for (const d of docs) {
    if (opts.courseId && d.course_id !== opts.courseId) continue;
    const hay = foldedText(d);
    let occ = 0;
    let ok = true;
    for (const t of terms) {
      const n = countOcc(hay, t);
      if (n === 0) {
        ok = false;
        break;
      }
      occ += n;
    }
    if (!ok) continue;
    // tür önceliği belirleyici; aynı türde daha çok geçen ve tam sözcük eşleşmesi önde
    const exact = terms.every((t) => new RegExp(`(^|[^a-z0-9])${escapeRe(t)}([^a-z0-9]|$)`).test(hay)) ? 0.5 : 0;
    const score = KIND_RANK[d.kind] * 1000 - Math.min(occ, 50) - exact;
    hits.push({ doc: d, score, snippet: { parts: [], start: false, end: false } });
  }
  hits.sort((a, b) => a.score - b.score || a.doc.title.localeCompare(b.doc.title, "tr"));
  const limited = hits.slice(0, opts.limit ?? 200);
  for (const h of limited) h.snippet = makeSnippet(h.doc.text, terms);
  return limited;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ------------------------------------------------------------------ Belge üretimi

export interface SearchSources {
  topics: TopicText[];
  questions: Question[];
  flashcards: Flashcard[];
  notes: TopicNote[];
  highlights: Highlight[];
}

const SECTION_TAB: Record<string, string> = {
  summary: "ozet",
  critical: "kritik",
  content: "anlatim",
  doctrine: "anlatim",
};

export function buildSearchDocs({ topics, questions, flashcards, notes, highlights }: SearchSources): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const topicById = new Map(topics.map((t) => [t.id, t]));
  for (const t of topics) {
    const base = { course_id: t.course_id, topic_id: t.id, title: t.title };
    const konu = (sekme?: string): SearchTarget => (sekme ? { pathname: `/konu/${t.id}`, params: { sekme } } : { pathname: `/konu/${t.id}` });
    docs.push({ ...base, key: `title:${t.id}`, kind: "topic_title", text: t.title, target: konu() });
    if (t.summary_md) docs.push({ ...base, key: `summary:${t.id}`, kind: "summary", text: t.summary_md, target: konu("ozet") });
    if (t.critical_md) docs.push({ ...base, key: `critical:${t.id}`, kind: "critical", text: t.critical_md, target: konu("kritik") });
    if (t.content_md) docs.push({ ...base, key: `content:${t.id}`, kind: "content", text: t.content_md, target: konu("anlatim") });
    if (t.doctrine_md) docs.push({ ...base, key: `doctrine:${t.id}`, kind: "doctrine", text: t.doctrine_md, target: konu("anlatim") });
    t.glossary.forEach((g, i) =>
      docs.push({
        ...base,
        key: `glossary:${t.id}:${i}`,
        kind: "glossary",
        title: g.term,
        text: `${g.term}: ${g.definition}`,
        target: konu("sozluk"),
      }),
    );
  }
  for (const q of questions) {
    const topic = q.topic_id ? topicById.get(q.topic_id) : undefined;
    const target: SearchTarget = q.topic_id
      ? { pathname: "/quiz", params: { scope: "topic", id: q.topic_id } }
      : q.note_id
        ? { pathname: `/not/${q.note_id}` }
        : { pathname: "/quiz", params: { scope: "course", id: q.course_id } };
    docs.push({
      key: `question:${q.id}`,
      kind: "question",
      title: topic?.title ?? (q.note_id ? "Not sorusu" : "Soru"),
      text: [q.stem_md, q.explanation_md ?? "", q.kind === "mcq" ? (q.options ?? []).join(" ") : ""].filter(Boolean).join("\n\n"),
      course_id: q.course_id,
      topic_id: q.topic_id,
      target,
    });
  }
  for (const c of flashcards) {
    const topic = c.topic_id ? topicById.get(c.topic_id) : undefined;
    docs.push({
      key: `card:${c.id}`,
      kind: "card",
      title: topic?.title ?? "Kart",
      text: `${c.front_md}\n\n${c.back_md}`,
      course_id: c.course_id,
      topic_id: c.topic_id,
      target: c.topic_id ? { pathname: `/konu/${c.topic_id}` } : c.note_id ? { pathname: `/not/${c.note_id}` } : { pathname: "/kartlar" },
    });
  }
  for (const n of notes) {
    if (!n.body_md.trim()) continue;
    const topic = topicById.get(n.topic_id);
    docs.push({
      key: `note:${n.topic_id}`,
      kind: "note",
      title: topic?.title ?? "Notum",
      text: n.body_md,
      course_id: topic?.course_id ?? "",
      topic_id: n.topic_id,
      target: { pathname: `/konu/${n.topic_id}`, params: { sekme: "notum" } },
    });
  }
  for (const h of highlights) {
    if (h.deleted) continue;
    const topic = topicById.get(h.topic_id);
    docs.push({
      key: `highlight:${h.id}`,
      kind: "highlight",
      title: topic?.title ?? "Vurgum",
      text: h.excerpt,
      course_id: topic?.course_id ?? "",
      topic_id: h.topic_id,
      target: { pathname: `/konu/${h.topic_id}`, params: { sekme: SECTION_TAB[h.section] ?? "ozet" } },
    });
  }
  return docs;
}

/** Sonuçları gruplar; Konular grubunda her konu bir kez (en iyi eşleşmesiyle) yer alır. */
export function groupHits(hits: SearchHit[]): { group: SearchGroup; hits: SearchHit[] }[] {
  const order: SearchGroup[] = ["Konular", "Kavramlar", "Sorular", "Kartlar", "Notlarım"];
  const map = new Map<SearchGroup, SearchHit[]>(order.map((g) => [g, []]));
  const seenTopic = new Set<string>();
  for (const h of hits) {
    const g = KIND_GROUP[h.doc.kind];
    if (g === "Konular") {
      const k = h.doc.topic_id ?? h.doc.key;
      if (seenTopic.has(k)) continue;
      seenTopic.add(k);
    }
    map.get(g)!.push(h);
  }
  return order.map((group) => ({ group, hits: map.get(group)! })).filter((x) => x.hits.length > 0);
}
