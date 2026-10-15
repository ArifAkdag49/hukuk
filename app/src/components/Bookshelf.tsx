import { View } from "react-native";
import { coursePalette } from "../theme";

/**
 * Uygulamanın imza öğesi: 14 dersin renkleriyle bir kitap rafı.
 * Her sırt bir dersi temsil eder; yükseklikler hafifçe değişir (gerçek raf gibi).
 */
const HEIGHTS = [0.82, 0.95, 0.74, 1, 0.88, 0.7, 0.92, 0.8, 0.97, 0.76, 0.9, 0.84, 0.72, 0.94];

export function Bookshelf({ height = 72, gap = 5, colors: override }: { height?: number; gap?: number; colors?: string[] }) {
  const cols = override ?? coursePalette.map((c) => c.main);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {cols.map((c, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: height * HEIGHTS[i % HEIGHTS.length],
            backgroundColor: c,
            borderRadius: 5,
            borderTopLeftRadius: 7,
            borderTopRightRadius: 7,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)" }} />
        </View>
      ))}
    </View>
  );
}
