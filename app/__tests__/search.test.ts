import { foldTr, searchKb, buildSearchDocs, makeSnippet, groupHits, type SearchDoc } from "../src/search";

describe("foldTr (Türkçe katlama)", () => {
  test("büyük/küçük harf ve ı/i, ş, ğ, ç, ö, ü katlanır", () => {
    expect(foldTr("ZİLYETLİK")).toBe("zilyetlik");
    expect(foldTr("zilyetlık")).toBe("zilyetlik");
    expect(foldTr("Şüfa Hakkı")).toBe("sufa hakki");
    expect(foldTr("ĞÇÖÜ")).toBe("gcou");
    expect(foldTr("hâkim")).toBe("hakim");
  });
});

const doc = (over: Partial<SearchDoc>): SearchDoc => ({
  key: over.key ?? Math.random().toString(36),
  kind: "content",
  title: "Konu",
  text: "",
  course_id: "HUK3011",
  topic_id: "t1",
  target: { pathname: "/konu/t1" },
  ...over,
});

describe("searchKb", () => {
  test("büyük harfli ve ı'lı arama aynı sonucu verir", () => {
    const docs = [doc({ key: "a", kind: "content", text: "Zilyetlik, eşya üzerindeki fiilî hâkimiyettir." })];
    expect(searchKb(docs, "ZİLYETLİK")).toHaveLength(1);
    expect(searchKb(docs, "zilyetlık")).toHaveLength(1);
    expect(searchKb(docs, "hakimiyet")).toHaveLength(1);
  });

  test("birden çok sözcükte hepsi geçmeli (AND)", () => {
    const docs = [
      doc({ key: "a", text: "Dolaysız zilyetlik ve dolaylı zilyetlik ayrımı" }),
      doc({ key: "b", text: "Zilyetliğin korunması davaları" }),
    ];
    expect(searchKb(docs, "dolaylı zilyetlik").map((h) => h.doc.key)).toEqual(["a"]);
    expect(searchKb(docs, "zilyet").map((h) => h.doc.key).sort()).toEqual(["a", "b"]);
    expect(searchKb(docs, "zilyet tapu")).toHaveLength(0);
  });

  test("başlık eşleşmesi sözlükten, sözlük özetten, özet anlatımdan, anlatım sorudan, soru karttan, kart nottan önce gelir", () => {
    const docs = [
      doc({ key: "note", kind: "note", text: "aldatma notum" }),
      doc({ key: "card", kind: "card", text: "aldatma kartı" }),
      doc({ key: "q", kind: "question", text: "aldatma sorusu" }),
      doc({ key: "content", kind: "content", text: "aldatma anlatımı" }),
      doc({ key: "summary", kind: "summary", text: "aldatma özeti" }),
      doc({ key: "gloss", kind: "glossary", text: "Aldatma: hile" }),
      doc({ key: "title", kind: "topic_title", title: "Aldatma", text: "Aldatma" }),
    ];
    expect(searchKb(docs, "aldatma").map((h) => h.doc.key)).toEqual(["title", "gloss", "summary", "content", "q", "card", "note"]);
  });

  test("ders filtresi", () => {
    const docs = [doc({ key: "a", text: "kast", course_id: "HUK2013" }), doc({ key: "b", text: "kast", course_id: "HUK2011" })];
    expect(searchKb(docs, "kast", { courseId: "HUK2013" }).map((h) => h.doc.key)).toEqual(["a"]);
  });

  test("boş ya da çok kısa sorgu sonuç vermez", () => {
    const docs = [doc({ text: "a b c" })];
    expect(searchKb(docs, "  ")).toEqual([]);
    expect(searchKb(docs, "a")).toEqual([]);
  });
});

describe("makeSnippet", () => {
  test("eşleşmenin çevresini ~120 karakterle verir ve eşleşmeyi işaretler", () => {
    const long = `${"x".repeat(200)} Önemli: ZİLYETLİK burada geçiyor ${"y".repeat(200)}`;
    const s = makeSnippet(long, ["zilyetlik"]);
    const joined = s.parts.map((p) => p.text).join("");
    expect(joined.length).toBeLessThanOrEqual(130);
    expect(s.parts.some((p) => p.match && p.text === "ZİLYETLİK")).toBe(true);
    expect(s.start).toBe(true);
    expect(s.end).toBe(true);
  });

  test("markdown işaretleri snippet'ta görünmez", () => {
    const s = makeSnippet("**Kast**, bilerek ve __istenerek__ işlemektir.", ["istenerek"]);
    const joined = s.parts.map((p) => p.text).join("");
    expect(joined).not.toContain("*");
    expect(joined).not.toContain("_");
    expect(s.parts.find((p) => p.match)?.text).toBe("istenerek");
  });
});

describe("buildSearchDocs", () => {
  test("konu, sözlük, soru, kart ve notlardan doğru hedeflerle belge üretir", () => {
    const docs = buildSearchDocs({
      topics: [
        {
          id: "t1",
          title: "Zilyetlik",
          course_id: "HUK3011",
          summary_md: "Özet",
          content_md: "Anlatım",
          critical_md: "",
          doctrine_md: "",
          glossary: [{ term: "Dolaylı zilyet", definition: "Tanım" }],
        },
      ],
      questions: [
        { id: "q1", topic_id: "t1", course_id: "HUK3011", kind: "mcq", stem_md: "Soru", options: ["a"], correct_option: 0, explanation_md: null, rubric: null, model_answer_md: null, origin: "bank", note_id: null },
        { id: "q2", topic_id: null, course_id: "HUK3011", kind: "mcq", stem_md: "Not sorusu", options: ["a"], correct_option: 0, explanation_md: null, rubric: null, model_answer_md: null, origin: "note", note_id: "n1" },
      ],
      flashcards: [{ id: "k1", topic_id: "t1", course_id: "HUK3011", front_md: "Ön", back_md: "Arka", origin: "bank", note_id: null }],
      notes: [{ topic_id: "t1", body_md: "Kendi notum", updated_at: "x" }],
      highlights: [],
    });
    const by = (kind: string) => docs.filter((d) => d.kind === kind);
    expect(by("topic_title")[0].target).toEqual({ pathname: "/konu/t1" });
    expect(by("glossary")[0].target).toEqual({ pathname: "/konu/t1", params: { sekme: "sozluk" } });
    expect(by("content")[0].target.params).toEqual({ sekme: "anlatim" });
    const qs = by("question");
    expect(qs.find((d) => d.key.includes("q1"))?.target).toEqual({ pathname: "/quiz", params: { scope: "topic", id: "t1" } });
    expect(qs.find((d) => d.key.includes("q2"))?.target).toEqual({ pathname: "/not/n1" });
    expect(by("card")[0].target).toEqual({ pathname: "/konu/t1" });
    expect(by("note")[0].target).toEqual({ pathname: "/konu/t1", params: { sekme: "notum" } });
  });
});

describe("groupHits", () => {
  test("Konular grubunda bir konu bir kez görünür, gruplar sabit sırada", () => {
    const docs = [
      doc({ key: "c", kind: "card", text: "kast kartı" }),
      doc({ key: "t", kind: "topic_title", title: "Kast", text: "Kast" }),
      doc({ key: "s", kind: "summary", text: "kast özeti" }),
      doc({ key: "g", kind: "glossary", text: "Kast: bilme ve isteme" }),
    ];
    const g = groupHits(searchKb(docs, "kast"));
    expect(g.map((x) => x.group)).toEqual(["Konular", "Kavramlar", "Kartlar"]);
    expect(g[0].hits.map((h) => h.doc.key)).toEqual(["t"]);
  });
});
