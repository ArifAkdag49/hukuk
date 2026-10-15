/** Web önizlemesi için: secure-store web'de yok, localStorage kullanılır. */
const KEY = "hukuk_jwt";

export async function getToken(): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    globalThis.localStorage?.setItem(KEY, token);
  } catch {
    // özel pencere vb.: oturum yalnızca bellekte kalır
  }
}

export async function clearToken(): Promise<void> {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // yok say
  }
}
