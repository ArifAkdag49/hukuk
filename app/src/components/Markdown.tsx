import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import MarkdownDisplay, { type RenderRules } from "react-native-markdown-display";
import { tableData } from "../markdownTable";
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
  const { width } = useWindowDimensions();
  const rules = useMemo(() => makeRules(width, accent), [width, accent]);
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

const MIN_CELL_WIDTH = 110;
// Sohbet balonu ve konu sayfası kenar boşlukları
const SIDE_PADDING = 96;

/**
 * Tablolar yatay kaydırılmaz: Android yatay kaydırma kutusunun yüksekliğini yanlış ölçüp altında
 * büyük bir boşluk bırakıyor ve metnin sonunu kesiyordu. Sütunlar ekrana sığıyorsa tablo, sığmıyorsa
 * her satır bir kart olarak gösterilir (ilk hücre başlık, diğerleri "Sütun: değer").
 */
function makeRules(windowWidth: number, accent: string): RenderRules {
  const ink = accentInk(accent);
  return {
    table: (node, children, _parent, styles) => {
      const cols = columnCount(node);
      if (cols * MIN_CELL_WIDTH <= windowWidth - SIDE_PADDING) {
        return (
          <View key={node.key} style={[styles._VIEW_SAFE_table, { marginVertical: space.sm }]}>
            {children}
          </View>
        );
      }
      const { headers, rows } = tableData(node as never);
      const body = styles.body ?? {};
      return (
        <View key={node.key} style={{ gap: space.xs, marginVertical: space.sm }}>
          {rows.map((row, i) => (
            <View key={i} style={[cardStyles.card, { borderLeftColor: accentWash(accent, 0.45) }]}>
              <Text style={[body, cardStyles.title, { color: ink }]}>{row[0]}</Text>
              {row.slice(1).map((value, j) => (
                <Text key={j} style={[body, cardStyles.line]}>
                  <Text style={cardStyles.label}>{headers[j + 1] ? `${headers[j + 1]}: ` : ""}</Text>
                  {value || "–"}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    },
  };
}

const cardStyles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderRadius: radius.sm, padding: space.sm, gap: 4, backgroundColor: colors.surface },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  line: { fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, color: colors.inkSoft },
});

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
