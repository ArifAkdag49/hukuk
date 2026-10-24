import { Pressable, StyleSheet, View } from "react-native";
import { colors, courseColor, masteryColor, radius, shadow, space } from "../theme";
import type { Course, TopicLite, VerificationStatus } from "../types";
import { ProgressRing } from "./ProgressRing";
import { Icon, Pill, T } from "./ui";

/** Ders kartı: solda ders renginde kalın bir "kitap sırtı", sağda ustalık halkası. */
export function CourseCard({
  course,
  topicCount,
  score,
  onPress,
  dimmed,
}: {
  course: Course;
  topicCount: number;
  score: number | null;
  onPress?: () => void;
  dimmed?: boolean;
}) {
  const c = courseColor(course.id);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={topicCount === 0 ? `${course.name}, içerik hazırlanıyor` : `${course.name}, ${topicCount} konu, ${score === null ? "yetersiz veri" : `ustalık yüzde ${score}`}`}
      style={({ pressed }) => [styles.card, dimmed && { opacity: 0.55 }, pressed && styles.pressed]}
    >
      <View style={[styles.spine, { backgroundColor: c.main }]}>
        <View style={styles.spineBand} />
        <T v="tiny" color={colors.white} style={styles.spineCode}>
          {course.code.replace(/^HUK/, "")}
        </T>
        <View style={styles.spineBand} />
      </View>
      <View style={styles.body}>
        <T v="subheading" numberOfLines={2}>
          {course.name}
        </T>
        {topicCount > 0 ? (
          <T v="small" color={colors.muted}>
            {course.year}. sınıf, {topicCount} konu{score === null ? " · henüz çalışılmadı" : ""}
          </T>
        ) : (
          <Pill label="İçerik hazırlanıyor" icon="timer-sand" color={c.deep} tint={c.tint} />
        )}
      </View>
      <View style={styles.ring}>
        {topicCount > 0 ? (
          // Halka ustalığı gösterir: rengi ders rengi değil ustalık rengi (kırmızı = zayıf), ders rengi sırtta kalır
          <ProgressRing score={score} color={masteryColor(score).main} track={masteryColor(score).tint} size={58} stroke={7} label={score === null ? "Yeni" : `%${score}`} />
        ) : (
          <Icon name="progress-clock" size={30} color={c.main} />
        )}
      </View>
    </Pressable>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified") return <Pill label="Doğrulandı" icon="check-decagram" color={colors.successDeep} tint={colors.successTint} />;
  if (status === "partial")
    return <Pill label="Kısmen doğrulandı" icon="alert-decagram-outline" color={colors.warningDeep} tint={colors.warningTint} />;
  return <Pill label="Doğrulanamadı" icon="close-octagon-outline" color={colors.dangerDeep} tint={colors.dangerTint} />;
}

/** Konu satırı: başlık + ustalık yüzdesi (renkli) + ok. */
export function TopicRow({
  topic,
  score,
  dataPoints,
  onPress,
  showCourse,
  courseName,
}: {
  topic: TopicLite;
  score: number | null;
  dataPoints: number;
  onPress: () => void;
  showCourse?: boolean;
  courseName?: string;
}) {
  const cc = courseColor(topic.course_id);
  const mc = masteryColor(score);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}, ${score === null ? "yetersiz veri" : `ustalık yüzde ${score}`}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.dot, { backgroundColor: cc.main }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong" numberOfLines={2}>
          {topic.title}
        </T>
        {showCourse && courseName ? (
          <T v="small" color={cc.deep} numberOfLines={1}>
            {courseName}
          </T>
        ) : null}
      </View>
      <View style={[styles.score, { backgroundColor: mc.tint }]}>
        <T v="smallStrong" color={mc.deep}>
          {score === null ? (dataPoints > 0 ? `${dataPoints}/3 veri` : "Başla") : `%${score}`}
        </T>
      </View>
      <Icon name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    minHeight: 96,
    ...shadow.card,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  spine: { width: 40, alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  spineBand: { width: 24, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.6)" },
  spineCode: { transform: [{ rotate: "-90deg" }], width: 60, textAlign: "center", letterSpacing: 1 },
  body: { flex: 1, paddingVertical: space.md, paddingLeft: space.md, gap: 4, justifyContent: "center" },
  ring: { justifyContent: "center", paddingHorizontal: space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    minHeight: 60,
    borderRadius: radius.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  score: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, minWidth: 56, alignItems: "center" },
});
