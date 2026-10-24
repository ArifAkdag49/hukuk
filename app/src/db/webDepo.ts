import { MemoryDepo, emptyState, type MemoryState } from "./memoryDepo";

/**
 * Web deposu: bellek + IndexedDB. Bilgi bankası ~20 MB; localStorage (~5 MB) yetmediği için her bölüm
 * IndexedDB'de ayrı bir kayıt olarak tutulur. IndexedDB yoksa ya da açılamazsa (gizli sekme) veri yalnızca
 * bellekte kalır, uygulama yine çalışır. Eski sürümün localStorage verisi bir kez taşınır.
 */
const DB_NAME = "hukuk";
const STORE = "depo";
const LEGACY_PREFIX = "hukuk_depo_";
const PARTS: (keyof MemoryState)[] = ["meta", "kb", "attempts", "reviews", "states", "queue", "notes", "highlights"];

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const idb = globalThis.indexedDB;
      if (!idb) return resolve(null);
      const req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readAll(db: IDBDatabase): Promise<Partial<MemoryState>> {
  return new Promise((resolve) => {
    const out: Partial<MemoryState> = {};
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      for (const p of PARTS) {
        const r = store.get(p);
        r.onsuccess = () => {
          if (r.result !== undefined) (out as Record<string, unknown>)[p] = r.result;
        };
      }
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

function readLegacy(): Partial<MemoryState> {
  const out: Partial<MemoryState> = {};
  try {
    const ls = globalThis.localStorage;
    if (!ls) return out;
    for (const p of PARTS) {
      const raw = ls.getItem(LEGACY_PREFIX + p);
      if (raw) (out as Record<string, unknown>)[p] = JSON.parse(raw);
    }
  } catch {
    // bozuk ya da erişilemez: yok say
  }
  return out;
}

function clearLegacy() {
  try {
    for (const p of PARTS) globalThis.localStorage?.removeItem(LEGACY_PREFIX + p);
  } catch {
    // önemsiz
  }
}

class WebDepo extends MemoryDepo {
  private db: IDBDatabase | null = null;
  private pending = new Set<keyof MemoryState>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super(emptyState(), (part) => this.schedule(part));
  }

  async init() {
    this.db = await openDb();
    let loaded: Partial<MemoryState> = this.db ? await readAll(this.db) : {};
    const migrate = Object.keys(loaded).length === 0;
    if (migrate) loaded = readLegacy();
    this.s = { ...emptyState(), ...loaded };
    this.reindex();
    if (migrate && Object.keys(loaded).length > 0) {
      for (const p of PARTS) this.schedule(p);
      clearLegacy();
    }
  }

  /** Art arda yazmalar (bir quiz oturumu gibi) tek işlemde toplanır. */
  private schedule(part: keyof MemoryState) {
    this.pending.add(part);
    if (this.timer) return;
    this.timer = setTimeout(() => void this.flush(), 300);
  }

  private async flush() {
    this.timer = null;
    const db = this.db;
    const parts = [...this.pending];
    this.pending.clear();
    if (!db || parts.length === 0) return;
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const p of parts) store.put(this.s[p] ?? null, p);
    } catch {
      // kota dolu ya da erişim yok: bellekte devam
    }
  }
}

export function createWebDepo() {
  return new WebDepo();
}
