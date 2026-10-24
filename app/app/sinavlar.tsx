import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { EmptyState } from "../src/components/States";
import { Card, Icon, Pill, Row, SectionTitle, T } from "../src/components/ui";
import { EXAM_KINDS, EXAM_LABEL, SON_TUR_GUN, daysUntil, formatDateTr, parseDateTr, type ExamKind } from "../src/exams";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, fonts, radius, space } from "../src/theme";
import type { Course } from "../src/types";

/** Sınav takvimi: her aktif dersin vize ve final tarihi. */
export default function Sinavlar() {
  const { kb } = useApp();
  const courses = useMemo(() => (kb?.courses ?? []).filter((c) => c.is_active), [kb]);
  const years = [...new Set(courses.map((c) => c.year))].sort((a, b) => b - a);

  return (
    <Screen back title="Sınav takvimi" subtitle="Vize ve final tarihlerini gir">
      <Card style={{ backgroundColor: colors.primaryTint }}>
        <Row style={{ alignItems: "flex-start" }}>
          <Icon name="calendar-clock" color={colors.primaryDeep} />
          <T v="small" color={colors.primaryDeep} style={{ flex: 1 }}>
            Ana sayfada en yakın sınavın geri sayımı görünür. Sınava {SON_TUR_GUN} gün kala o dersin, sınavdan önce sırası
            gelmeyecek kartları bir kez öne alınır. Tarihler bu telefonda saklanır.
          </T>
        </Row>
      </Card>
      {courses.length === 0 ? (
        <EmptyState icon="bookshelf" title="Aktif ders yok" text="Ayarlar'dan ders açınca burada görünür." />
      ) : (
        years.map((y) => (
          <View key={y}>
            <SectionTitle title={`${y}. sınıf`} />
            <View style={{ gap: space.sm }}>
              {courses
                .filter((c) => c.year === y)
                .map((c) => (
                  <ExamCard key={c.id} course={c} />
                ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

function ExamCard({ course }: { course: Course }) {
  const c = courseColor(course.id);
  return (
    <Card padded={false}>
      <View style={{ flexDirection: "row" }}>
        <View style={[styles.spine, { backgroundColor: c.main }]} />
        <View style={{ flex: 1, padding: space.md, gap: space.sm }}>
          <T v="subheading">{course.name}</T>
          {EXAM_KINDS.map((k) => (
            <DateField key={k} courseId={course.id} kind={k} />
          ))}
        </View>
      </View>
    </Card>
  );
}

function DateField({ courseId, kind }: { courseId: string; kind: ExamKind }) {
  const { exams, setExam } = useApp();
  const saved = exams[courseId]?.[kind] ?? null;
  const [text, setText] = useState(saved ? formatDateTr(saved) : "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(saved ? formatDateTr(saved) : "");
  }, [saved]);

  function onChange(v: string) {
    // Rakam yazdıkça noktaları kendisi koyar: 12012027 → 12.01.2027
    const digits = v.replace(/\D/g, "").slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    setText(parts.join("."));
    setError(null);
  }

  async function commit() {
    if (!text.trim()) {
      if (saved) await setExam(courseId, kind, null);
      return;
    }
    const iso = parseDateTr(text);
    if (!iso) {
      setError("Tarihi GG.AA.YYYY biçiminde yaz (ör. 12.01.2027).");
      return;
    }
    await setExam(courseId, kind, iso);
  }

  const days = saved ? daysUntil(saved, new Date()) : null;

  return (
    <View>
      <Row>
        <T v="smallStrong" color={colors.inkSoft} style={{ width: 52 }}>
          {EXAM_LABEL[kind]}
        </T>
        <TextInput
          value={text}
          onChangeText={onChange}
          onBlur={() => void commit()}
          onSubmitEditing={() => void commit()}
          placeholder="GG.AA.YYYY"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={10}
          accessibilityLabel={`${EXAM_LABEL[kind]} tarihi`}
          style={[styles.input, error ? { borderColor: colors.danger } : null]}
        />
        {saved ? (
          <Pressable
            onPress={() => void setExam(courseId, kind, null)}
            accessibilityRole="button"
            accessibilityLabel={`${EXAM_LABEL[kind]} tarihini sil`}
            hitSlop={8}
            style={styles.clear}
          >
            <Icon name="close" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </Row>
      {days !== null && !Number.isNaN(days) ? (
        <View style={{ marginLeft: 52 + space.sm, marginTop: 4 }}>
          {days < 0 ? (
            <Pill label="Geçti" icon="check" color={colors.muted} tint={colors.surfaceAlt} />
          ) : (
            <Pill
              label={days === 0 ? "Bugün" : days === 1 ? "Yarın" : `${days} gün kaldı`}
              icon="timer-outline"
              color={days <= SON_TUR_GUN ? colors.warningDeep : colors.primaryDeep}
              tint={days <= SON_TUR_GUN ? colors.warningTint : colors.primaryTint}
            />
          )}
        </View>
      ) : null}
      {error ? (
        <T v="small" color={colors.dangerDeep} style={{ marginLeft: 52 + space.sm, marginTop: 4 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spine: { width: 8, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  clear: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
