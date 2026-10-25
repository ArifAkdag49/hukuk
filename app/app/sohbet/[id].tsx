import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorText } from "../../src/api";
import { getPending, startSend, type PendingSend, type SendOutcome } from "../../src/chatPending";
import { Markdown, openLink } from "../../src/components/Markdown";
import { HeaderButton } from "../../src/components/Screen";
import { ErrorState, LoadingState, Notice } from "../../src/components/States";
import { Button, Icon, IconBubble, T } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, fonts, maxContentWidth, radius, shadow, space } from "../../src/theme";
import type { ChatMessage, Source, Thread } from "../../src/types";

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

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    if (isNew) return;
    const seq = ++loadSeq.current;
    try {
      const [ths, msgs] = await Promise.all([api.listThreads(), api.getMessages(String(id))]);
      if (seq !== loadSeq.current) return; // daha yeni bir yükleme var
      setThread(ths.find((t) => t.id === id) ?? null);
      // Cevabı beklenen mesaj sunucuya cevapla birlikte yazılır; o zamana kadar burada göster
      const p = getPending(String(id));
      setMessages(p ? [...msgs, p.optimistic] : msgs);
      setLoadError(null);
    } catch (e) {
      if (seq === loadSeq.current) setLoadError(errorText(e));
    }
  }, [id, isNew]);

  /** Gönderimin sonucunu ekrana uygula. Ekran o arada kapanıp yeniden açılmış olabilir. */
  const follow = useCallback(
    (p: PendingSend, alive: () => boolean) => {
      setSending({ deep: p.deep });
      void p.done.then((r: SendOutcome) => {
        if (!alive()) return;
        setSending(null);
        if (r.ok) {
          if (r.fresh) setMessages(r.fresh);
          else if (r.reply) {
            const reply = r.reply;
            setMessages((m) => {
              const base = (m ?? []).filter((x) => x.id !== p.optimistic.id && x.id !== reply.id);
              return [...base, { ...p.optimistic }, reply];
            });
          }
          if (r.suggestNew) setSuggestNew(true);
          void load(); // sunucudaki gerçek kayıtlarla eşitle
        } else {
          setMessages((m) => (m ?? []).filter((x) => x.id !== p.optimistic.id));
          setInput(p.text);
          setSendError(errorText(r.error));
        }
      });
    },
    [load],
  );

  // Bu sohbette cevabı beklenen bir mesaj varsa (ekrandan çıkıp geri gelindiyse) beklemeyi sürdür
  useEffect(() => {
    if (isNew) return;
    const p = getPending(String(id));
    if (!p) return;
    let alive = true;
    follow(p, () => alive);
    return () => {
      alive = false;
    };
  }, [id, isNew, follow]);

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

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  function send(content: string, deep = false) {
    const text = content.trim();
    if (!text || sending || isNew || getPending(String(id))) return;
    setSendError(null);
    const p = startSend(String(id), text, deep, setDraft);
    setMessages((m) => [...(m ?? []), p.optimistic]);
    setInput("");
    // Taslak hemen silinir ki geri dönünce gönderilmiş mesaj kutuda durmasın; gönderim başarısız olursa geri yazılır
    void setDraft(`chat:${id}`, null);
    follow(p, () => aliveRef.current);
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
                Kaynaklara bakıyor. Bu 10-60 saniye sürebilir. Başka bir sohbete, derse ya da uygulamaya geçebilirsin; cevap burada olacak.
              </T>
            </View>
          </View>
        ) : null}

        {!sending && last?.role === "assistant" && lastUser ? (
          <View style={styles.quick}>
            <QuickBtn label="Daha basit anlat" icon="emoticon-happy-outline" onPress={() => send("Bunu daha basit anlatır mısın?")} />
            <QuickBtn label="Bundan 3 soru sor" icon="help-circle-outline" onPress={() => send("Bu konudan bana 3 soru sor.")} />
            <QuickBtn label="Daha derin cevap" icon="layers-triple-outline" onPress={() => send(lastUser.content_md, true)} />
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
            onPress={() => send(input)}
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
