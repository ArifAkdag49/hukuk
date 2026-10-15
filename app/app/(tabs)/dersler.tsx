import { router } from "expo-router";
import { View } from "react-native";
import { CourseCard } from "../../src/components/Course";
import { HeaderButton, Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/States";
import { SyncBanner } from "../../src/components/SyncBanner";
import { SectionTitle } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { space } from "../../src/theme";

export default function Dersler() {
  const { kb, courseScore, syncNow } = useApp();
  const right = <HeaderButton icon="pencil-outline" label="Dersleri düzenle" onPress={() => router.push("/ayarlar")} />;

  if (!kb || kb.courses.length === 0) {
    return (
      <Screen title="Dersler" right={right}>
        <SyncBanner />
        <EmptyState
          icon="bookshelf"
          title="Henüz ders yok"
          text="Bilgi bankası indiğinde derslerin burada görünür."
          action="Şimdi indir"
          onAction={() => void syncNow()}
        />
      </Screen>
    );
  }

  const active = kb.courses.filter((c) => c.is_active);
  const years = [...new Set(active.map((c) => c.year))].sort();

  return (
    <Screen title="Dersler" subtitle={`${active.length} aktif ders`} right={right}>
      <SyncBanner />
      {years.map((y) => (
        <View key={y}>
          <SectionTitle title={`${y}. sınıf`} />
          <View style={{ gap: space.sm }}>
            {active
              .filter((c) => c.year === y)
              .map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  topicCount={kb.topicsByCourse.get(c.id)?.length ?? 0}
                  score={courseScore(c.id)}
                  onPress={() => router.push(`/ders/${c.id}`)}
                />
              ))}
          </View>
        </View>
      ))}
      {active.length === 0 ? (
        <EmptyState
          icon="eye-off-outline"
          title="Bütün dersler kapalı"
          text="Ayarlar'dan çalışmak istediğin dersleri aç."
          action="Ayarlara git"
          onAction={() => router.push("/ayarlar")}
        />
      ) : null}
    </Screen>
  );
}
