import { MemoryDepo, emptyState, type MemoryState } from "./memoryDepo";

/**
 * Web önizleme deposu: bellek + localStorage. Yalnızca geliştirme/önizleme içindir;
 * Android'de SqliteDepo kullanılır. localStorage dolarsa (büyük KB) veri yalnızca bellekte kalır.
 */
const PREFIX = "hukuk_depo_";
const PARTS: (keyof MemoryState)[] = ["meta", "kb", "attempts", "reviews", "states", "queue", "notes", "highlights"];

function load(): MemoryState {
  const s = emptyState();
  try {
    const ls = globalThis.localStorage;
    if (!ls) return s;
    for (const p of PARTS) {
      const raw = ls.getItem(PREFIX + p);
      if (raw) (s as unknown as Record<string, unknown>)[p] = JSON.parse(raw);
    }
  } catch {
    return emptyState();
  }
  return s;
}

function save(part: keyof MemoryState, state: MemoryState) {
  try {
    globalThis.localStorage?.setItem(PREFIX + part, JSON.stringify(state[part]));
  } catch {
    // kota dolu veya erişim yok: bellekte devam
  }
}

export function createWebDepo() {
  return new MemoryDepo(load(), save);
}
