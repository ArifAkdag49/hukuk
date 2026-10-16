import * as Haptics from "expo-haptics";
import { memo, useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { blockHash, splitBlocks } from "../highlights";
import { colors, radius, space } from "../theme";
import { Markdown } from "./Markdown";

/**
 * Markdown'ı paragraf/blok düzeyinde gösterir; uzun basınca blok vurgulanır ya da vurgu kalkar.
 * Vurgulu blok: sarı zemin + sol kenar çizgisi.
 */
export const HighlightableMarkdown = memo(function HighlightableMarkdown({
  md,
  highlighted,
  onToggle,
  accent,
  reading = true,
}: {
  md: string;
  /** Bu bölümdeki vurgulu blokların block_hash kümesi */
  highlighted: Set<string>;
  onToggle: (blockText: string) => void;
  accent: string;
  reading?: boolean;
}) {
  const blocks = useMemo(() => splitBlocks(md).map((text) => ({ text, hash: blockHash(text) })), [md]);
  return (
    <View>
      {blocks.map((b, i) => {
        const on = highlighted.has(b.hash);
        return (
          <Pressable
            key={`${b.hash}-${i}`}
            delayLongPress={380}
            onLongPress={() => {
              if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
              onToggle(b.text);
            }}
            accessibilityRole="text"
            accessibilityHint={on ? "Vurguyu kaldırmak için uzun bas" : "Vurgulamak için uzun bas"}
            accessibilityState={{ selected: on }}
            accessibilityActions={[{ name: "longpress", label: on ? "Vurguyu kaldır" : "Vurgula" }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === "longpress") onToggle(b.text);
            }}
            style={({ pressed }) => [styles.block, on && styles.on, pressed && !on && styles.pressed]}
          >
            <Markdown reading={reading} accent={accent} compact>
              {b.text}
            </Markdown>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    borderLeftWidth: 4,
    borderLeftColor: colors.transparent,
    borderRadius: radius.sm,
    paddingLeft: space.xs,
    paddingRight: 2,
    paddingTop: 4,
    marginLeft: -space.xs - 4,
    marginBottom: 4,
  },
  on: { backgroundColor: colors.highlight, borderLeftColor: colors.highlightEdge },
  pressed: { backgroundColor: colors.surfaceAlt },
});
