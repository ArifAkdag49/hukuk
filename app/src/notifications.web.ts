import type { PlannedReminder } from "./reminders";

/** Web önizleme: bildirimler yok (no-op). */
export const CHANNEL_ID = "tekrar-hatirlatma";
export type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

export async function getPermission(): Promise<PermissionState> {
  return "unsupported";
}
export async function requestPermission(): Promise<PermissionState> {
  return "unsupported";
}
export async function cancelReminders() {}
export async function scheduleReminders(_plan: PlannedReminder[]) {}
export function onReminderOpened(_handler: (url: string) => void): () => void {
  return () => undefined;
}
