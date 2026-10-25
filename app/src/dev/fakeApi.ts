import type { ApiClient } from "../api";
import { ApiError, userMessage } from "../apiError";
import type { CaseGrade, ChatMessage, Course, NoteDetail, ProgressPayload, Source, Thread } from "../types";
import { blockExcerpt, blockHash, splitBlocks } from "../highlights";
import { fixtureKb } from "./fixture";

/**
 * Sunucusuz geliştirme için sahte API (EXPO_PUBLIC_USE_FIXTURE=1).
 * Uç davranışları gerçek sözleşmeyi taklit eder; gecikmeler yükleniyor durumlarını görebilmek içindir.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
let idc = 0;
const fid = (p: string) => `${p}-${Date.now().toString(36)}-${(++idc).toString(36)}`;

const kb = JSON.parse(JSON.stringify(fixtureKb)) as typeof fixtureKb;
// İlk kurulumda /progress/all ile geri yüklenen örnek kişisel not ve vurgular
const irade = kb.topics.find((t) => t.id === "HUK2011-irade-bozukluklari");
const iradeBlocks = splitBlocks(irade?.summary_md ?? "");
const serverProgress: ProgressPayload = {
  attempts: [],
  card_reviews: [],
  card_states: [],
  topic_notes: [
    {
      topic_id: "HUK2011-irade-bozukluklari",
      body_md: "Hoca derste aldatma ile korkutmayı üçüncü kişi açısından karşılaştırdı, finalde çıkabilir.\nSüre: 1 yıl, hak düşürücü!",
      updated_at: "2026-10-14T19:00:00.000Z",
    },
  ],
  highlights: [
    ...(iradeBlocks[1]
      ? [{
          id: "hl-demo-1",
          topic_id: "HUK2011-irade-bozukluklari",
          section: "summary" as const,
          block_hash: blockHash(iradeBlocks[1]),
          excerpt: blockExcerpt(iradeBlocks[1]),
          deleted: false,
          updated_at: "2026-10-14T19:05:00.000Z",
        }]
      : []),
    {
      // içeriği sonradan değişmiş bir paragrafın vurgusu ("metin değişti")
      id: "hl-demo-2",
      topic_id: "HUK2011-irade-bozukluklari",
      section: "content",
      block_hash: "000000000000",
      excerpt: "Saik yanılması kural olarak esaslı değildir; temel yanılması bunun en önemli istisnasıdır.",
      deleted: false,
      updated_at: "2026-10-13T10:00:00.000Z",
    },
  ],
};

const notes: NoteDetail[] = [
  {
    id: "note-demo-1",
    course_id: "HUK2011",
    title: "3. hafta: irade bozuklukları ders notu",
    status: "ready",
    error: null,
    created_at: "2026-10-14T18:20:00.000Z",
    summary_md: `Notta **yanılma, aldatma ve korkutma** işlenmiş.

- Esaslı yanılma hâlleri TBK m. 31'deki sırayla anlatılmış.
- Aldatmada yanılmanın esaslı olmasının gerekmediği vurgulanmış.
- Bir yıllık hak düşürücü süre ve onay sonucu açıklanmış.`,
    contradictions: [
      {
        quote: "Korkutmada süre, sözleşmenin kurulmasından itibaren bir yıldır.",
        problem: "TBK m. 39'a göre korkutmada süre, korkutmanın etkisinin ortadan kalktığı andan başlar.",
        suggestion: "Cümleyi \"korkutmanın etkisinin ortadan kalkmasından itibaren bir yıl\" olarak düzelt.",
      },
    ],
    topics: [
      { topic_id: "HUK2011-irade-bozukluklari", title: "İrade bozuklukları: yanılma, aldatma, korkutma", confidence: 0.93 },
      { topic_id: "HUK2011-asiri-yararlanma", title: "Aşırı yararlanma (gabin)", confidence: 0.41 },
    ],
    questions: [
      {
        id: "note-demo-1-q01",
        topic_id: "HUK2011-irade-bozukluklari",
        course_id: "HUK2011",
        kind: "mcq",
        stem_md: "Notuna göre aldatmanın üçüncü kişiden gelmesi hâlinde hangi şart aranır?",
        options: [
          "Hiçbir şart aranmaz.",
          "Karşı tarafın aldatmayı bilmesi veya bilmesinin gerekmesi.",
          "Yanılmanın esaslı olması.",
          "Noter onayı.",
        ],
        correct_option: 1,
        explanation_md: "Üçüncü kişinin aldatmasında karşı tarafın bunu **bilmesi veya bilmesinin gerekmesi** aranır (TBK m. 36/2).",
        rubric: null,
        model_answer_md: null,
        origin: "note",
        note_id: "note-demo-1",
      },
    ],
    flashcards: [
      {
        id: "note-demo-1-k01",
        topic_id: "HUK2011-irade-bozukluklari",
        course_id: "HUK2011",
        front_md: "Korkutmada bir yıllık süre ne zaman başlar?",
        back_md: "Korkutmanın **etkisinin ortadan kalktığı** andan (TBK m. 39).",
        origin: "note",
        note_id: "note-demo-1",
      },
    ],
  },
];

const threads: Thread[] = [
  { id: "thr-demo-1", title: "Olası kast ve bilinçli taksir farkı", topic_id: "HUK2013-kast-ve-taksir", created_at: "2026-10-15T20:10:00.000Z" },
];
const messages: Record<string, ChatMessage[]> = {
  "thr-demo-1": [
    { id: "m1", thread_id: "thr-demo-1", role: "user", content_md: "Olası kast ile bilinçli taksiri nasıl ayırırım?", created_at: "2026-10-15T20:10:00.000Z" },
    {
      id: "m2",
      thread_id: "thr-demo-1",
      role: "assistant",
      content_md: `İkisinde de fail neticeyi **öngörür**. Fark, neticeye karşı tutumdadır:

- **Olası kast:** "Olursa olsun" der, neticeyi kabullenir (TCK m. 21/2). Ceza **indirilir**.
- **Bilinçli taksir:** Neticenin gerçekleşmeyeceğine **güvenir** (TCK m. 22/3). Ceza **artırılır**.

Olayda failin sözlerine ve neticeyi önlemek için bir çaba gösterip göstermediğine bak.`,
      sources: [
        { type: "kb", label: "Kast ve taksir", ref: "HUK2013-kast-ve-taksir" },
        { type: "madde", label: "TCK m. 21", ref: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5237&MevzuatTur=1&MevzuatTertip=5" },
        { type: "madde", label: "TCK m. 22", ref: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5237&MevzuatTur=1&MevzuatTertip=5" },
      ],
      model: "claude-sonnet-5-5",
      created_at: "2026-10-15T20:10:20.000Z",
    },
  ],
};

let spent = 7.42;

function guardAi() {
  if (spent >= 50) throw new ApiError(402, userMessage(402));
}

function fakeAnswer(content: string, deep: boolean, topicTitle: string | null): { md: string; sources: Source[] } {
  const lower = content.toLocaleLowerCase("tr");
  if (lower.includes("3 soru")) {
    return {
      md: `İşte konudan üç soru:

1. Aldatmada yanılmanın esaslı olması gerekir mi? Neden?
2. Üçüncü kişinin korkutmasında karşı tarafın bunu bilmesi aranır mı?
3. Korkutmada bir yıllık süre hangi andan başlar?

Cevaplarını yaz, birlikte kontrol edelim.`,
      sources: [{ type: "kb", label: topicTitle ?? "Bilgi bankası", ref: "HUK2011-irade-bozukluklari" }],
    };
  }
  if (lower.includes("basit")) {
    return {
      md: `Daha basit anlatayım: Bir sözleşmeyi **kandırılarak**, **korkutularak** ya da **önemli bir konuda yanılarak** yaptıysan, kanun sana "ben bu sözleşmeyle bağlı değilim" deme hakkı verir. Bunun için **bir yılın** var.`,
      sources: [{ type: "madde", label: "TBK m. 39", ref: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5" }],
    };
  }
  return {
    md: `${deep ? "**Ayrıntılı cevap:** " : ""}Bu sorunun cevabı konunun anlatımında ve ilgili maddelerde. Özetle:

- Önce olaydaki **unsurları** tek tek tespit et.
- Her unsur için ilgili **maddeyi** göster.
- Sonuçta hangi hakkın, hangi süre içinde kullanılacağını yaz.

> Bu cevap geliştirme verisiyle üretildi. Gerçek asistan, bilgi bankası, Mevzuat ve İçtihat kaynaklarına başvurur.`,
    sources: [
      { type: "kb", label: topicTitle ?? "Bilgi bankası", ref: "HUK2011-irade-bozukluklari" },
      { type: "madde", label: "TBK m. 36", ref: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5" },
      { type: "karar", label: "Yargıtay (örnek kayıt)", ref: "https://karararama.yargitay.gov.tr" },
      { type: "web", label: "Resmî Gazete", ref: "https://www.resmigazete.gov.tr" },
    ],
  };
}

function gradeLocally(questionId: string, answer: string): CaseGrade {
  const q = kb.questions.find((x) => x.id === questionId);
  const rubric = q?.rubric ?? [];
  const text = answer.toLocaleLowerCase("tr");
  const hit: string[] = [];
  const missed: CaseGrade["missed"] = [];
  let score = 0;
  for (const r of rubric) {
    const keys = (r.madde_ref ?? "").toLocaleLowerCase("tr").match(/\d+/g) ?? [];
    const words = r.point.toLocaleLowerCase("tr").split(/\s+/).filter((w) => w.length > 5).slice(0, 3);
    const found = keys.some((k) => text.includes(k)) || words.some((w) => text.includes(w));
    if (found) {
      hit.push(r.point);
      score += r.weight;
    } else missed.push({ point: r.point, madde_ref: r.madde_ref });
  }
  const length = Math.min(15, Math.floor(answer.length / 60));
  score = Math.min(100, score + length);
  return {
    score,
    correct_points: hit,
    missed,
    missing_discussions: score < 80 ? ["Sonuç kısmında tarafların başvurabileceği diğer yolları da tartış."] : [],
    feedback_md: `Cevabın **${answer.length} karakter**. ${
      score >= 70 ? "Ana sorunları doğru tespit etmişsin." : "Ana sorunlardan bazılarını atlamışsın."
    } Her tespitten sonra ilgili maddeyi yazmayı unutma.`,
    model_answer_md: q?.model_answer_md ?? "",
  };
}

export const fakeApi: ApiClient = {
  async login(password) {
    await wait(500);
    if (!password.trim()) throw new ApiError(401, "Şifre yanlış.");
    return { token: "fixture-token" };
  },
  async getKbVersion() {
    await wait(150);
    return { version: kb.version };
  },
  async exportKb() {
    await wait(500);
    return JSON.parse(JSON.stringify(kb));
  },
  async createCourse(input) {
    await wait(300);
    const c: Course = { id: input.code, code: input.code, name: input.name, year: input.year, sort_order: kb.courses.length + 1, is_active: true };
    kb.courses.push(c);
    kb.version = `fixture-${Date.now()}`;
    return c;
  },
  async updateCourse(id, patch) {
    await wait(250);
    const c = kb.courses.find((x) => x.id === id);
    if (!c) throw new ApiError(404, "Ders bulunamadı.");
    Object.assign(c, patch);
    kb.version = `fixture-${Date.now()}`;
    return { ...c };
  },
  async syncProgress(p) {
    await wait(200);
    const has = new Set(serverProgress.attempts.map((a) => a.id));
    for (const a of p.attempts) if (!has.has(a.id)) serverProgress.attempts.push(a);
    const hr = new Set(serverProgress.card_reviews.map((r) => r.id));
    for (const r of p.card_reviews) if (!hr.has(r.id)) serverProgress.card_reviews.push(r);
    for (const s of p.card_states) {
      const i = serverProgress.card_states.findIndex((x) => x.card_id === s.card_id);
      if (i >= 0) serverProgress.card_states[i] = s;
      else serverProgress.card_states.push(s);
    }
    const notes = (serverProgress.topic_notes ??= []);
    for (const n of p.topic_notes ?? []) {
      const i = notes.findIndex((x) => x.topic_id === n.topic_id);
      if (i < 0) notes.push(n);
      else if (notes[i].updated_at < n.updated_at) notes[i] = n;
    }
    const hls = (serverProgress.highlights ??= []);
    for (const h of p.highlights ?? []) {
      const i = hls.findIndex((x) => x.id === h.id);
      if (i < 0) hls.push(h);
      else if (hls[i].updated_at < h.updated_at) hls[i] = h;
    }
    return { ok: true, server_time: now() };
  },
  async getAllProgress() {
    await wait(200);
    // gerçek sunucu gibi: silinmiş vurgular dönmez
    const copy = JSON.parse(JSON.stringify(serverProgress)) as ProgressPayload;
    copy.highlights = (copy.highlights ?? []).filter((h) => !h.deleted);
    return copy;
  },
  async uploadNote(file, courseId, title) {
    await wait(900);
    if (file.size && file.size > 40 * 1024 * 1024) throw new ApiError(413, userMessage(413));
    const id = fid("note");
    const note: NoteDetail = {
      id,
      course_id: courseId,
      title,
      status: "processing",
      error: null,
      created_at: now(),
      summary_md: null,
      contradictions: [],
      topics: [],
      questions: [],
      flashcards: [],
    };
    notes.unshift(note);
    setTimeout(() => {
      Object.assign(note, {
        status: "ready",
        summary_md: `**${title}** notunun özeti (geliştirme verisi). Notta konunun temel kavramları ve ilgili maddeler işlenmiş.`,
        topics: [{ topic_id: kb.topics.find((t) => t.course_id === courseId)?.id ?? "", title: kb.topics.find((t) => t.course_id === courseId)?.title ?? "", confidence: 0.8 }],
      });
    }, 7000);
    return { id, status: "processing" };
  },
  async listNotes() {
    await wait(300);
    return notes.map(({ id, course_id, title, status, error, created_at }) => ({ id, course_id, title, status, error, created_at }));
  },
  async getNote(id) {
    await wait(300);
    const n = notes.find((x) => x.id === id);
    if (!n) throw new ApiError(404, "Not bulunamadı.");
    return JSON.parse(JSON.stringify(n));
  },
  async deleteNote(id) {
    await wait(300);
    const i = notes.findIndex((x) => x.id === id);
    if (i >= 0) notes.splice(i, 1);
  },
  async gradeCase(questionId, answerText) {
    guardAi();
    await wait(2500);
    spent += 0.21;
    return gradeLocally(questionId, answerText);
  },
  async createThread(topicId, noteId) {
    await wait(250);
    const topic = kb.topics.find((t) => t.id === topicId);
    const note = noteId ? notes.find((n) => n.id === noteId) : undefined;
    const t: Thread = {
      id: fid("thr"),
      title: topic ? topic.title : note ? `${note.title} hakkında` : "Yeni sohbet",
      topic_id: topicId ?? null,
      note_id: note?.id ?? null,
      note_title: note?.title ?? null,
      created_at: now(),
    };
    threads.unshift(t);
    messages[t.id] = [];
    return t;
  },
  async listThreads() {
    await wait(250);
    return [...threads];
  },
  async deleteThread(id) {
    await wait(250);
    const i = threads.findIndex((t) => t.id === id);
    if (i >= 0) threads.splice(i, 1);
    delete messages[id];
  },
  async getMessages(id) {
    await wait(250);
    return [...(messages[id] ?? [])];
  },
  async sendMessage(id, content, deep) {
    guardAi();
    // gerçek sunucu gibi: soru cevapla birlikte, cevap bitince kaydedilir
    await wait(deep ? 3500 : 2000);
    const list = messages[id] ?? (messages[id] = []);
    list.push({ id: fid("m"), thread_id: id, role: "user", content_md: content, created_at: now() });
    const thread = threads.find((t) => t.id === id);
    const topicTitle = kb.topics.find((t) => t.id === thread?.topic_id)?.title ?? null;
    const a = fakeAnswer(content, deep, topicTitle);
    const msg: ChatMessage = {
      id: fid("m"),
      thread_id: id,
      role: "assistant",
      content_md: a.md,
      sources: a.sources,
      model: deep ? "claude-opus-5-5" : "claude-sonnet-5-5",
      created_at: now(),
    };
    list.push(msg);
    spent += deep ? 0.12 : 0.03;
    if (thread && thread.title === "Yeni sohbet") thread.title = content.slice(0, 48);
    return { message: msg, suggest_new_thread: list.length >= 20 };
  },
  async getUsage() {
    await wait(250);
    return {
      month: new Date().toISOString().slice(0, 7),
      cost_usd: Math.round(spent * 100) / 100,
      pipeline_cost_usd: 23.86,
      cap_usd: 50,
      by_feature: { asistan: Math.round(spent * 0.62 * 100) / 100, olay_puanlama: Math.round(spent * 0.23 * 100) / 100, notlar: Math.round(spent * 0.15 * 100) / 100 },
    };
  },
};
