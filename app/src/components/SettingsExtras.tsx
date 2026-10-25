import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { planReminders } from "../reminders";
import { useApp } from "../store/AppContext";
import { colors, radius, space } from "../theme";
import { applyUpdate, checkAndFetchUpdate, versionInfo } from "../updates";
import { Notice } from "./States";
import { Button, Card, Gap, Icon, Row, T } from "./ui";

const MIN_MIN = 8 * 60; // 08:00
const MAX_MIN = 23 * 60; // 23:00
const STEP = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const label = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

/** Günlük kart hatırlatması: aç/kapa + 30 dk adımlı saat seçici. */
export function ReminderCard() {
  const { reminder, setReminder, kb, cardStates } = useApp();
  const [busy, setBusy] = useState(false);
  const total = reminder.hour * 60 + reminder.minute;

  const next = useMemo(() => {
    if (!kb || !reminder.enabled) return null;
    const active = kb.courses.filter((c) => c.is_active).map((c) => c.id);
    return planReminders({ cards: kb.flashcards, cardStates, activeCourseIds: active, now: new Date(), hour: reminder.hour, minute: reminder.minute })[0] ?? null;
  }, [kb, cardStates, reminder]);

  async function change(patch: Parameters<typeof setReminder>[0]) {
    setBusy(true);
    try {
      await setReminder(patch);
    } finally {
      setBusy(false);
    }
  }

  function shift(delta: number) {
    const t = Math.min(MAX_MIN, Math.max(MIN_MIN, total + delta));
    void change({ hour: Math.floor(t / 60), minute: t % 60 });
  }

  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={space.xs} style={{ flex: 1 }}>
          <Icon name="bell-ring-outline" color={colors.primary} />
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Kart hatırlatması</T>
            <T v="small" color={colors.muted}>
              Vadesi gelen kart varsa seçtiğin saatte bildirim gelir.
            </T>
          </View>
        </Row>
        <Switch
          value={reminder.enabled}
          disabled={busy}
          onValueChange={(v) => void change({ enabled: v })}
          trackColor={{ true: colors.primary, false: colors.lineStrong }}
          thumbColor={colors.white}
          accessibilityLabel={`Günlük hatırlatma ${reminder.enabled ? "açık" : "kapalı"}`}
        />
      </Row>

      {reminder.enabled ? (
        <>
          <Gap h={space.md} />
          <View style={styles.picker} accessibilityRole="adjustable" accessibilityLabel={`Hatırlatma saati ${label(reminder.hour, reminder.minute)}`}>
            <StepBtn icon="minus" label="30 dakika erken" disabled={busy || total <= MIN_MIN} onPress={() => shift(-STEP)} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <T v="display">{label(reminder.hour, reminder.minute)}</T>
              <T v="tiny" color={colors.muted}>
                08:00 ile 23:00 arası
              </T>
            </View>
            <StepBtn icon="plus" label="30 dakika geç" disabled={busy || total >= MAX_MIN} onPress={() => shift(STEP)} />
          </View>
          <Gap h={space.sm} />
          {reminder.permission === "denied" ? (
            <Notice
              tone="warning"
              text="Bildirim izni kapalı, hatırlatma gelmez. Telefonun Ayarlar > Uygulamalar > Lawly > Bildirimler bölümünden izin verebilirsin."
            />
          ) : reminder.permission === "unsupported" ? (
            <Notice tone="info" text="Bildirimler yalnızca Android uygulamasında çalışır." />
          ) : next ? (
            <T v="small" color={colors.inkSoft}>
              Bir sonraki hatırlatma:{" "}
              {next.date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} {label(next.date.getHours(), next.date.getMinutes())},{" "}
              {next.count} kart.
            </T>
          ) : (
            <T v="small" color={colors.inkSoft}>
              Önümüzdeki 7 gün için vadesi gelen kart yok; hatırlatma gerekmiyor.
            </T>
          )}
        </>
      ) : null}
    </Card>
  );
}

function StepBtn({ icon, label: a11y, onPress, disabled }: { icon: "minus" | "plus"; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.step, disabled && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={26} color={colors.primary} />
    </Pressable>
  );
}

/** Sürüm bilgisi ve elle güncelleme denetimi. */
export function VersionCard() {
  const { updateReady } = useApp();
  const v = versionInfo();
  const [state, setState] = useState<"idle" | "checking" | "none" | "ready">(updateReady ? "ready" : "idle");

  return (
    <Card>
      <Row gap={space.xs}>
        <Icon name="cellphone-arrow-down" color={colors.primary} />
        <T v="bodyStrong">Sürüm {v.appVersion}</T>
      </Row>
      <Gap h={4} />
      <T v="small" color={colors.muted}>
        {v.updateId ? `Güncelleme ${v.updateId}` : "Yerleşik sürüm"}
        {v.channel ? `, ${v.channel} kanalı` : ""}
      </T>
      <Gap h={space.md} />
      {state === "ready" || updateReady ? (
        <Button label="Yeniden başlat ve güncelle" icon="restart" onPress={() => void applyUpdate()} />
      ) : (
        <Button
          label={state === "checking" ? "Denetleniyor" : "Güncellemeleri denetle"}
          icon="refresh"
          kind="secondary"
          loading={state === "checking"}
          onPress={async () => {
            setState("checking");
            setState((await checkAndFetchUpdate(true)) ? "ready" : "none");
          }}
        />
      )}
      {state === "none" ? (
        <>
          <Gap h={space.sm} />
          <T v="small" color={colors.muted}>
            Uygulama güncel.
          </T>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  picker: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: space.sm },
  step: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.line },
});
