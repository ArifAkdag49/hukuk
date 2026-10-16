/**
 * Konu metinlerinde paragraf/blok düzeyinde vurgulama için saf yardımcılar.
 * Bir vurgu, bloğun normalleştirilmiş metninin kısa özetiyle (block_hash) eşleşir; içerik yeniden
 * üretilip metin değişirse eşleşme kopar ve Notum listesinde "metin değişti" diye gösterilir.
 */

const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s+/;

function isListBlock(block: string): boolean {
  const first = block.split("\n").find((l) => l.trim().length > 0) ?? "";
  return LIST_LINE.test(first);
}

/** Markdown'ı boş satırlardan bloklara böler; ardışık liste blokları tek blok kalır. */
export function splitBlocks(md: string | null | undefined): string[] {
  if (!md) return [];
  const raw = md
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((b) => b.replace(/^\n+|\s+$/g, ""))
    .filter((b) => b.trim().length > 0);
  const out: string[] = [];
  for (const b of raw) {
    const prev = out[out.length - 1];
    if (prev !== undefined && isListBlock(prev) && isListBlock(b)) out[out.length - 1] = `${prev}\n\n${b}`;
    else out.push(b);
  }
  return out;
}

/** FNV-1a 64 bit, 16 haneli onaltılık. */
export function fnv1a64(input: string): string {
  let h = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  // UTF-8 baytları üzerinden (Türkçe karakterler dahil kararlı)
  const bytes = utf8(input);
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]);
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, "0");
}

function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

/** Boşluk farklarına duyarsız normal biçim. */
export function normalizeBlock(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function blockHash(text: string): string {
  return fnv1a64(normalizeBlock(text)).slice(0, 12);
}

/** Markdown işaretleri olmadan ilk 200 karakter. */
export function blockExcerpt(text: string, max = 200): string {
  const t = text
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max) : t;
}
