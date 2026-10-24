import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import MarkdownDisplay, { type RenderRules } from "react-native-markdown-display";
import { accentInk, accentWash, colors, fonts, radius, space } from "../theme";

export function openLink(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  void WebBrowser.openBrowserAsync(url);
}

/**
 * Markdown gösterimi. `reading` uzun hukuk metinleri için serif ve geniş satır aralığı kullanır;
 * kapalıyken arayüz yazı tipiyle (sohbet, açıklamalar) gösterir. Başlıklar ve kalın vurgular vurgu
 * renginin okunur tonuyla renklenir; gövde metni sade kalır.
 */
export function Markdown({
  children,
  reading = false,
  accent = colors.primary,
  color = colors.ink,
  compact = false,
}: {
  children: string | null | undefined;
  reading?: boolean;
  accent?: string;
  color?: string;
  compact?: boolean;
}) {
  const style = useMemo(() => makeStyles(reading, accent, color, compact), [reading, accent, color, compact]);
  if (!children) return null;
  return (
    <MarkdownDisplay
      style={style}
      rules={rules}
      onLinkPress={(url) => {
        openLink(url);
        return false;
      }}
    >
      {children}
    </MarkdownDisplay>
  );
}

const CELL_WIDTH = 150;
const FIT_COLUMNS = 3;

/** En çok 3 sütunlu tablo ekran genişliğine sığar; daha genişi sabit hücre genişliğiyle yatay kayar. */
const rules: RenderRules = {
  table: (node, children, _parent, styles) => {
    const cols = columnCount(node);
    const wide = cols > FIT_COLUMNS;
    const table = <View style={[styles._VIEW_SAFE_table, wide && { width: cols * CELL_WIDTH }]}>{children}</View>;
    if (!wide) return <View key={node.key} style={{ marginVertical: space.sm }}>{table}</View>;
    return (
      <ScrollView key={node.key} horizontal showsHorizontalScrollIndicator style={{ marginVertical: space.sm }}>
        {table}
      </ScrollView>
    );
  },
};

function columnCount(node: { children?: { children?: { children?: unknown[] }[] }[] }): number {
  return node.children?.[0]?.children?.[0]?.children?.length ?? 0;
}

function makeStyles(reading: boolean, accent: string, color: string, compact: boolean) {
  const bodyFont = reading ? fonts.serif : fonts.regular;
  const size = reading ? 18 : 16;
  const lh = reading ? 29 : 24;
  const ink = accentInk(accent);
  return StyleSheet.create({
    body: { fontFamily: bodyFont, fontSize: size, lineHeight: lh, color },
    paragraph: { marginTop: 0, marginBottom: compact ? 4 : space.sm },
    heading1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, color: ink, marginTop: space.lg, marginBottom: space.xs },
    heading2: {
      fontFamily: fonts.semibold,
      fontSize: 20,
      lineHeight: 27,
      color: ink,
      marginTop: space.lg,
      marginBottom: space.xs,
      paddingBottom: 6,
      borderBottomWidth: 2,
      borderBottomColor: accentWash(accent, 0.3),
    },
    heading3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: ink, marginTop: space.md, marginBottom: 4 },
    heading4: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: colors.inkSoft, marginTop: space.sm, marginBottom: 2 },
    // Kalın = önemli kavram, süre, şart: renkli ve hafif zeminli (fosforlu kalem gibi değil, sade)
    strong: { fontFamily: reading ? fonts.serifBold : fonts.semibold, fontWeight: "normal", color: ink, backgroundColor: accentWash(accent, 0.12) },
    em: { fontFamily: reading ? fonts.serifItalic : fonts.regular, fontStyle: reading ? "normal" : "italic", color: colors.inkSoft },
    bullet_list: { marginBottom: space.sm },
    ordered_list: { marginBottom: space.sm },
    list_item: { marginBottom: 6 },
    bullet_list_icon: { color: accent, fontSize: size + 4, lineHeight: lh, marginLeft: 2, marginRight: 10 },
    ordered_list_icon: { color: accent, fontFamily: fonts.semibold, fontSize: size, lineHeight: lh, marginRight: 8 },
    blockquote: {
      backgroundColor: colors.surfaceAlt,
      borderLeftWidth: 4,
      borderLeftColor: accent,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.xs,
      marginVertical: space.sm,
      marginLeft: 0,
    },
    link: { color: colors.primary, textDecorationLine: "underline" },
    code_inline: { fontFamily: fonts.medium, backgroundColor: colors.surfaceAlt, borderRadius: 6, paddingHorizontal: 4 },
    hr: { backgroundColor: colors.line, height: 1, marginVertical: space.md },
    table: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: "hidden" },
    thead: { backgroundColor: colors.surfaceAlt },
    th: { padding: space.xs, flex: 1, fontFamily: fonts.semibold, fontSize: size - 3, lineHeight: lh - 7 },
    tr: { borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row" },
    td: { padding: space.xs, flex: 1, fontSize: size - 3, lineHeight: lh - 7 },
    text: {},
  });
}
