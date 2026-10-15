/**
 * Sunucu API sözleşmesindeki tipler (alan adları snake_case, sunucuyla birebir).
 * Değiştirirken server/app/routers/* ile eşleştiğinden emin ol.
 */

export type VerificationStatus = "verified" | "partial" | "failed";
export type Origin = "bank" | "note";
export type Grade = "again" | "hard" | "good" | "easy";

export interface Course {
  id: string; // ders kodu, ör. "HUK2011"
  code: string;
  name: string;
  year: number;
  sort_order: number;
  is_active: boolean;
}

export interface Unit {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface TopicArticle {
  law_name: string;
  law_no: string | number | null;
  article_no: string;
  official_text: string;
  source_url: string | null;
  verified: boolean;
}

export interface TopicCase {
  court: string;
  chamber: string | null;
  esas_no: string | null;
  karar_no: string | null;
  decision_date: string | null;
  summary_md: string;
  source_url: string | null;
  verified: boolean;
}

export interface Topic {
  id: string;
  unit_id: string;
  course_id: string;
  title: string;
  sort_order: number;
  summary_md: string;
  content_md: string;
  critical_md: string;
  doctrine_md: string;
  glossary: GlossaryItem[];
  verification_status: VerificationStatus;
  generated_at: string | null;
  articles: TopicArticle[];
  cases: TopicCase[];
}

/** Listelerde kullanılan hafif konu kaydı (uzun metinler olmadan). */
export type TopicLite = Pick<
  Topic,
  "id" | "unit_id" | "course_id" | "title" | "sort_order" | "verification_status"
>;

export interface RubricItem {
  point: string;
  weight: number;
  madde_ref: string | null;
}

export interface Question {
  id: string;
  topic_id: string | null;
  course_id: string;
  kind: "mcq" | "case";
  stem_md: string;
  options: string[] | null;
  correct_option: number | null;
  explanation_md: string | null;
  rubric: RubricItem[] | null;
  model_answer_md: string | null;
  origin: Origin;
  note_id: string | null;
}

export interface Flashcard {
  id: string;
  topic_id: string | null;
  course_id: string;
  front_md: string;
  back_md: string;
  origin: Origin;
  note_id: string | null;
}

export interface ComparisonTable {
  id: string;
  course_id: string;
  title: string;
  columns: string[];
  rows: string[][];
  related_topic_ids: string[];
}

export interface KbExport {
  version: string;
  courses: Course[];
  units: Unit[];
  topics: Topic[];
  questions: Question[];
  flashcards: Flashcard[];
  tables: ComparisonTable[];
}

// ---- İlerleme ----

export interface Attempt {
  id: string; // uuid
  question_id: string;
  kind: "mcq" | "case";
  selected_option?: number | null;
  answer_text?: string | null;
  correct?: boolean | null;
  score?: number | null;
  feedback?: unknown;
  created_at: string; // ISO
}

export interface CardReview {
  id: string; // uuid
  card_id: string;
  grade: Grade;
  reviewed_at: string; // ISO
}

export interface CardState {
  card_id: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: string; // ISO
  last_grade: Grade;
  updated_at: string; // ISO
}

export interface ProgressPayload {
  attempts: Attempt[];
  card_reviews: CardReview[];
  card_states: CardState[];
}

// ---- Notlar ----

export type NoteStatus = "processing" | "ready" | "failed";

export interface NoteSummary {
  id: string;
  course_id: string;
  title: string;
  status: NoteStatus;
  error: string | null;
  created_at: string;
}

export interface Contradiction {
  quote: string;
  problem: string;
  suggestion: string;
}

export interface NoteDetail extends NoteSummary {
  summary_md: string | null;
  contradictions: Contradiction[];
  topics: { topic_id: string; title: string; confidence: number }[];
  questions: Question[];
  flashcards: Flashcard[];
}

// ---- Olay puanlama ----

export interface CaseGrade {
  score: number;
  correct_points: string[];
  missed: { point: string; madde_ref: string | null }[];
  missing_discussions: string[];
  feedback_md: string;
  model_answer_md: string;
}

// ---- Asistan ----

export interface Thread {
  id: string;
  title: string;
  topic_id: string | null;
  created_at: string;
}

export interface Source {
  type: "kb" | "madde" | "karar" | "web";
  label: string;
  ref: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content_md: string;
  sources?: Source[];
  model?: string | null;
  created_at: string;
}

export interface SendMessageResult {
  message: ChatMessage;
  suggest_new_thread: boolean;
}

export interface Usage {
  month: string;
  cost_usd: number;
  cap_usd: number;
  by_feature: Record<string, number>;
}
