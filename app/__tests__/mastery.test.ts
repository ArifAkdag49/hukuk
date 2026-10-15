import { topicMastery, courseMastery, cardValue, type DataPoint } from "../src/mastery";

const now = new Date("2026-10-16T12:00:00.000Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

describe("topicMastery", () => {
  test("3'ten az veri → score null (yetersiz veri)", () => {
    expect(topicMastery([], now)).toEqual({ score: null, dataPoints: 0 });
    const two: DataPoint[] = [
      { kind: "mcq", value: 100, at: now },
      { kind: "mcq", value: 0, at: now },
    ];
    expect(topicMastery(two, now)).toEqual({ score: null, dataPoints: 2 });
  });

  test("aynı anda, eşit ağırlıklı mcq'lerin düz ortalaması", () => {
    const pts: DataPoint[] = [
      { kind: "mcq", value: 100, at: now },
      { kind: "mcq", value: 100, at: now },
      { kind: "mcq", value: 0, at: now },
    ];
    expect(topicMastery(pts, now)).toEqual({ score: 67, dataPoints: 3 });
  });

  test("ağırlıklar: olay 2, mcq 1, kart 0.5", () => {
    const pts: DataPoint[] = [
      { kind: "case", value: 100, at: now }, // w=2
      { kind: "mcq", value: 0, at: now }, // w=1
      { kind: "card", value: 0, at: now }, // w=0.5
    ];
    // (200 + 0 + 0) / 3.5 = 57.14
    expect(topicMastery(pts, now).score).toBe(57);
  });

  test("14 günlük yarı ömür: 14 gün önceki veri yarı ağırlıkta", () => {
    const pts: DataPoint[] = [
      { kind: "mcq", value: 0, at: daysAgo(14) }, // w=0.5
      { kind: "mcq", value: 0, at: daysAgo(14) }, // w=0.5
      { kind: "mcq", value: 100, at: now }, // w=1
    ];
    // 100 / 2 = 50
    expect(topicMastery(pts, now).score).toBe(50);
  });

  test("28 gün önceki veri çeyrek ağırlıkta", () => {
    const pts: DataPoint[] = [
      { kind: "mcq", value: 100, at: daysAgo(28) }, // 0.25
      { kind: "mcq", value: 0, at: now }, // 1
      { kind: "mcq", value: 0, at: now }, // 1
    ];
    // 25 / 2.25 = 11.1
    expect(topicMastery(pts, now).score).toBe(11);
  });

  test("kart değerleri: again 0, hard 60, good 85, easy 100", () => {
    expect(cardValue("again")).toBe(0);
    expect(cardValue("hard")).toBe(60);
    expect(cardValue("good")).toBe(85);
    expect(cardValue("easy")).toBe(100);
  });
});

describe("courseMastery", () => {
  test("yalnızca yeterli verili konuların ortalaması", () => {
    expect(courseMastery([80, null, 40, null])).toBe(60);
  });
  test("hiç yeterli veri yoksa null", () => {
    expect(courseMastery([null, null])).toBeNull();
    expect(courseMastery([])).toBeNull();
  });
});
