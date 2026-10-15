import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../src/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: "index", title: "Ana Sayfa", icon: "home-variant-outline", iconActive: "home-variant" },
  { name: "dersler", title: "Dersler", icon: "bookshelf", iconActive: "bookshelf" },
  { name: "calis", title: "Çalış", icon: "lightning-bolt-outline", iconActive: "lightning-bolt" },
  { name: "notlar", title: "Notlarım", icon: "notebook-outline", iconActive: "notebook" },
  { name: "asistan", title: "Asistan", icon: "chat-processing-outline", iconActive: "chat-processing" },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons name={focused ? t.iconActive : t.icon} size={26} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
