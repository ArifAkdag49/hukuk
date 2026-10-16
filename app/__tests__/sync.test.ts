import { createSync, type SyncApi } from "../src/sync";
import { MemoryDepo } from "../src/db/memoryDepo";
import type { KbExport, ProgressPayload } from "../src/types";

const kb = (version: string): KbExport => ({
  version,
  courses: [{ id: "HUK2011", code: "HUK2011", name: "Borçlar Genel", year: 2, sort_order: 1, is_active: true }],
  units: [{ id: "HUK2011-u01", course_id: "HUK2011", title: "Kuruluş", sort_order: 1 }],
  topics: [
    {
      id: "HUK2011-kurulus", unit_id: "HUK2011-u01", course_id: "HUK2011", title: "Sözleşmenin kurulması",
      sort_order: 1, summary_md: "özet", content_md: "anlatım", critical_md: "", doctrine_md: "", glossary: [],
      verification_status: "verified", generated_at: null, articles: [], cases: [],
    },
  ],
  questions: [],
  flashcards: [],
  tables: [],
});

function fakeApi(over: Partial<SyncApi> = {}) {
  const sent: ProgressPayload[] = [];
  const api: SyncApi = {
    getKbVersion: jest.fn(async () => ({ version: "v2" })),
    exportKb: jest.fn(async () => kb("v2")),
    syncProgress: jest.fn(async (p: ProgressPayload) => {
      sent.push(p);
      return { ok: true, server_time: new Date().toISOString() };
    }),
    getAllProgress: jest.fn(async () => ({ attempts: [], card_reviews: [], card_states: [] })),
    ...over,
  };
  return { api, sent };
}

describe("KB senkronizasyonu", () => {
  test("sürüm değiştiyse export indirir ve depoya yazar", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    const { api } = fakeApi();
    const sync = createSync(depo, api);
    const r = await sync.syncKb();
    expect(r.updated).toBe(true);
    expect(api.exportKb).toHaveBeenCalledTimes(1);
    expect((await depo.loadKbIndex())?.version).toBe("v2");
    expect((await depo.getTopic("HUK2011-kurulus"))?.content_md).toBe("anlatım");
  });

  test("sürüm aynıysa export indirmez", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.replaceKb(kb("v2"));
    const { api } = fakeApi();
    const r = await createSync(depo, api).syncKb();
    expect(r.updated).toBe(false);
    expect(api.exportKb).not.toHaveBeenCalled();
  });
});

describe("ilerleme kuyruğu", () => {
  test("çevrimdışı kayıtlar kuyrukta bekler, gönderim başarılı olunca silinir", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.addAttempt({ id: "a1", question_id: "q1", kind: "mcq", selected_option: 0, correct: true, created_at: "2026-10-16T10:00:00.000Z" });
    await depo.addCardReview({ id: "r1", card_id: "k1", grade: "good", reviewed_at: "2026-10-16T10:01:00.000Z" });
    await depo.putCardState({ card_id: "k1", ease: 2.5, interval_days: 1, repetitions: 1, due_at: "2026-10-17T10:01:00.000Z", last_grade: "good", updated_at: "2026-10-16T10:01:00.000Z" });
    expect(await depo.queueCount()).toBe(3);

    const { api, sent } = fakeApi();
    const r = await createSync(depo, api).pushProgress();
    expect(r.sent).toBe(3);
    expect(sent[0].attempts.map((a) => a.id)).toEqual(["a1"]);
    expect(sent[0].card_reviews.map((x) => x.id)).toEqual(["r1"]);
    expect(sent[0].card_states.map((x) => x.card_id)).toEqual(["k1"]);
    expect(await depo.queueCount()).toBe(0);
  });

  test("aynı kartın durumu kuyrukta tek kayıt olarak tutulur (son hâli)", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    const base = { card_id: "k1", ease: 2.5, repetitions: 1, last_grade: "good" as const, due_at: "x", updated_at: "x" };
    await depo.putCardState({ ...base, interval_days: 1 });
    await depo.putCardState({ ...base, interval_days: 6 });
    expect(await depo.queueCount()).toBe(1);
    const { api, sent } = fakeApi();
    await createSync(depo, api).pushProgress();
    expect(sent[0].card_states).toHaveLength(1);
    expect(sent[0].card_states[0].interval_days).toBe(6);
  });

  test("gönderim başarısız olursa kayıtlar kuyrukta kalır", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.addAttempt({ id: "a1", question_id: "q1", kind: "mcq", correct: false, created_at: "2026-10-16T10:00:00.000Z" });
    const { api } = fakeApi({
      syncProgress: jest.fn(async () => {
        throw new Error("ağ yok");
      }),
    });
    await expect(createSync(depo, api).pushProgress()).rejects.toThrow("ağ yok");
    expect(await depo.queueCount()).toBe(1);
    expect(await depo.listAttempts()).toHaveLength(1);
  });

  test("boş kuyrukta sunucuya istek atılmaz", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    const { api } = fakeApi();
    const r = await createSync(depo, api).pushProgress();
    expect(r.sent).toBe(0);
    expect(api.syncProgress).not.toHaveBeenCalled();
  });
});

