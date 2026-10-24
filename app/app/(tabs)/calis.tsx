import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SyncBanner } from "../../src/components/SyncBanner";
import { Icon, IconBubble, Pill, T, type IconName } from "../../src/components/ui";
import { countdownText, upcomingExams } from "../../src/exams";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, shadow, space } from "../../src/theme";

export default function Calis() {
  const { kb, dueCards, wrongIds, starred, exams } = useApp();
  const next = kb ? upcomingExams(exams, new Date(), kb.courses.filter((c) => c.is_active).map((c) => c.id))[0] : undefined;
  const nextName = next ? (kb?.courseById.get(next.courseId)?.name ?? next.courseId) : "";
  const due = dueCards().length;
  const caseCount = kb?.questions.filter((q) => q.kind === "case").length ?? 0;
  const tableCount = kb?.tables.length ?? 0;

  const items: { href: Href; icon: IconName; title: string; text: string; color: ReturnType<typeof courseColor>; badge?: string; offline: boolean }[] = [
    { href: "/quiz", icon: "help-circle-outline", title: "Quiz", text: "Ders, ünite, konu, karışık ya da zayıf konularından çoktan seçmeli sorular.", color: courseColor("HUK2017"), offline: true },
    { href: "/kartlar", icon: "cards-outline", title: "Tekrar kartları", text: "Vadesi gelen kartları çevir, ne kadar bildiğini işaretle.", color: courseColor("HUK2013"), badge: due > 0 ? `${due} kart bugün` : "Bugünlük bitti", offline: true },
    { href: "/yanlislar", icon: "notebook-remove-outline", title: "Yanlışlarım", text: "Yanlış cevapladığın ve yıldızladığın sorulardan ayrı quiz.", color: courseColor("HUK3015"), badge: wrongIds.length + starred.size > 0 ? `${wrongIds.length} yanlış · ${starred.size} yıldızlı` : undefined, offline: true },
    { href: "/sinavlar", icon: "calendar-clock", title: "Sınav takvimi", text: "Vize ve final tarihleri, geri sayım ve sınav öncesi tekrar planı.", color: courseColor("HUK3011"), badge: next ? countdownText(nextName, next) : "Tarih eklenmedi", offline: true },
    { href: "/olaylar", icon: "gavel", title: "Olay çözme", text: "Olayı oku, cevabını yaz. Puan, atladığın maddeler ve örnek çözüm gelir.", color: courseColor("HUK2009"), badge: caseCount > 0 ? `${caseCount} olay` : undefined, offline: false },
    { href: "/tablolar", icon: "table-large", title: "Karşılaştırma tabloları", text: "Sık karıştırılan kavramlar yan yana.", color: courseColor("HUK3013"), badge: tableCount > 0 ? `${tableCount} tablo` : undefined, offline: true },
    { href: "/analiz", icon: "chart-donut", title: "Eksik analizi", text: "Hangi konuda zorlandığını renklerle gör, somut önerileri oku.", color: courseColor("HUK2003"), offline: true },
  ];

  return (
    <Screen title="Çalış" subtitle="Bugün ne yapmak istersin?">
      <SyncBanner />
      <View style={{ gap: space.sm }}>
        {items.map((it) => (
          <Pressable
            key={it.title}
            onPress={() => router.push(it.href)}
            accessibilityRole="button"
            accessibilityLabel={`${it.title}. ${it.text}`}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] }]}
          >
            <IconBubble name={it.icon} color={it.color.deep} tint={it.color.tint} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="subheading">{it.title}</T>
              <T v="small" color={colors.inkSoft}>
                {it.text}
              </T>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                {it.badge ? <Pill label={it.badge} color={it.color.deep} tint={it.color.tint} /> : null}
                {!it.offline ? <Pill label="İnternet gerekir" icon="wifi" color={colors.inkSoft} tint={colors.surfaceAlt} /> : null}
              </View>
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
});
