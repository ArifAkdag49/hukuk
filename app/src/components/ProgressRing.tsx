import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme";
import { T } from "./ui";

/** Ustalık / puan halkası. score null ise "yetersiz veri" gösterir. */
export function ProgressRing({
  score,
  size = 56,
  stroke = 6,
  color,
  track = colors.surfaceAlt,
  label,
  big,
}: {
  score: number | null;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  /** Halkanın içindeki metni değiştirmek için */
  label?: string;
  big?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <View
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      accessibilityLabel={score === null ? "Yetersiz veri" : `Yüzde ${score}`}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {score !== null ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(c * v) / 100} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <T v={big ? "display" : size >= 56 ? "smallStrong" : "tiny"} color={score === null ? colors.muted : colors.ink}>
        {label ?? (score === null ? "–" : `${score}`)}
      </T>
    </View>
  );
}
