import * as SecureStore from "expo-secure-store";

/** JWT, Android'de expo-secure-store'da saklanır (web için bkz. token.web.ts). */
const KEY = "hukuk_jwt";

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
