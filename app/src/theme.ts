/**
 * Tasarım token'ları. Ekranlarda sabit renk/ölçü YAZMA; buradan al.
 *
 * Yön: "renkli kitap sırtları". Zemin sakin ve açık; her ders kendi canlı rengini taşır
 * (kitaplıktaki cilt sırtları gibi). Ders kartları, konu başlıkları ve ilerleme halkaları o rengi kullanır.
 * Ders renkleri anlamsal renklerden (kırmızı = zayıf/yanlış) ayrı tutulur.
 * Arayüz yazısı Lexend (okuma kolaylığı için tasarlanmış), uzun hukuk metinleri Source Serif 4.
 */

import { readThemeMode } from "./themePref";

/** Görünüm, uygulama açılırken bir kez seçilir (bkz. themePref). */
export const themeMode = readThemeMode();
export const isDark = themeMode === "dark";

const light = {
  bg: "#F7F8FC",
  surface: "#FFFFFF",
  surfaceAlt: "#EFF1F8",
  ink: "#1C2142", // ana yazı: derin lacivert mürekkep
  inkSoft: "#454B6B",
  muted: "#767C99",
  line: "#E2E5F0",
  lineStrong: "#CBD0E1",

  primary: "#3355FF",
  primaryDeep: "#2238C9",
  primaryTint: "#E7ECFF",
  onPrimary: "#FFFFFF",
  /** Ana renk zemin üstünde ikincil yazı */
  onPrimarySoft: "#E7ECFF",

  success: "#12A150",
  successDeep: "#0B7A3B",
  successTint: "#E3F7EA",
  danger: "#E5383B",
  dangerDeep: "#B4232A",
  dangerTint: "#FDE9E9",
  warning: "#F59E0B",
  warningDeep: "#A15C00",
  warningTint: "#FFF3DB",
  info: "#0EA5E9",
  infoDeep: "#0369A1",
  infoTint: "#E1F3FC",

  /** Kişisel vurgu: yumuşak fosforlu kalem sarısı + kenar çizgisi */
  highlight: "#FFF1A8",
  highlightEdge: "#F2B90C",
  highlightInk: "#7A5600",

  overlay: "rgba(28, 33, 66, 0.45)",
  shadow: "#1C2142",
  white: "#FFFFFF",
  transparent: "transparent",
};

/** Gece okuması: koyu lacivert zemin, düşük parlaklıkta yüzeyler; "Deep" tonlar koyu zeminde okunacak kadar açık. */
const dark: typeof light = {
  bg: "#11142A",
  surface: "#1B1F3B",
  surfaceAlt: "#252A4B",
  ink: "#E9EBF7",
  inkSoft: "#BCC1DD",
  muted: "#8D93B3",
  line: "#2D3256",
  lineStrong: "#3E446E",

  primary: "#5470FF",
  primaryDeep: "#AEBBFF",
  primaryTint: "#252D63",
  onPrimary: "#FFFFFF",
  onPrimarySoft: "#E7ECFF",

  success: "#2FBF6B",
  successDeep: "#7FE2A8",
  successTint: "#163A29",
  danger: "#F0585A",
  dangerDeep: "#FFA3A3",
  dangerTint: "#42202A",
  warning: "#F5A524",
  warningDeep: "#FFD18C",
  warningTint: "#3D3019",
  info: "#38BDF8",
  infoDeep: "#95DCFB",
  infoTint: "#15344A",

  highlight: "#4B4012",
  highlightEdge: "#C99A0A",
  highlightInk: "#F4D670",

  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "#000000",
  white: "#FFFFFF",
  transparent: "transparent",
};

export const colors = isDark ? dark : light;

/** Ders renkleri: ana ton (sırt, halka), koyu (beyaz zeminde yazı), açık (arka plan). */
export interface CourseColor {
  name: string;
  main: string;
  deep: string;
  tint: string;
}

