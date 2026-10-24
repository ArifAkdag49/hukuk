import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, api, errorText } from "../../src/api";
import { Markdown, openLink } from "../../src/components/Markdown";
import { HeaderButton } from "../../src/components/Screen";
import { ErrorState, LoadingState, Notice } from "../../src/components/States";
import { Button, Icon, IconBubble, T } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, fonts, maxContentWidth, radius, shadow, space } from "../../src/theme";
import type { ChatMessage, Source, Thread } from "../../src/types";

/** Bağlantı kopunca cevabın sunucuda bitmesi için beklenen en uzun süre (derin cevap 2-4 dk sürebilir). */
const REPLY_WAIT_MS = 5 * 60_000;
const POLL_MS = 4_000;

function hasReply(msgs: ChatMessage[], text: string): boolean {
  const n = msgs.length;
  return n >= 2 && msgs[n - 1].role === "assistant" && msgs[n - 2].role === "user" && msgs[n - 2].content_md === text;
}

/**
 * Gönderilen mesajın cevabı sunucuda kaydolana kadar sohbeti yokla. Uygulama ön plana dönünce hemen
 * bakar. waitMs 0 ise bir kez bakar. Cevap gelmezse null.
 */
async function waitForReply(threadId: string, text: string, waitMs: number): Promise<ChatMessage[] | null> {
  const until = Date.now() + waitMs;
  for (;;) {
    try {
      const fresh = await api.getMessages(threadId);
      if (hasReply(fresh, text)) return fresh;
    } catch {
      // uygulama arka plandayken ya da bağlantı yokken istek düşer; beklemeye devam
    }
    if (Date.now() >= until) return null;
    await new Promise<void>((resolve) => {
      const t = setTimeout(done, POLL_MS);
      const sub = AppState.addEventListener("change", (s) => s === "active" && done());
      function done() {
        clearTimeout(t);
        sub.remove();
        resolve();
      }
    });
  }
}

const SOURCE_META: Record<Source["type"], { emoji: string; name: string }> = {
  kb: { emoji: "📘", name: "Bilgi bankası" },
  madde: { emoji: "⚖️", name: "Madde" },
  karar: { emoji: "🏛️", name: "Karar" },
  web: { emoji: "🌐", name: "Web" },
};

