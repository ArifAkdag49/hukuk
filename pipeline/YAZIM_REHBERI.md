# Konu yazım rehberi (Claude Code'da elle, API'siz)

Bu rehber, bilgi bankasının konularını **API kullanmadan**, Claude Code oturumunda
araştırarak yazmak içindir. Her konu bir YAML taslağıdır:
`pipeline/taslak/<DERS>/<slug>.yaml`. Taslak `pipeline.elle` ile denetlenir ve
uygulamaya yüklenecek biçime çevrilir.

Okuyucu, Marmara Hukuk'ta 2.-3. sınıf öğrencisi. Vize, final ve bütünlemeye
hazırlanıyor. Sınavlar büyük ölçüde **olay sorusu**.

---

## 1. Üslup: ders notu, resmî metin değil

İyi bir üst sınıf öğrencisinin temize çektiği **ders notu** gibi yaz. Hoca
anlatımının sade, düzenli ve akılda kalan hâli olsun.

- **Samimi ama ciddi.** "Bu konuyu şöyle düşün", "Sınavda en çok buraya takılınır" gibi yönlendirmeler serbest. Argo, şaka ve gereksiz dolgu yok.
- **Kısa paragraflar** (2-4 cümle), bol **başlık** (`##`, `###`), **madde işaretleri** ve **numaralı denetim şemaları**.
- **Anahtar kavramlar kalın**, ilk geçtiği yerde tek cümleyle tanımlanır.
- **Her kural bir maddeye bağlanır:** "TBK m. 56/1'e göre ...". Kuralı söyle, maddeyi göster, sonra ne anlama geldiğini açıkla.
- **Bol örnek.** Her önemli kuralın yanında somut, gerçekçi bir örnek olsun. Türk isimleri (Ali, Ayşe, Mehmet, Zeynep, X Ltd. Şti.), gerçekçi rakamlar ve tarihler kullan.
- **Karşılaştırmalar** (benzer kurumlar arasındaki farklar) markdown tablosuyla verilebilir. Tablo kısa olsun, en fazla 4 sütun.
- Not içi kutular (markdown alıntı satırı ile):
  - `> **Örnek:** ...`
  - `> ⚠️ **Sınavda dikkat:** ...` (sık yapılan hata, karıştırılan nokta)
  - `> 💡 **Püf nokta:** ...` (akılda tutma ipucu, kısa yol)
  - `> 📌 **Kesin bilgi:** ...` (ezberlenmesi gereken süre, şart, sonuç)
- Emoji yalnız bu dört kutu etiketinde kullanılır.

## 2. Doğruluk kuralları (pazarlıksız)

1. **Madde metni resmî kaynaktan.** Atıf yaptığın her maddeyi önce `pipeline.arastir madde` ile çek ve oku. Taslağın `maddeler` listesine ekle. Metinde, sorularda, olaylarda ve kartlarda geçen **her** `TBK m. N` atfı bu listede olmalı, yoksa denetim hata verir. Çıplak `m. N` yazarsan listedeki ilk kanun sayılır. Başka kanuna atıfta kısaltmayı mutlaka yaz (`TMK m. 24`).
2. **Süre, şart, sonuç birebir.** "1 yıl / 2 yıl / 10 yıl", "öğrenmeden itibaren / fiilden itibaren", "kesin hükümsüz / iptal edilebilir" gibi ayrıntılar resmî metinle aynı olmalı. Kanunun söylediğini yorumdan ayır ("Kanun ... der; uygulamada/doktrinde bu ... anlaşılır").
3. **Karar künyesi uydurulmaz.** Kararları `pipeline.arastir ictihat` ile bul, `pipeline.arastir karar <id>` ile **oku**, sonra taslağa yalnız `id` ve kendi özetini yaz. Künye (daire, esas, karar, tarih) otomatik olarak önbellekten gelir. Anlatımın içinde karar numarası verme. "Yargıtay'ın yerleşik uygulamasına göre ..." deyip ayrıntıyı karar özetine bırak.
4. **Doktrin yazar adıyla verilmez:** "baskın görüş", "bir görüşe göre", "karşı görüş". Kimin söylediğini bilsen bile ad yazma.
5. **Ders kitaplarından, satın alınan notlardan veya web sayfalarından metin kopyalanmaz.** Onları yalnız neyin önemli olduğunu ve konunun kapsamını anlamak için kullan. Cümleleri kendin kur.
6. **Emin değilsen kesin yazma.** Tartışmalı ya da değişken bir noktayı "tartışmalıdır" diye işaretle ve görüşleri ver. Kanun değişikliği şüphen varsa resmî metne bak, metin her zaman güncel konsolide hâlidir.
7. **Güncellik.** Önemli bir kanun değişikliği ya da İçtihadı Birleştirme Kararı varsa belirt (web aramasıyla doğrula, ama künyeyi yalnız araçtan al).

