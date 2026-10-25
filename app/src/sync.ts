import type { Depo } from "./db/types";
import type { Attempt, CardReview, CardState, Highlight, KbExport, ProgressPayload, TopicNote } from "./types";

/**
 * Senkronizasyon:
 *  - KB: GET /kb/version → değiştiyse GET /kb/export → depoya yaz.
 *  - İlerleme: yerel kayıtlar sync_queue'da bekler → POST /progress/sync (idempotent, istemci UUID'leri).
 *  - İlk kurulum: yerel ilerleme boşsa GET /progress/all ile geri yükle.
 */

export interface SyncApi {
  getKbVersion(): Promise<{ version: string }>;
  exportKb(): Promise<KbExport>;
  syncProgress(p: ProgressPayload): Promise<{ ok: boolean; server_time: string }>;
  getAllProgress(): Promise<ProgressPayload>;
}

const BATCH = 300;
export const META_RESTORED = "progress_restored";
export const META_LAST_SYNC = "last_sync_at";

export function createSync(depo: Depo, api: SyncApi) {
  async function syncKb(): Promise<{ updated: boolean; version: string }> {
    const { version } = await api.getKbVersion();
    // Sürüm, ayrı tutulan meta kaydından değil yüklü bankanın kendisinden okunur: web'de banka
    // kaydedilemeyip yalnız meta yazılırsa uygulama kendini güncel sanıp yeni bankayı hiç indirmezdi.
    const local = await depo.loadKbIndex();
    if (local && local.version === version) return { updated: false, version };
    const kb = await api.exportKb();
    await depo.replaceKb(kb);
    return { updated: true, version: kb.version };
  }

  async function pushProgress(): Promise<{ sent: number }> {
    let sent = 0;
    // Büyük kuyrukları parça parça gönder.
    for (let round = 0; round < 50; round++) {
      const items = await depo.listQueue(BATCH);
      if (items.length === 0) break;
      const topic_notes: TopicNote[] = [];
      const highlights: Highlight[] = [];
      const payload: ProgressPayload = { attempts: [], card_reviews: [], card_states: [], topic_notes, highlights };
      for (const it of items) {
        if (it.type === "attempt") payload.attempts.push(it.payload as Attempt);
        else if (it.type === "card_review") payload.card_reviews.push(it.payload as CardReview);
        else if (it.type === "card_state") payload.card_states.push(it.payload as CardState);
        else if (it.type === "topic_note") topic_notes.push(it.payload as TopicNote);
        else highlights.push(it.payload as Highlight);
      }
      await api.syncProgress(payload);
      await depo.removeQueue(items.map(({ key, seq }) => ({ key, seq })));
      sent += items.length;
      if (items.length < BATCH) break;
    }
    if (sent > 0) await depo.setMeta(META_LAST_SYNC, new Date().toISOString());
    return { sent };
  }

  async function restoreProgressIfFirstRun(): Promise<boolean> {
    if (await depo.getMeta(META_RESTORED)) return false;
    const local = (await depo.listAttempts()).length + (await depo.listCardReviews()).length;
    if (local === 0) {
      const all = await api.getAllProgress();
      await depo.importProgress(all);
    }
    await depo.setMeta(META_RESTORED, "1");
    return local === 0;
  }

  /** Açılışta ve ön plana gelince. Hatalar çağırana döner; kuyruk kaybolmaz. */
  async function syncAll() {
    const kb = await syncKb();
    await restoreProgressIfFirstRun();
    const pushed = await pushProgress();
    await depo.setMeta(META_LAST_SYNC, new Date().toISOString());
    return { kbUpdated: kb.updated, version: kb.version, sent: pushed.sent };
  }

  return { syncKb, pushProgress, restoreProgressIfFirstRun, syncAll };
}
