import { createWebDepo } from "./webDepo";
import type { Depo } from "./types";

/** Web önizleme: expo-sqlite yerine bellek + localStorage. */
export function createDepo(): Depo {
  return createWebDepo();
}
