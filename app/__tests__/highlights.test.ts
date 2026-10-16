import { splitBlocks, blockHash, blockExcerpt, fnv1a64 } from "../src/highlights";

describe("splitBlocks", () => {
  test("boş satırlarla paragraflara böler", () => {
    const md = "Birinci paragraf.\nDevamı.\n\nİkinci paragraf.\n\n\n## Başlık\nAltındaki metin.";
    expect(splitBlocks(md)).toEqual(["Birinci paragraf.\nDevamı.", "İkinci paragraf.", "## Başlık\nAltındaki metin."]);
  });

  test("aralarında boş satır olan liste maddeleri tek blok kalır", () => {
    const md = "Giriş:\n\n- bir\n- iki\n\n- üç\n\n1. sıralı\n2. liste\n\nSon.";
    expect(splitBlocks(md)).toEqual(["Giriş:", "- bir\n- iki\n\n- üç\n\n1. sıralı\n2. liste", "Son."]);
  });

  test("Windows satır sonlarını da tanır, boş metinde boş dizi", () => {
    expect(splitBlocks("a\r\n\r\nb")).toEqual(["a", "b"]);
    expect(splitBlocks("   \n\n ")).toEqual([]);
  });
});

describe("blockHash", () => {
  test("FNV-1a 64 bilinen değer", () => {
    expect(fnv1a64("")).toBe("cbf29ce484222325");
    expect(fnv1a64("a")).toBe("af63dc4c8601ec8c");
  });

  test("12 haneli, boşluk farklarına duyarsız, içerik değişince farklı", () => {
    const h = blockHash("Kast,  bilerek ve\nistenerek  işlemektir.");
    expect(h).toMatch(/^[0-9a-f]{12}$/);
    expect(blockHash("Kast, bilerek ve istenerek işlemektir.")).toBe(h);
    expect(blockHash("Kast, bilerek ve isteyerek işlemektir.")).not.toBe(h);
  });
});

describe("blockExcerpt", () => {
  test("markdown işaretleri olmadan en fazla 200 karakter", () => {
    const e = blockExcerpt(`## **Kast** ${"a".repeat(300)}`);
    expect(e.startsWith("Kast ")).toBe(true);
    expect(e.length).toBeLessThanOrEqual(200);
  });
});
