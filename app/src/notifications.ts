import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import type { PlannedReminder } from "./reminders";

/**
 * Günlük kart hatırlatması (Android). Plan, tek seferlik (DATE) bildirimler olarak kurulur;
 * her yeniden planlamada eskiler silinir. Web için bkz. notifications.web.ts (no-op).
 *
 * expo-notifications tembel yüklenir: yerel modülü olmayan ortamlarda (ör. Expo Go)
 * import hatası bütün uygulamayı çökertmesin, yalnız hatırlatma "desteklenmiyor" olsun.
 */

type NotificationsModule = typeof import("expo-notifications");

export const CHANNEL_ID = "tekrar-hatirlatma";
export type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

const BODIES = [
  "Birkaç dakikalık tekrar, sınavda büyük fark yaratır.",
  "Bugünkü kartları bitir, yarına hafif başla.",
  "Kısa bir tekrarla bildiklerini kalıcı hâle getir.",
  "Az ama her gün: kartların seni bekliyor.",
  "Bir kahve molası kadar sürer. Hadi başlayalım.",
];

let cached: NotificationsModule | null | undefined;

function N(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  // Expo Go'da (storeClient) yerel modül yok; require denemesi bile geliştirme modunda
  // "Uncaught Error" ekranı açıyor, o yüzden hiç yüklemiyoruz.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications") as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

async function ensureChannel(n: NotificationsModule) {
  if (Platform.OS !== "android") return;
  await n.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Tekrar hatırlatma",
    importance: n.AndroidImportance.DEFAULT,
  });
}

export async function getPermission(): Promise<PermissionState> {
  const n = N();
  if (!n) return "unsupported";
  try {
    const p = await n.getPermissionsAsync();
    if (p.granted) return "granted";
    return p.canAskAgain === false || p.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unsupported";
  }
}

/** Android 13+ izni ister (kanal önce oluşturulmalı). */
export async function requestPermission(): Promise<PermissionState> {
  const n = N();
  if (!n) return "unsupported";
  try {
    await ensureChannel(n);
    const p = await n.requestPermissionsAsync();
    return p.granted ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

export async function cancelReminders() {
  const n = N();
  if (!n) return;
  try {
    await n.cancelAllScheduledNotificationsAsync();
  } catch {
    // yok say
  }
}

export async function scheduleReminders(plan: PlannedReminder[]) {
  const n = N();
  if (!n) return;
  await cancelReminders();
  if ((await getPermission()) !== "granted") return;
  await ensureChannel(n);
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    await n.scheduleNotificationAsync({
      content: {
        title: `Bugün ${p.count} kart seni bekliyor`,
        body: BODIES[(p.date.getDate() + i) % BODIES.length],
        data: { url: "/kartlar" },
      },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL_ID },
    });
  }
}

/** Bildirime dokununca çağrılır (uygulama kapalıyken açılış dahil). */
export function onReminderOpened(handler: (url: string) => void): () => void {
  const n = N();
  if (!n) return () => undefined;
  const seen = new Set<string>();
  const handle = (r: import("expo-notifications").NotificationResponse | null) => {
    if (!r) return;
    const id = r.notification.request.identifier;
    if (seen.has(id)) return;
    seen.add(id);
    const url = r.notification.request.content.data?.url;
    if (typeof url === "string") handler(url);
  };
  void n.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
  const sub = n.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
