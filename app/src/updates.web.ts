import Constants from "expo-constants";

/** Web önizleme: uzaktan güncelleme yok (no-op). */
export function checkAndFetchUpdate(_force = false): Promise<boolean> {
  return Promise.resolve(false);
}
export async function applyUpdate() {}

export interface VersionInfo {
  appVersion: string;
  updateId: string | null;
  channel: string | null;
  embedded: boolean;
}

export function versionInfo(): VersionInfo {
  return { appVersion: Constants.expoConfig?.version ?? "?", updateId: null, channel: null, embedded: true };
}
