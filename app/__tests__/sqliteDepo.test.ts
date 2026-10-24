/**
 * SqliteDepo eşzamanlılık güvencesi: KB değişimi (işlem) sürerken gelen öğrenci yazımı işleme
 * karışmamalı; işlem bittikten sonra ayrı olarak yazılmalı. İkinci bağlantı (exclusive
 * transaction) Android'de NullPointerException verdiği için kullanılmamalı.
 */
import type { Attempt, KbExport } from "../src/types";

const mockLog: string[] = [];
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const mockDb = {
  execAsync: jest.fn(async (sql: string) => {
    mockLog.push(`exec:${sql.trim().slice(0, 11)}`);
  }),
  runAsync: jest.fn(async (sql: string) => {
    await tick();
    mockLog.push(`run:${sql}`);
    return { changes: 1, lastInsertRowId: 0 };
  }),
  getFirstAsync: jest.fn(async () => null),
  getAllAsync: jest.fn(async () => []),
  prepareAsync: jest.fn(async (sql: string) => ({
    executeAsync: jest.fn(async () => {
      await tick();
      mockLog.push(`stmt:${sql.slice(0, 24)}`);
    }),
    finalizeAsync: jest.fn(async () => {}),
  })),
  withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
    mockLog.push("BEGIN");
    await task();
    mockLog.push("COMMIT");
  }),
  withExclusiveTransactionAsync: jest.fn(async () => {
    throw new Error("ikinci bağlantı kullanılmamalı");
  }),
};

jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn(async () => mockDb) }));

// eslint-disable-next-line import/first
import { SqliteDepo } from "../src/db/sqliteDepo";

const kb: KbExport = {
  version: "v2",
  courses: [{ id: "HUK2011", code: "HUK2011", name: "Borçlar", year: 2, sort_order: 1, is_active: true }],
  units: [{ id: "HUK2011-u01", course_id: "HUK2011", title: "Ünite", sort_order: 1 }],
  topics: [],
  questions: [],
  flashcards: [],
  tables: [],
};
const attempt: Attempt = { id: "a1", question_id: "q1", kind: "mcq", selected_option: 1, correct: true, created_at: "2026-10-17T10:00:00Z" };

beforeEach(() => {
  mockLog.length = 0;
});

test("KB değişimi sürerken gelen quiz kaydı işleme karışmaz, işlemden sonra yazılır", async () => {
  const d = new SqliteDepo();
  await d.init();
  await Promise.all([d.replaceKb(kb), d.addAttempt(attempt)]);

  const begin = mockLog.indexOf("BEGIN");
  const commit = mockLog.indexOf("COMMIT");
  const attemptAt = mockLog.findIndex((l) => l.startsWith("run:INSERT OR REPLACE INTO local_attempts"));
  expect(begin).toBeGreaterThanOrEqual(0);
  expect(mockLog.some((l) => l.startsWith("stmt:INSERT INTO courses"))).toBe(true);
  expect(attemptAt).toBeGreaterThan(commit);
  expect(mockDb.withExclusiveTransactionAsync).not.toHaveBeenCalled();
});

test("işlem hata verse de sonraki yazımlar çalışmaya devam eder", async () => {
  const d = new SqliteDepo();
  await d.init();
  mockDb.withTransactionAsync.mockImplementationOnce(async () => {
    throw new Error("disk dolu");
  });
  await expect(d.replaceKb(kb)).rejects.toThrow("disk dolu");
  await d.addAttempt(attempt);
  expect(mockLog.some((l) => l.startsWith("run:INSERT OR REPLACE INTO local_attempts"))).toBe(true);
});