const lightPalette: CourseColor[] = [
  { name: "mercan", main: "#FF6B5B", deep: "#C23A2C", tint: "#FFECE9" },
  { name: "turkuaz", main: "#14B8A6", deep: "#0F766E", tint: "#E2F7F4" },
  { name: "mor", main: "#8B5CF6", deep: "#6D28D9", tint: "#F0EBFE" },
  { name: "amber", main: "#F59E0B", deep: "#B45309", tint: "#FEF3DC" },
  { name: "gökmavi", main: "#0EA5E9", deep: "#0369A1", tint: "#E1F3FC" },
  { name: "zümrüt", main: "#10B981", deep: "#047857", tint: "#E0F6EE" },
  { name: "pembe", main: "#EC4899", deep: "#BE185D", tint: "#FDE7F2" },
  { name: "indigo", main: "#6366F1", deep: "#4338CA", tint: "#ECEDFE" },
  { name: "turuncu", main: "#F97316", deep: "#C2410C", tint: "#FEEDE1" },
  { name: "limon-yeşil", main: "#84CC16", deep: "#4D7C0F", tint: "#F0F9DF" },
  { name: "arduvaz", main: "#64748B", deep: "#334155", tint: "#E9EDF3" },
  { name: "camgöbeği", main: "#06B6D4", deep: "#0E7490", tint: "#DFF6FA" },
  { name: "eflatun", main: "#D946EF", deep: "#A21CAF", tint: "#FAE8FD" },
  { name: "altın", main: "#EAB308", deep: "#A16207", tint: "#FDF6D8" },
];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** a ile b arasında karışım: t=0 → a, t=1 → b */
function mix(a: string, b: string, t: number): string {
  const [x, y] = [hex(a), hex(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Koyu temada ders renkleri: ana ton aynı; yazı tonu açılır, zemin tonu koyu yüzeye karışır. */
export const coursePalette: CourseColor[] = isDark
  ? lightPalette.map((c) => ({ ...c, deep: mix(c.main, "#FFFFFF", 0.38), tint: mix(dark.surface, c.main, 0.22) }))
  : lightPalette;

/** Müfredattaki 14 ders için sabit atama; yeni eklenen ders koda göre bir renk alır. */
const FIXED: Record<string, number> = {
  HUK2011: 0, HUK2013: 1, HUK2009: 2, HUK2017: 3, HUK2012: 4, HUK2015: 5, HUK2003: 6,
  HUK3011: 7, HUK3012: 8, HUK3013: 9, HUK3015: 10, HUK3017: 11, HUK3014: 12, HUK3016: 13,
};

export function courseColor(courseId: string | null | undefined): CourseColor {
  if (!courseId) return coursePalette[7];
  const fixed = FIXED[courseId];
  if (fixed !== undefined) return coursePalette[fixed];
  let h = 0;
  for (let i = 0; i < courseId.length; i++) h = (h * 31 + courseId.charCodeAt(i)) >>> 0;
  return coursePalette[h % coursePalette.length];
}

/** Ustalık puanı rengi: kırmızı → amber → yeşil; veri yoksa gri. */
export function masteryColor(score: number | null): { main: string; tint: string; deep: string } {
  if (score === null) return { main: colors.lineStrong, tint: colors.surfaceAlt, deep: colors.muted };
  if (score < 40) return { main: colors.danger, tint: colors.dangerTint, deep: colors.dangerDeep };
  if (score < 70) return { main: colors.warning, tint: colors.warningTint, deep: colors.warningDeep };
  return { main: colors.success, tint: colors.successTint, deep: colors.successDeep };
}

export const fonts = {
  regular: "Lexend_400Regular",
  medium: "Lexend_500Medium",
  semibold: "Lexend_600SemiBold",
  bold: "Lexend_700Bold",
  serif: "SourceSerif4_400Regular",
  serifItalic: "SourceSerif4_400Regular_Italic",
  serifBold: "SourceSerif4_600SemiBold",
} as const;

/** Tip ölçeği (gövde ≥ 16). */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27 },
  subheading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  reading: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 29 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  tiny: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
} as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Kartlar için yumuşak, renkli gölge. */
export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  raised: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
} as const;

/** Okunur satır uzunluğu için en fazla içerik genişliği (tablet/web). */
export const maxContentWidth = 720;
