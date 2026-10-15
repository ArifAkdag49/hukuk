import { Platform } from "react-native";

/**
 * Sunucu adresi: EXPO_PUBLIC_API_URL (eas.json'da preview → https://hukuk.arxdigitalsevice.com).
 * Tanımlı değilse: web → http://localhost:8810, Android emülatörü → http://10.0.2.2:8810.
 */
const envUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = (
  envUrl && envUrl.length > 0
    ? envUrl
    : Platform.OS === "android"
      ? "http://10.0.2.2:8810"
      : "http://localhost:8810"
).replace(/\/+$/, "");

/** 1 iken sunucu yerine src/dev/fixture.ts kullanılır. */
export const USE_FIXTURE = process.env.EXPO_PUBLIC_USE_FIXTURE === "1";
