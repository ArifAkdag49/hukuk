import { colors } from "../theme";
import type { NoteSummary } from "../types";
import { Pill } from "./ui";

export function NoteStatusPill({ status }: { status: NoteSummary["status"] }) {
  if (status === "ready") return <Pill label="Hazır" icon="check-circle" color={colors.successDeep} tint={colors.successTint} />;
  if (status === "failed") return <Pill label="Okunamadı" icon="alert-circle" color={colors.dangerDeep} tint={colors.dangerTint} />;
  return <Pill label="İşleniyor" icon="progress-clock" color={colors.warningDeep} tint={colors.warningTint} />;
}
