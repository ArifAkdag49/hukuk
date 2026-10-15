import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  useFonts,
} from "@expo-google-fonts/lexend";
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
} from "@expo-google-fonts/source-serif-4";
import { SplashScreen, Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Disclaimer } from "../src/components/Disclaimer";
import { LoadingState } from "../src/components/States";
import { AppProvider, useApp } from "../src/store/AppContext";
import { colors } from "../src/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    ...MaterialCommunityIcons.font,
  });
  const fontsReady = fontsLoaded || !!fontError;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>{fontsReady ? <Gate /> : <View style={{ flex: 1, backgroundColor: colors.bg }} />}</AppProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { ready, authed, disclaimerSeen } = useApp();
  const segments = useSegments();
  const onLogin = segments[0] === "giris";

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    if (!authed && !onLogin) router.replace("/giris");
    else if (authed && onLogin) router.replace("/");
  }, [ready, authed, onLogin]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <LoadingState text="Hazırlanıyor…" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }} />
      {!disclaimerSeen ? <Disclaimer /> : null}
    </View>
  );
}
