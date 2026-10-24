import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, courseColor, radius, shadow, space } from "../theme";
import type { Course } from "../types";
import { Icon, T } from "./ui";

/**
 * Ders seçici: seçili dersi tek satırda gösterir, dokununca sınıfa göre gruplanmış liste açılır.
 * Çok ders olunca çip yığınının yerini alır.
 */
export function CoursePicker({
  courses,
  value,
  onChange,
  allLabel,
  counts,
  label = "Ders",
}: {
  courses: Course[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Verilirse listenin başında "hepsi" seçeneği olur (value null). */
  allLabel?: string;
  /** Ders başına sayı (ör. vadesi gelen kart) */
  counts?: Map<string, number>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = value ? courses.find((c) => c.id === value) : null;
  const years = [...new Set(courses.map((c) => c.year))].sort((a, b) => b - a);
  const total = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : null;

  function pick(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name ?? allLabel ?? "seçilmedi"}. Değiştirmek için dokun`}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.spine, { backgroundColor: selected ? courseColor(selected.id).main : colors.lineStrong }]} />
        <View style={{ flex: 1 }}>
          <T v="tiny" color={colors.muted}>
            {label}
          </T>
          <T v="bodyStrong" numberOfLines={2}>
            {selected?.name ?? allLabel ?? "Ders seç"}
          </T>
        </View>
        {selected && counts ? <Count n={counts.get(selected.id) ?? 0} /> : !selected && total !== null ? <Count n={total} /> : null}
        <Icon name="chevron-down" color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.grab} />
          <T v="heading" style={{ paddingHorizontal: space.lg, marginBottom: space.xs }}>
            {label} seç
          </T>
          <ScrollView contentContainerStyle={{ paddingHorizontal: space.sm }}>
            {allLabel ? <Option name={allLabel} color={colors.primary} selected={!value} count={total} onPress={() => pick(null)} /> : null}
            {years.map((y) => (
              <View key={y}>
                <T v="smallStrong" color={colors.muted} style={styles.group}>
                  {y}. sınıf
                </T>
                {courses
                  .filter((c) => c.year === y)
                  .map((c) => (
                    <Option
                      key={c.id}
                      name={c.name}
                      color={courseColor(c.id).main}
                      selected={value === c.id}
                      count={counts ? (counts.get(c.id) ?? 0) : null}
                      onPress={() => pick(c.id)}
                    />
                  ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Count({ n }: { n: number }) {
  return (
    <View style={styles.count}>
      <T v="tiny" color={colors.inkSoft}>
        {n}
      </T>
    </View>
  );
}

function Option({ name, color, selected, count, onPress }: { name: string; color: string; selected: boolean; count: number | null; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.option, selected && { backgroundColor: colors.surfaceAlt }, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <T v="body" style={{ flex: 1 }}>
        {name}
      </T>
      {count !== null ? <Count n={count} /> : null}
      <Icon name={selected ? "check-circle" : "circle-outline"} color={selected ? color : colors.lineStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: space.sm,
    paddingRight: space.md,
    paddingLeft: space.sm,
    minHeight: 60,
  },
  spine: { width: 6, alignSelf: "stretch", borderRadius: 3 },
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.sm,
    maxHeight: "80%",
    ...shadow.raised,
  },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, alignSelf: "center", marginBottom: space.sm },
  group: { paddingHorizontal: space.sm, marginTop: space.md, marginBottom: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, minHeight: 52, borderRadius: radius.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  count: { minWidth: 28, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, alignItems: "center" },
});
