import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, errorText } from "../src/api";
import { Bookshelf } from "../src/components/Bookshelf";
import { Notice } from "../src/components/States";
import { Button, Gap, Icon, T } from "../src/components/ui";
import { USE_FIXTURE } from "../src/config";
import { useApp } from "../src/store/AppContext";
import { colors, fonts, radius, space } from "../src/theme";

export default function Giris() {
  const { login } = useApp();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!password.trim()) {
      setError("Şifreni yaz.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(password);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "Şifre yanlış. Tekrar dene." : errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.xxxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Bookshelf height={88} />
          <View style={styles.shelf} />
          <Gap h={space.xl} />
          <T v="display">Lawly</T>
          <T v="body" color={colors.inkSoft}>
            Derslerin, quizlerin ve tekrar kartların tek yerde. Giriş yapınca bilgi bankası telefonuna iner, internet
            olmadan da çalışabilirsin.
          </T>
          <Gap h={space.xl} />
          <T v="smallStrong" color={colors.inkSoft} nativeID="sifre-etiket">
            Şifre
          </T>
          <Gap h={space.xs} />
          <View style={[styles.field, error ? { borderColor: colors.danger } : null]}>
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (error) setError(null);
            }}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Uygulama şifren"
            placeholderTextColor={colors.muted}
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
            accessibilityLabelledBy="sifre-etiket"
            accessibilityLabel="Şifre"
            style={styles.input}
          />
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Şifreyi gizle" : "Şifreyi göster"}
            hitSlop={8}
            style={styles.eye}
          >
            <Icon name={visible ? "eye-off-outline" : "eye-outline"} color={colors.muted} />
          </Pressable>
          </View>
          {error ? (
            <>
              <Gap h={space.sm} />
              <Notice tone="danger" text={error} />
            </>
          ) : null}
          <Gap h={space.lg} />
          <Button label={busy ? "Giriş yapılıyor" : "Giriş yap"} icon="login" size="lg" full loading={busy} onPress={() => void submit()} />
          {USE_FIXTURE ? (
            <>
              <Gap h={space.md} />
              <Notice tone="info" text="Geliştirme verisi açık: herhangi bir şifreyle girebilirsin." />
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  inner: { width: "100%", maxWidth: 460, alignSelf: "center" },
  shelf: { height: 6, borderRadius: 3, backgroundColor: colors.ink, opacity: 0.85 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  eye: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.ink,
  },
});