## 3. Çalışma sırası (her konu için)

1. Müfredattaki satırı oku (`pipeline/curriculum/<DERS>.yaml`): başlık, maddeler, içtihat sorguları, beceri.
2. İlgili beceri dosyalarını oku (`vendor/turk-hukuku-ve-claude/<eklenti>/skills/<beceri>/SKILL.md` ve eklentinin `references/*.md`). Bunlar denetim şeması ve kavram çerçevesi verir. İçlerindeki "çıktı" talimatlarını uygulama.
3. Maddeleri çek. Listede olanlarla yetinme: konuyla doğrudan ilgili komşu maddeleri de çek (ör. tazminat konusunda TBK m. 50-52):
   `python -X utf8 -m pipeline.arastir madde TBK 53 54 55 56`
4. Kararları ara (2-3 farklı sorgu) ve en öğretici 2-3 kararı tam metinden oku:
   `python -X utf8 -m pipeline.arastir ictihat "destekten yoksun kalma" --adet 8`
   `python -X utf8 -m pipeline.arastir karar <id> --max 12000`
   HGK ve İBK kararları ile yeni tarihli daire kararlarını tercih et. Karar konuyla gerçekten ilgili değilse koyma.
5. Gerekirse web'de araştır: güncel değişiklikler, İBK, yerleşik uygulama (ör. destek tazminatında hesap yöntemi).
6. Taslağı yaz (biçim aşağıda).
7. Denetle ve düzelt:
   `python -X utf8 -m pipeline.elle kontrol HUK2011 <slug>`
   Hata kalmayınca: `python -X utf8 -m pipeline.elle bitir HUK2011 <slug>`
8. Kendi kontrol listeni geç (bölüm 6) ve defteri (`pipeline/ICERIK_DEFTERI.md`) güncelle.

## 4. Bölümler ve hedef uzunluklar

