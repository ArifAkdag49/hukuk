import { SqliteDepo } from "./sqliteDepo";
import type { Depo } from "./types";

/** Android/iOS: expo-sqlite. Web için depo.web.ts seçilir (Metro platform uzantısı). */
export function createDepo(): Depo {
  return new SqliteDepo();
}
