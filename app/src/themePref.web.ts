export type ThemeMode = "light" | "dark";
const KEY = "theme_mode";

export function readThemeMode(): ThemeMode {
  try {
    return globalThis.localStorage?.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export async function saveThemeModeAndReload(mode: ThemeMode): Promise<void> {
  try {
    globalThis.localStorage?.setItem(KEY, mode);
  } catch {
    // depolama kapalıysa yalnız bu oturumda geçerli olmaz; yine de yenile
  }
  globalThis.location?.reload();
}