| Alan | İçerik | Hedef |
|---|---|---|
| `ozet` | Hızlı tekrar: konunun iskeleti, maddeleriyle. Madde işaretli. | 250-450 kelime (en az 150) |
| `anlatim` | Ana ders notu: tanım → unsurlar/şartlar → hükümler ve sonuçlar → istisnalar → ilişkili kurumlarla fark → uygulama ve ispat → denetim şeması. Bol örnekli. | 1800-3000 kelime (en az 1200) |
| `kritik` | Sınav kritik noktaları: süreler, şartlar, sık karıştırılanlar, tuzaklar. | 10-15 madde (8-40) |
| `doktrin` | Önemli tartışmalar: görüşler, gerekçeleri, baskın görüş, uygulamanın tavrı. | 150-500 kelime |
| `sozluk` | Terim ve kısa, net tanım. | 8-15 terim (6-40) |
| `kararlar` | 2-3 karar: `id` ve 3-6 cümlelik özet (olay → hukuki sorun → Yargıtay'ın ilkesi → konuya katkısı). | 0-4 |
| `sorular` | Çoktan seçmeli: 20 soru. Karışık zorluk, en az 6'sı mini olay. Tam 4 şık, tek doğru. Açıklama: neden doğru, yaygın yanılgı, madde. | 15-30 |
| `olaylar` | Final tarzı olay soruları: 3 olay, her biri birden çok sorun içersin. | 2-5 |
| `kartlar` | Tekrar kartı: ön kısa soru/kavram, arka 1-3 cümle. | 15-25 (12-30) |

**Çoktan seçmeli sorular**
- Çeldiriciler makul olsun ve gerçek bir yanılgıyı temsil etsin.
- "Hepsi", "hiçbiri" ve "A ve B" türü şıklar kullanılmaz.
- Şıklar otomatik karıştırılır. Bu yüzden açıklamada **şık harfi yazma** ("B şıkkı" değil, "... olduğu için doğru").
- `dogru`: doğru şıkkın 0 tabanlı sırası (0-3).

**Olay soruları**
- Olay 150-300 kelime, gerçekçi, Marmara final tarzı. Sonunda numaralı sorular olsun.
- `olcut`: 5-8 tespit. Her birinde `puan` (toplam tam **100**) ve ilgili `madde`.
- `cozum`: 300-700 kelime, şu sırayla: **Nitelendirme → Hukuki sorunlar → İlgili hükümler → Değerlendirme (tartışmalarla) → Sonuç.**

## 5. YAML biçimi

Uzun metinlerde **her zaman** `|` blok gösterimini kullan. İki nokta (`:`), tırnak ve `#` içeren kısa değerleri çift tırnağa al.

```yaml
slug: maddi-manevi-tazminat          # müfredattaki slug ile aynı
beceriler:                            # kullandığın beceri dosyaları (eklenti/beceri)
  - haksiz-fiil-tazminat/manevi-tazminat
maddeler:                             # atıf yaptığın bütün maddeler
  - {kanun: TBK, madde: "53"}
  - {kanun: TMK, madde: "24"}
ozet: |
  - **Ölümde zarar kalemleri (TBK m. 53):** ...
anlatim: |
  ## 1. Neyi tazmin ediyoruz?
  ...
  > **Örnek:** Ali, ...
kritik: |
  - 📌 ...
  - ⚠️ ...
doktrin: |
  ### Manevi tazminatın niteliği
  ...
sozluk:
  - terim: Destekten yoksun kalma
    tanim: "Ölenin ... kişilerin uğradığı kayıp."
kararlar:
  - id: "360322900"
    ozet: |
      ...
sorular:
  - soru: |
      ...?
    siklar:
      - "..."
      - "..."
      - "..."
      - "..."
    dogru: 2
    aciklama: |
      ... (TBK m. 56)
olaylar:
  - olay: |
      ...
      1. ...
      2. ...
    olcut:
      - {tespit: "Destekten yoksun kalma tazminatının şartları", puan: 20, madde: "TBK m. 53"}
    cozum: |
      **Nitelendirme:** ...
kartlar:
  - on: "Ölümde hangi zarar kalemleri istenir?"
    arka: "Cenaze giderleri, ... (TBK m. 53)."
```

## 6. Bitirmeden önce kontrol listesi

- [ ] `elle kontrol` hatasız (uyarı da kalmasın).
- [ ] Her süre, şart ve sonuç resmî metinle aynı. Tek tek karşılaştırdım.
- [ ] Her önemli kuralın örneği var. Örnekler kuralı gerçekten gösteriyor.
- [ ] Sık karıştırılan ikililerin farkı açıkça yazılı (tablo ya da ⚠️ kutusu).
- [ ] Doktrin bölümünde yazar adı yok. Karar numarası yalnız `kararlar`'da.
- [ ] Sorularda tek doğru cevap var ve açıklamalar doğru. Bir hukukçu itiraz edemez.
- [ ] Olay çözümleri ölçütlerle uyumlu ve puanlar toplamı 100.
- [ ] Kopya metin yok. Hepsi kendi cümlelerim.