export default function Sohbet() {
  const { id, topic } = useLocalSearchParams<{ id: string; topic?: string }>();
  const isNew = id === "yeni";
  const { kb, getDraft, setDraft } = useApp();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState<null | { deep: boolean }>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [suggestNew, setSuggestNew] = useState(false);

  // Yeni sohbet: önce thread oluştur, sonra gerçek adrese geç
  useEffect(() => {
    if (!isNew) return;
    let alive = true;
    api
      .createThread(topic ?? null)
      .then((t) => alive && router.replace(`/sohbet/${t.id}`))
      .catch((e) => alive && setLoadError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [isNew, topic]);

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const [ths, msgs] = await Promise.all([api.listThreads(), api.getMessages(String(id))]);
      setThread(ths.find((t) => t.id === id) ?? null);
      setMessages(msgs);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [id, isNew]);

  useEffect(() => {
    void load();
    if (!isNew) void getDraft(`chat:${id}`).then((d) => d && setInput(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages?.length, sending]);

  // Klavye açılınca son mesaj ve yazma kutusu görünür kalsın
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => sub.remove();
  }, []);

  async function send(content: string, deep = false) {
    const text = content.trim();
    if (!text || sending || isNew) return;
    setSendError(null);
    setSending({ deep });
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, thread_id: String(id), role: "user", content_md: text, created_at: new Date().toISOString() };
    setMessages((m) => [...(m ?? []), optimistic]);
    setInput("");
    try {
      const r = await api.sendMessage(String(id), text, deep);
      setMessages((m) => [...(m ?? []), r.message]);
      if (r.suggest_new_thread) setSuggestNew(true);
      await setDraft(`chat:${id}`, null);
    } catch (e) {
      // Bağlantı koptuysa (başka uygulamaya geçince Android bağlantıyı keser) ya da zaman aşımı
      // olduysa sunucu cevabı yine de yazıp kaydeder: tekrar göndertip iki kez ücretlendirmek
      // yerine cevabın sohbete düşmesini bekle.
      const dropped = e instanceof ApiError && (e.status === 0 || e.status === 408);
      const fresh = await waitForReply(String(id), text, dropped ? REPLY_WAIT_MS : 0);
      if (fresh) {
        setMessages(fresh);
        await setDraft(`chat:${id}`, null);
        return;
      }
      // Mesaj kaybolmasın: kutuya geri koy ve taslak olarak sakla
      setMessages((m) => (m ?? []).filter((x) => x.id !== optimistic.id));
      setInput(text);
      await setDraft(`chat:${id}`, text);
      setSendError(errorText(e));
    } finally {
      setSending(null);
    }
  }

  const lastUser = [...(messages ?? [])].reverse().find((m) => m.role === "user");
  const last = messages?.[messages.length - 1];
  const topicLite = thread?.topic_id ? kb?.topicById.get(thread.topic_id) : null;
  const c = courseColor(topicLite?.course_id);

  async function newThread() {
    try {
      const t = await api.createThread(thread?.topic_id ?? null);
      router.replace(`/sohbet/${t.id}`);
    } catch (e) {
      setSendError(errorText(e));
    }
  }

  function onSource(s: Source) {
    if (s.type === "kb" && kb?.topicById.has(s.ref)) router.push(`/konu/${s.ref}`);
    else openLink(s.ref);
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.headerInner}>
        <HeaderButton icon="arrow-left" label="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace("/asistan"))} />
        <View style={{ flex: 1 }}>
          <T v="subheading" numberOfLines={1}>
            {thread?.title ?? (isNew ? "Yeni sohbet" : "Sohbet")}
          </T>
          <T v="small" color={topicLite ? c.deep : colors.muted} numberOfLines={1}>
            {topicLite ? `Konu: ${topicLite.title}` : "Genel soru"}
          </T>
        </View>
        <HeaderButton icon="chat-plus-outline" label="Yeni sohbet" onPress={() => void newThread()} />
      </View>
    </View>
  );

  if (loadError && !messages) {
    return (
      <View style={styles.root}>
        {header}
        <ErrorState text={`${loadError} Asistan için internet gerekir.`} onRetry={isNew ? undefined : () => void load()} />
      </View>
    );
  }
  if (!messages) {
    return (
      <View style={styles.root}>
        {header}
        <LoadingState text={isNew ? "Sohbet açılıyor…" : "Mesajlar getiriliyor…"} />
      </View>
    );
  }

  return (
    // Android'de tam ekran (edge-to-edge) düzende pencere klavyeyle küçülmez: boşluğu KeyboardAvoidingView bırakır
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      {header}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Notice tone="info" icon="scale-balance" text="Hukuki danışmanlık değildir. Önemli bilgileri resmî kaynaktan teyit et." />
        {messages.length === 0 ? (
          <View style={styles.welcome}>
            <IconBubble name="chat-question-outline" color={c.deep} tint={c.tint} size={64} />
            <T v="subheading" style={{ textAlign: "center" }}>
              {topicLite ? `"${topicLite.title}" hakkında ne sormak istersin?` : "Ne sormak istersin?"}
            </T>
            <T v="body" color={colors.inkSoft} style={{ textAlign: "center" }}>
              Asistan önce bilgi bankasına ve notlarına, sonra mevzuata, kararlara ve gerekirse web'e bakar. Cevabın altında kaynakları görürsün.
            </T>
          </View>
        ) : null}

        {messages.map((m) => (
          <Bubble key={m.id} m={m} accent={c.main} onSource={onSource} />
        ))}

        {sending ? (
          <View style={[styles.bubble, styles.botBubble, styles.typing]} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{sending.deep ? "Daha derin cevap hazırlanıyor" : "Asistan yazıyor"}</T>
              <T v="small" color={colors.muted}>
                Kaynaklara bakıyor. Bu 10-60 saniye sürebilir; başka uygulamaya geçebilirsin, cevap burada olacak.
              </T>
            </View>
          </View>
        ) : null}

        {!sending && last?.role === "assistant" && lastUser ? (
          <View style={styles.quick}>
            <QuickBtn label="Daha basit anlat" icon="emoticon-happy-outline" onPress={() => void send("Bunu daha basit anlatır mısın?")} />
            <QuickBtn label="Bundan 3 soru sor" icon="help-circle-outline" onPress={() => void send("Bu konudan bana 3 soru sor.")} />
            <QuickBtn label="Daha derin cevap" icon="layers-triple-outline" onPress={() => void send(lastUser.content_md, true)} />
          </View>
        ) : null}

        {suggestNew ? (
          <View style={styles.suggest}>
            <T v="body" color={colors.infoDeep}>
              Bu sohbet uzadı. Yeni bir sohbet açarsan cevaplar daha hızlı gelir ve maliyet düşer.
            </T>
            <Button label="Yeni sohbet aç" icon="chat-plus-outline" size="sm" onPress={() => void newThread()} />
          </View>
        ) : null}
        {sendError ? <Notice tone="danger" text={`${sendError} Mesajın kutuda duruyor, tekrar gönderebilirsin.`} /> : null}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + space.sm }]}>
        <View style={styles.inputInner}>
          <TextInput
            value={input}
            onChangeText={(t) => {
              setInput(t);
              if (!isNew) void setDraft(`chat:${id}`, t || null);
            }}
            placeholder="Sorunu yaz…"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
            accessibilityLabel="Mesaj"
            editable={!isNew}
          />
          <Pressable
            onPress={() => void send(input)}
            disabled={!input.trim() || !!sending}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            style={({ pressed }) => [styles.send, (!input.trim() || !!sending) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
          >
            <Icon name="send" color={colors.white} size={22} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ m, accent, onSource }: { m: ChatMessage; accent: string; onSource: (s: Source) => void }) {
  if (m.role === "user") {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <T v="body" color={colors.white}>
          {m.content_md}
        </T>
      </View>
    );
  }
  const deep = (m.model ?? "").includes("opus");
  return (
    <View style={[styles.bubble, styles.botBubble]}>
      {deep ? (
        <View style={styles.deepTag}>
          <Icon name="layers-triple" size={14} color={colors.primary} />
          <T v="tiny" color={colors.primary}>
            Derin cevap
          </T>
        </View>
      ) : null}
      <Markdown accent={accent}>{m.content_md}</Markdown>
      {m.sources && m.sources.length > 0 ? (
        <View style={styles.sources}>
          {m.sources.map((s, i) => (
            <Pressable
              key={`${s.ref}-${i}`}
              onPress={() => onSource(s)}
              accessibilityRole="link"
              accessibilityLabel={`${SOURCE_META[s.type].name}: ${s.label}`}
              style={({ pressed }) => [styles.source, pressed && { opacity: 0.75 }]}
            >
              <T v="small">{SOURCE_META[s.type].emoji}</T>
              <T v="smallStrong" color={colors.inkSoft} numberOfLines={1} style={{ maxWidth: 220 }}>
                {s.label}
              </T>
            </Pressable>
          ))}
        </View>
      ) : (
        <T v="tiny" color={colors.muted}>
          Kaynak gösterilmedi.
        </T>
      )}
    </View>
  );
}

function QuickBtn({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Icon>["name"]; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.8 }]}>
      <Icon name={icon} size={18} color={colors.primary} />
      <T v="smallStrong" color={colors.primary}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerInner: { flexDirection: "row", alignItems: "center", gap: space.sm, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  list: { padding: space.lg, gap: space.sm, width: "100%", maxWidth: maxContentWidth, alignSelf: "center", paddingBottom: space.xl },
  welcome: { alignItems: "center", gap: space.sm, paddingVertical: space.xl },
  bubble: { borderRadius: radius.lg, padding: space.md, maxWidth: "92%" },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  botBubble: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 6, gap: space.xs, ...shadow.card },
  typing: { flexDirection: "row", alignItems: "center", gap: space.sm },
  deepTag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  sources: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: space.xs, borderTopWidth: 1, borderTopColor: colors.line },
  source: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 34 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: colors.primaryTint, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 42 },
  suggest: { backgroundColor: colors.infoTint, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  inputBar: { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.md, paddingTop: space.sm },
  inputInner: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  send: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
