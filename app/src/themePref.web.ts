export type ThemeMode = "light" | "dark" | "pink";
const KEY = "theme_mode";

export function readThemeMode(): ThemeMode {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    return v === "dark" || v === "pink" ? v : "light";
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
