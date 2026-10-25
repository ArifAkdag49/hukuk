import { Alert, Platform } from "react-native";
import { dialogHost } from "./components/ConfirmHost";

/** Platformlar arası onay penceresi. Uygulamanın kendi penceresi kuruluysa onu, değilse sistemin penceresini kullanır. */
export function confirm(title: string, message: string, okLabel = "Evet", destructive = false): Promise<boolean> {
  const host = dialogHost();
  if (host) return new Promise((resolve) => host({ title, message, okLabel, cancelLabel: "Vazgeç", destructive, resolve }));
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Vazgeç", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

/** Platformlar arası bilgi penceresi. */
export function notify(title: string, message: string) {
  const host = dialogHost();
  if (host) {
    host({ title, message, okLabel: "Tamam", resolve: () => undefined });
    return;
  }
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
