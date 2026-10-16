import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { PlannedReminder } from "./reminders";

/**
 * Günlük kart hatırlatması (Android). Plan, tek seferlik (DATE) bildirimler olarak kurulur;
 * her yeniden planlamada eskiler silinir. Web için bkz. notifications.web.ts (no-op).
 */

export const CHANNEL_ID = "tekrar-hatirlatma";
export type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

const BODIES = [
  "Birkaç dakikalık tekrar, sınavda büyük fark yaratır.",
  "Bugünkü kartları bitir, yarına hafif başla.",
  "Kısa bir tekrarla bildiklerini kalıcı hâle getir.",
  "Az ama her gün: kartların seni bekliyor.",
  "Bir kahve molası kadar sürer. Hadi başlayalım.",
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Tekrar hatırlatma",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getPermission(): Promise<PermissionState> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return "granted";
    return p.canAskAgain === false || p.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unsupported";
  }
}

/** Android 13+ izni ister (kanal önce oluşturulmalı). */
export async function requestPermission(): Promise<PermissionState> {
  try {
    await ensureChannel();
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

export async function cancelReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // yok say
  }
}

export async function scheduleReminders(plan: PlannedReminder[]) {
  await cancelReminders();
  if ((await getPermission()) !== "granted") return;
  await ensureChannel();
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Bugün ${p.count} kart seni bekliyor`,
        body: BODIES[(p.date.getDate() + i) % BODIES.length],
        data: { url: "/kartlar" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL_ID },
    });
  }
}

/** Bildirime dokununca çağrılır (uygulama kapalıyken açılış dahil). */
export function onReminderOpened(handler: (url: string) => void): () => void {
  const seen = new Set<string>();
  const handle = (r: Notifications.NotificationResponse | null) => {
    if (!r) return;
    const id = r.notification.request.identifier;
    if (seen.has(id)) return;
    seen.add(id);
    const url = r.notification.request.content.data?.url;
    if (typeof url === "string") handler(url);
  };
  void Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
