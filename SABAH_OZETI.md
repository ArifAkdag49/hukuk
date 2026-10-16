# Sabah özeti — 17 Ekim 2026

Gece boyunca sistemin büyük kısmı kuruldu ve gerçek verilerle denendi.
**Henüz yapılmayanlar:** sunucuya kurulum ve telefona yükleme. İkisi de sizin
onayınızı gerektiriyor (bkz. "Sizden beklenenler").

## Hazır olanlar

| Parça | Durum |
|---|---|
| **Sunucu** (FastAPI + Postgres, Docker) | Bu bilgisayarda çalışıyor: `http://127.0.0.1:8810`. 69 otomatik test geçiyor. |
| **Bilgi bankası: Borçlar Hukuku Genel Hükümler** | 28 konuluk müfredatın **ilk 10 konusu** hazır. Bunlarda 201 çoktan seçmeli soru, 30 olay sorusu, 198 tekrar kartı, 29 gerçek Yargıtay kararı ve 8 karşılaştırma tablosu var. Kullanılan 64 kanun maddesinin hepsinin resmî metni alındı. |
| **Diğer 13 ders** | Uygulamada görünüyor ("İçerik hazırlanıyor"). İçerikleri henüz üretilmedi. |
| **Android uygulaması** | Tüm ekranlar yazıldı: ana sayfa, dersler, konu sayfası, quiz, olay çözme, kartlar, tablolar, eksik analizi, notlar, asistan, ayarlar. 30 test ve tip kontrolü temiz. Web önizlemede gerçek sunucuya bağlanarak denendi. |
| **Canlı yapay zekâ özellikleri** | Gerçek API ile denendi. Olay puanlama 15 sn sürdü. Not yükleme özet, soru ve kart üretti. Asistan normal modda 28 sn, derin modda 101 sn sürdü ve cevaplarında madde ve Yargıtay kaynakları vardı. |

Giriş şifresi: `GIRIS_BILGISI.txt` (git'e girmez).

## Harcanan API tutarı: ~21-23 $

- İçerik üretimi (10 konu, müfredat, denemeler): **20,57 $** kayıtlı.
- Uygulama denemeleri (asistan, not, olay puanlama): **0,57 $**.
- Kayda geçmeyen kısım yaklaşık 1-2 $. Nedenleri: ilk pilot denemesinde kesilen bir çağrı ve hatayı fark edince durdurduğum yarım işler. Bu sızıntı artık kapatıldı. Kesin rakam Anthropic Console'da.

## ⚠️ Önemli: maliyet tahminim düşüktü

Başta tüm bilgi bankası için "bir kerelik 50-90 $" demiştim. Gerçek ölçüm **konu başına yaklaşık 1 $** çıktı (Opus 5.5 ile, doğrulama ve kararlar dahil).

- Borçlar Genel'in kalan 18 konusu: **~18 $**
- 14 dersin tamamı (~350 konu): **~350 $**

Ucuzlatma seçenekleri (karar sizin):

1. **Batch API:** Aynı kalite, %50 indirim. Sonuçlar birkaç saat içinde gelir. Toplam ~175 $. Kodda küçük bir değişiklik gerekiyor.
2. **Soru, olay ve kartları Sonnet 5.5 ile üretmek:** Bunlar maliyetin yaklaşık yarısı. Konu anlatımı ve doğrulama Opus'ta kalır. Batch ile birlikte toplam ~120-130 $.
3. **Önce yalnız bu dönemin derslerini üretmek:** Kalan dersleri ihtiyaç oldukça üretmek.

## Bu gece yaptığım önemli tespitler ve kararlar

- **mevzuat.gov.tr bu bilgisayardan erişilemiyor** (bağlantı TLS aşamasında sıfırlanıyor). Bu yüzden Mevzuat MCP'si çalışmadı. Madde metinlerini aynı resmî konsolide metni veren **Adalet Bakanlığı bedesten servisinden** alıyorum. Linkler yine mevzuat.gov.tr'ye gidiyor.
- **Ciddi bir hatayı yakalayıp düzelttim:** Bazı maddelerin ikinci fıkrası (ör. TBK m. 8/2) metinden düşüyordu. Bunu fark edince üretimi durdurdum, düzelttim ve konuları yeniden ürettim.
- **İçerik üretimi aylık 50 $'lık tavana sayılmıyor.** Tek seferlik üretim yüzünden öğrenci asistanı kullanamaz hâle gelmesin diye böyle yaptım. Tavan yalnızca asistan, not ve olay puanlamaya uygulanıyor.
- **Bağımsız kod incelemesi yaptırdım:** 0 kritik, 11 önemli bulgu çıktı. Öğrenciyi etkileyen 9'unu düzelttim:
  - web aramalı cevapların bozuk biçimi
  - telefon fotoğraflarının boyut sınırı
  - zaman aşımında çift ücret
  - maliyet kaydı sızıntısı
  - içtihat servisinin yeniden bağlanması
  - ve diğerleri

  Tüm kararlar ve ertelenen küçük maddeler `.superpowers/sdd/.../progress.md` dosyasında.
- **Müfredat dosyası (`pipeline/curriculum/HUK2011.yaml`) artık yeniden üretilmemeli.** Konu kimlikleri değişir ve öğrencinin ilerlemesi eski kopyada kalır.

## Sizden beklenenler

1. **API anahtarını yenileyin.** Anahtar sohbette iki kez göründü. Console'da yenisini oluşturup `.env` içindeki `ANTHROPIC_API_KEY` satırına yazın (isterseniz ben yazarım).
2. **Sunucuya kurulum onayı.** Plesk'te `hukuk.arxdigitalsevice.com` subdomain'ini açmak ve yığını `/opt/hukuk`'a kurmak. Adımlar `DEPLOY.md`'de. Aynı sunucuda müşteri sistemleriniz çalıştığı için onaysız yapmadım.
3. **APK.** Sunucu kurulduktan sonra `eas build -p android --profile preview` ile alınır. Expo hesabınız arx-panel'den hazır.
4. **İçerik kararı.** Kalan konuları hangi seçenekle üreteyim? (Yukarıdaki 1, 2 veya 3.)
5. **Pilot inceleme.** Öğrenci ilk 10 konudan birkaçını okuyup hata işaretlerse kaliteyi ona göre ayarlarım. Elinize geçerse hocaların izlenceleri ve geçmiş sınav soruları da çok faydalı olur.

## Nasıl bakarsınız

```bash
cd app
npm run web:yerel
```

Tarayıcıda `http://localhost:8081` açılır. Giriş için `GIRIS_BILGISI.txt` dosyasındaki şifre kullanılır. Sunucu Docker'da açık olmalı (`docker compose up -d`).
