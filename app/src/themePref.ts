import * as SecureStore from "expo-secure-store";
import { DevSettings } from "react-native";

/**
 * Görünüm tercihi. Stiller modül yüklenirken (StyleSheet.create) bir kez kurulduğu için tercih
 * EŞZAMANLI okunur ve değişince uygulama yeniden başlatılır.
 */
export type ThemeMode = "light" | "dark" | "pink";
const KEY = "theme_mode";

export function readThemeMode(): ThemeMode {
  try {
    const v = SecureStore.getItem(KEY);
    return v === "dark" || v === "pink" ? v : "light";
  } catch {
    return "light";
  }
}

export async function saveThemeModeAndReload(mode: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(KEY, mode);
  try {
    const Updates = await import("expo-updates");
    if (Updates.isEnabled && !__DEV__) {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // expo-updates yoksa geliştirme yeniden yüklemesine düş
  }
  DevSettings.reload();
}