describe("ilk kurulumda geri yükleme", () => {
  test("yerel ilerleme boşsa sunucudakini kuyruğa koymadan yükler, ikinci kez çalışmaz", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    const { api } = fakeApi({
      getAllProgress: jest.fn(async () => ({
        attempts: [{ id: "a9", question_id: "q1", kind: "mcq" as const, correct: true, created_at: "2026-10-01T10:00:00.000Z" }],
        card_reviews: [],
        card_states: [],
      })),
    });
    const sync = createSync(depo, api);
    expect(await sync.restoreProgressIfFirstRun()).toBe(true);
    expect(await depo.listAttempts()).toHaveLength(1);
    expect(await depo.queueCount()).toBe(0);
    expect(await sync.restoreProgressIfFirstRun()).toBe(false);
    expect(api.getAllProgress).toHaveBeenCalledTimes(1);
  });
});

describe("konu notları ve vurgular", () => {
  test("not ve vurgu kuyruğa girer ve gönderilir; aynı konunun notu tek kayıt", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.putTopicNote({ topic_id: "t1", body_md: "ilk", updated_at: "2026-10-16T10:00:00.000Z" });
    await depo.putTopicNote({ topic_id: "t1", body_md: "son", updated_at: "2026-10-16T10:01:00.000Z" });
    await depo.putHighlight({ id: "h1", topic_id: "t1", section: "content", block_hash: "abc123abc123", excerpt: "Kast", deleted: false, updated_at: "2026-10-16T10:02:00.000Z" });
    expect(await depo.queueCount()).toBe(2);
    const { api, sent } = fakeApi();
    await createSync(depo, api).pushProgress();
    expect(sent[0].topic_notes).toEqual([{ topic_id: "t1", body_md: "son", updated_at: "2026-10-16T10:01:00.000Z" }]);
    expect(sent[0].highlights?.map((h) => h.id)).toEqual(["h1"]);
    expect(await depo.queueCount()).toBe(0);
  });

  test("vurgu silme: deleted:true ile tombstone gönderilir, listede görünmez", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    const h = { id: "h1", topic_id: "t1", section: "summary" as const, block_hash: "x", excerpt: "e", deleted: false, updated_at: "2026-10-16T10:00:00.000Z" };
    await depo.putHighlight(h);
    await depo.putHighlight({ ...h, deleted: true, updated_at: "2026-10-16T10:05:00.000Z" });
    expect(await depo.listHighlights("t1")).toHaveLength(0);
    const { api, sent } = fakeApi();
    await createSync(depo, api).pushProgress();
    expect(sent[0].highlights).toEqual([{ ...h, deleted: true, updated_at: "2026-10-16T10:05:00.000Z" }]);
  });

  test("geri yükleme yereldeki daha yeni notu ve vurguyu ezmez", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.putTopicNote({ topic_id: "t1", body_md: "yerel yeni", updated_at: "2026-10-16T12:00:00.000Z" }, false);
    await depo.importProgress({
      attempts: [],
      card_reviews: [],
      card_states: [],
      topic_notes: [
        { topic_id: "t1", body_md: "sunucu eski", updated_at: "2026-10-16T09:00:00.000Z" },
        { topic_id: "t2", body_md: "sunucu", updated_at: "2026-10-16T09:00:00.000Z" },
      ],
      highlights: [{ id: "h9", topic_id: "t2", section: "critical", block_hash: "b", excerpt: "e", deleted: false, updated_at: "2026-10-16T09:00:00.000Z" }],
    });
    expect((await depo.getTopicNote("t1"))?.body_md).toBe("yerel yeni");
    expect((await depo.getTopicNote("t2"))?.body_md).toBe("sunucu");
    expect(await depo.listHighlights("t2")).toHaveLength(1);
    expect(await depo.queueCount()).toBe(0);
  });

  test("eski sunucu cevabında notlar/vurgular yoksa da içe alma çalışır", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.importProgress({ attempts: [], card_reviews: [], card_states: [] });
    expect(await depo.listTopicNotes()).toEqual([]);
  });
});

describe("listTopicTexts", () => {
  test("arama için konu metinlerini verir", async () => {
    const depo = new MemoryDepo();
    await depo.init();
    await depo.replaceKb(kb("v1"));
    const t = await depo.listTopicTexts();
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ id: "HUK2011-kurulus", title: "Sözleşmenin kurulması", content_md: "anlatım", course_id: "HUK2011" });
  });
});
