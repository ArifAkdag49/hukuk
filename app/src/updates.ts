import Constants from "expo-constants";
import * as Updates from "expo-updates";

/**
 * Uzaktan güncelleme (EAS Update). Açılışta ve ön plana gelişte en fazla saatte bir kontrol eder,
 * varsa indirir; indirildiğinde uygulama "Yeni sürüm hazır" bandını gösterir.
 * Geliştirmede (Updates.isEnabled false) hiçbir şey yapmaz. Web için bkz. updates.web.ts.
 */

const MIN_INTERVAL_MS = 60 * 60 * 1000;
let lastCheck = 0;
let inFlight: Promise<boolean> | null = null;

/** true: yeni sürüm indirildi, yeniden başlatınca uygulanır. */
export function checkAndFetchUpdate(force = false): Promise<boolean> {
  if (!Updates.isEnabled || __DEV__) return Promise.resolve(false);
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastCheck < MIN_INTERVAL_MS) return Promise.resolve(false);
  lastCheck = Date.now();
  inFlight = (async () => {
    try {
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) return false;
      const f = await Updates.fetchUpdateAsync();
      return f.isNew;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function applyUpdate() {
  await Updates.reloadAsync();
}

export interface VersionInfo {
  appVersion: string;
  updateId: string | null;
  channel: string | null;
  embedded: boolean;
}

export function versionInfo(): VersionInfo {
  return {
    appVersion: Constants.expoConfig?.version ?? "?",
    updateId: Updates.updateId ? Updates.updateId.slice(0, 8) : null,
    channel: Updates.channel ?? null,
    embedded: Updates.isEmbeddedLaunch,
  };
}
