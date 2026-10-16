# Hukuk Çalışma — Android uygulaması

Expo SDK 57 + expo-router + React Native 0.86 + TypeScript. Paket adı `com.arx.hukuk`.

## Kurulum

```bash
cd app
npm install
```

## Çalıştırma

| Komut | Ne yapar |
|---|---|
| `npm run web:fixture` | Sunucu olmadan, `src/dev/fixture.ts` örnek verisiyle web önizleme. Herhangi bir şifreyle girilir. |
| `npm run web:yerel` | Web önizleme, yereldeki sunucuya (`127.0.0.1:8810`) Metro üzerinden bağlanır (CORS'a takılmamak için `/api` vekili, bkz. `metro.config.js`). |
| `npm run android` | Android emülatörü / Expo Go. Varsayılan sunucu `http://10.0.2.2:8810`. |
| `npm test` | jest birim testleri (SM-2, ustalık, eksik analizi, senkronizasyon, arama, vurgu, hatırlatma). |
| `npm run typecheck` | `tsc --noEmit` |

Ortam değişkenleri (`.env.example`):

- `EXPO_PUBLIC_API_URL` — sunucu adresi. Tanımlı değilse web'de `http://localhost:8810`, Android'de `http://10.0.2.2:8810`.
- `EXPO_PUBLIC_USE_FIXTURE=1` — API yerine örnek veri (sahte gecikmelerle not işleme, olay puanlama, asistan cevabı dahil).

## APK alma (EAS)

`eas.json` içindeki `preview` profili APK üretir ve `EXPO_PUBLIC_API_URL=https://hukuk.arxdigitalsevice.com` kullanır.

```bash
npm i -g eas-cli          # bir kez
eas login                 # mevcut Expo hesabı (owner: arifakdag25)
eas init                  # ilk seferde projectId'yi app.json'a yazar
eas build -p android --profile preview
```

Bitince EAS bağlantısındaki `.apk` telefona indirilip kurulur. Sunucu deploy edilmeden APK'nın girişi çalışmaz.

## Güncelleme yayınlama (OTA, EAS Update)

Yalnızca JavaScript/TypeScript ve görsel değişiklikleri APK yeniden kurulmadan telefona gönderilir:

```bash
cd app
eas update --channel preview --message "Kısa açıklama"
```

- Uygulama açılışta ve ön plana geldiğinde (en fazla saatte bir) güncellemeyi denetler, indirir ve
  "Yeni sürüm hazır" bandını gösterir; "Yeniden başlat" ile uygulanır. Ayarlar > Uygulama sürümü'nden elle de denetlenir.
- `runtimeVersion` politikası `appVersion`: güncelleme yalnız aynı `version` (app.json) ile derlenmiş APK'lara gider.
- **Yerel (native) bir bağımlılık eklenirse** (yeni bir `expo-*` modülü, izin, `app.json` eklentisi) OTA yetmez:
  yeni APK gerekir (`eas build -p android --profile preview`). Gerekirse `version`'ı artır ki eski APK'lar
  uyumsuz güncellemeyi almasın.

## Yapı

```
app/                 expo-router ekranları
  (tabs)/            Ana Sayfa, Dersler, Çalış, Notlarım, Asistan
  ders/[id]          ünite/konu ağacı + ustalık
  konu/[id]          Özet, Anlatım, Kritik, Maddeler, Kararlar, Sözlük, Notum (kişisel not + vurgular)
  ara                çevrimdışı arama (konu, sözlük, soru, kart, kişisel not)
  quiz, olaylar, olay/[id], kartlar, tablolar, tablo/[id], analiz
  not-yukle, not/[id], sohbet/[id], ayarlar, giris
src/
  theme.ts           renk / tipografi / boşluk token'ları, 14 ders rengi
  api.ts, apiError.ts   sunucu istemcisi (401 → giriş, 402 limit, 413 dosya büyük)
  db/                depo arayüzü: sqliteDepo (Android), webDepo (web: bellek + localStorage), memoryDepo (test)
  sync.ts            KB sürüm kontrolü + export, sync_queue → /progress/sync, ilk kurulumda /progress/all
  sm2.ts, mastery.ts, analysis.ts   çevrimdışı hesaplar
  search.ts          Türkçe katlamalı arama, sıralama, önizleme
  highlights.ts      blok bölme, FNV-1a blok özeti (vurgu kimliği)
  reminders.ts       günlük kart hatırlatma planı; notifications.ts bildirimleri kurar (web'de no-op)
  updates.ts         EAS Update denetimi (web/geliştirmede no-op)
  store/AppContext.tsx   uygulama durumu
  dev/fixture.ts, dev/fakeApi.ts    geliştirme verisi
__tests__/           jest testleri
```

## Çevrimdışı davranış

Konu okuma, quiz ve kartlar internetsiz çalışır. Denemeler ve kart tekrarları önce yerel depoya ve `sync_queue`'ya yazılır,
bağlantı gelince (açılışta, ön plana gelince, her denemeden sonra) `POST /progress/sync` ile gönderilir. Aynı kayıt iki kez
gönderilse de sunucu istemci UUID'siyle tekilleştirir. Olay cevabı ve asistan mesajı gönderilemezse taslak olarak saklanır.
Konu notları (`topic_note:<konu>`) ve vurgular (`highlight:<id>`) de aynı kuyruktan gider; ikisi de son yazan kazanır,
vurgu silme `deleted: true` ile yapılır.

## Bildirimler

Günlük kart hatırlatması varsayılan olarak açık (20:00). İlk girişte Android 13+ bildirim izni istenir. Plan önümüzdeki
7 gün için tek seferlik bildirimler olarak kurulur ve açılışta, ön plana gelişte, kart oturumu bitince ve ayar değişince
yenilenir. Bildirime dokununca Kartlar açılır.
