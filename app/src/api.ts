import { Platform } from "react-native";
import { API_URL, USE_FIXTURE } from "./config";
import { getToken } from "./auth/token";
import type {
  CaseGrade,
  ChatMessage,
  Course,
  KbExport,
  NoteDetail,
  NoteSummary,
  ProgressPayload,
  SendMessageResult,
  Thread,
  Usage,
} from "./types";
import { fakeApi } from "./dev/fakeApi";
import { ApiError, userMessage } from "./apiError";

export { ApiError, userMessage, errorText } from "./apiError";

/** Sunucu istemcisi. Sözleşme: görev tanımındaki "Sunucu API sözleşmesi" (snake_case). */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

let onUnauthorized: (() => void) | null = null;
/** 401 gelince giriş ekranına dönmek için kök yerleşim bunu bağlar. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export interface UploadFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
  /** Web'de belge seçici File nesnesi verir. */
  webFile?: Blob | null;
}

export interface ApiClient {
  login(password: string): Promise<{ token: string }>;
  getKbVersion(): Promise<{ version: string }>;
  exportKb(): Promise<KbExport>;
  createCourse(input: { code: string; name: string; year: number }): Promise<Course>;
  updateCourse(id: string, patch: { name?: string; is_active?: boolean }): Promise<Course>;
  syncProgress(p: ProgressPayload): Promise<{ ok: boolean; server_time: string }>;
  getAllProgress(): Promise<ProgressPayload>;
  uploadNote(file: UploadFile, courseId: string, title: string): Promise<{ id: string; status: "processing" }>;
  listNotes(): Promise<NoteSummary[]>;
  getNote(id: string): Promise<NoteDetail>;
  deleteNote(id: string): Promise<void>;
  gradeCase(questionId: string, answerText: string): Promise<CaseGrade>;
  createThread(topicId?: string | null): Promise<Thread>;
  listThreads(): Promise<Thread[]>;
  getMessages(threadId: string): Promise<ChatMessage[]>;
  sendMessage(threadId: string, content: string, deep: boolean): Promise<SendMessageResult>;
  getUsage(): Promise<Usage>;
}

interface ReqOpts {
  method?: string;
  body?: unknown;
  form?: FormData;
  timeoutMs?: number;
  auth?: boolean;
  /** Giriş ekranında 401 "şifre yanlış" demektir; oturumu düşürme. */
  silent401?: boolean;
}

async function request<T>(path: string, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method ?? "GET", headers, body, signal: ctrl.signal });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new ApiError(aborted ? 408 : 0, userMessage(aborted ? 408 : 0));
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const j = await res.json();
      detail = typeof j?.detail === "string" ? j.detail : undefined;
    } catch {
      // gövde JSON değil
    }
    if (res.status === 401 && !opts.silent401) onUnauthorized?.();
    throw new ApiError(res.status, userMessage(res.status, detail), detail);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const realApi: ApiClient = {
  login: (password) =>
    request("/auth/login", { method: "POST", body: { password }, auth: false, silent401: true }),
  getKbVersion: () => request("/kb/version"),
  exportKb: () => request("/kb/export", { timeoutMs: 180_000 }),
  createCourse: (input) => request("/kb/courses", { method: "POST", body: input }),
  updateCourse: (id, patch) => request(`/kb/courses/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  syncProgress: (p) => request("/progress/sync", { method: "POST", body: p, timeoutMs: 60_000 }),
  getAllProgress: () => request("/progress/all", { timeoutMs: 120_000 }),
  async uploadNote(file, courseId, title) {
    if (file.size && file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, userMessage(413));
    const form = new FormData();
    if (Platform.OS === "web" && file.webFile) {
      form.append("file", file.webFile, file.name);
    } else {
      // React Native FormData dosya nesnesi: { uri, name, type }
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    }
    form.append("course_id", courseId);
    form.append("title", title);
    return request("/notes", { method: "POST", form, timeoutMs: 180_000 });
  },
  listNotes: () => request("/notes"),
  getNote: (id) => request(`/notes/${encodeURIComponent(id)}`),
  deleteNote: (id) => request(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  gradeCase: (question_id, answer_text) =>
    request("/cases/grade", { method: "POST", body: { question_id, answer_text }, timeoutMs: 150_000 }),
  createThread: (topicId) =>
    request("/assistant/threads", { method: "POST", body: topicId ? { topic_id: topicId } : {} }),
  listThreads: () => request("/assistant/threads"),
  getMessages: (id) => request(`/assistant/threads/${encodeURIComponent(id)}/messages`),
  sendMessage: (id, content, deep) =>
    request(`/assistant/threads/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      body: { content, deep },
      timeoutMs: 150_000,
    }),
  getUsage: () => request("/usage/month"),
};

export const api: ApiClient = USE_FIXTURE ? fakeApi : realApi;
