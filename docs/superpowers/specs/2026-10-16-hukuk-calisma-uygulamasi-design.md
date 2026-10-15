# Hukuk Çalışma Uygulaması — Tasarım Belgesi

Tarih: 2026-10-16
Durum: İnceleme bekliyor

## 1. Amaç ve bağlam

Marmara Üniversitesi Hukuk Fakültesi'nde okuyan **tek bir öğrenciye** ders çalışmada destek olacak bir Android uygulaması. Öğrenci 3. sınıfta ve 2. sınıftan alttan aldığı dersler var. Bu yüzden 2. ve 3. sınıf dersleri birlikte kapsanıyor.

**Kullanıcının söyledikleri:**
- Her ders ve her konu için önemli konu anlatımları ve kritik bilgiler istendiğinde açılıp gösterilebilmeli.
- İstenen ders ve konudan quiz çözülebilmeli, eksik konuların analizi yapılabilmeli.
- Öğrenci kendi ders notlarını yükleyebilmeli. Notlardan özet ve çoktan seçmeli test üretilmeli.
- Canlı bir yapay zekâ asistanı olmalı. Anlaşılmayan konularda güncel araştırma yaparak Anayasa, kanunlar ve diğer kaynaklardan cevap bulmalı.
- Bilgi, Aydın Can Polatkan'ın Türk hukuku beceri kütüphanesi ve MCP'leri ile güvenilir kaynaklardan **en ince ayrıntısına kadar** önceden hazırlanmalı.
- Ek olarak: olay çözme pratiği, tekrar kartları (Anki tarzı) ve karşılaştırma tabloları da olmalı.

**Varsayımlar (kullanıcı onayladı):**
- Ders listesi, Marmara Üniversitesi Hukuk Fakültesi'nin MEOBS'te yayımlanan 2023 müfredatından alındı (dersler yıllık). Öğrencinin alttan aldığı derslerin tam listesi bilinmiyor, bu yüzden 2. ve 3. sınıfın tüm zorunlu dersleri kapsanıyor. Dersler veritabanında durur ve uygulama içinden eklenip çıkarılabilir, düzenlenebilir.
- MEOBS'teki güncel ders sayfalarında haftalık konu planı ve kaynak alanları boş. Konu ağaçları, ilgili kanunun sistematiğinden (ör. Borçlar Genel için TBK genel hükümleri) ve beceri kütüphanesinden kurulur. Öğrenci hocanın izlencesini, önerilen kitap listesini veya geçmiş sınav sorularını `kaynaklar/` klasörüne eklerse, konu ağacı ve olay soruları bunlara göre ayarlanır.
- Uygulama kişisel kullanım için. Üniversitenin adı ve logosu resmî bir ürünmüş gibi kullanılmayacak.

**Başarı ölçütleri:**
- Kapsamdaki her dersin her konusu uygulamada açılabiliyor ve internet olmadan okunabiliyor.
- Uygulamada gösterilen her kanun maddesi resmî metinle doğrulanmış. Gösterilen her karar künyesi resmî kaynaktan gelmiş ve linkli.
- Öğrenci herhangi bir kapsamda (ders, ünite, konu, karışık, zayıf konular) quiz çözebiliyor. Eksik analizi, konu bazında ustalık puanı ve somut öneriler gösteriyor.
- 10 sayfalık bir nottan 2 dakikadan kısa sürede özet ve test üretiliyor.
- Asistan her cevabında kaynak gösteriyor, kaynağa ulaşamadığında bunu açıkça söylüyor.

## 2. Kapsam

**Dersler (Marmara 2023 müfredatı, zorunlu dersler, düzenlenebilir):**

| 2. sınıf | 3. sınıf |
|---|---|
| HUK2011 Borçlar Hukuku Genel Hükümler | HUK3011 Eşya Hukuku |
| HUK2013 Ceza Hukuku Genel Hükümler | HUK3012 Borçlar Hukuku Özel Hükümler |
| HUK2009 İdare Hukuku | HUK3013 Ticaret Hukuku |
| HUK2017 Devletler Umumi Hukuku | HUK3015 Ceza Hukuku Özel Hükümler |
| HUK2012 Türk Hukuk Tarihi | HUK3017 Medeni Usul Hukuku |
| HUK2015 Genel Kamu Hukuku | HUK3014 İş Hukuku |
| HUK2003 Deniz Hukuku | HUK3016 İnsan Hakları Hukuku |

Kaynak: https://meobs.marmara.edu.tr/ProgramTanitim/hukuk-fakultesi/hukuk-fakultesi-1072-789-0

Toplam 14 ders. Tahmini 250-350 konu. Seçimlik dersler kapsam dışı. Öğrenci isterse sonradan eklenebilir.

**Kapsam dışı (bilerek bırakıldı):** Çoklu kullanıcı, ödeme ve abonelik, iPhone, Play Store'da yayın, sınav takvimi ve çalışma planı, bildirimler.

## 3. Mimari

```
┌──────────────────────┐  HTTPS (hukuk.arxdigitalsevice.com)
│ Android uygulaması   │──────────────┐
│ React Native + Expo  │              ▼
│ - yerel önbellek     │   ┌─────────────────────────────────────┐
│   (expo-sqlite)      │   │ Plesk VPS — nginx (Plesk subdomain) │
└──────────────────────┘   └──────────────┬──────────────────────┘
                                          ▼  127.0.0.1:<port>
                  ┌─────────────── Docker Compose (hukuk) ───────────────┐
                  │ api: Python FastAPI                                  │
                  │  - tüm uç noktalar (bilgi bankası, ilerleme, AI)     │
                  │  - Claude API çağrıları                              │
                  │  - MCP istemcisi (stdio): mevzuat + içtihat MCP      │
                  │  - tek kullanıcılı giriş (şifre → JWT)               │
                  │ db: Postgres 17   │ volume: hukuk_uploads (notlar)    │
                  └──────────────────────────────────────────────────────┘
                                          ▲
                  ┌───────────────────────┴──────────────────────────────┐
                  │ İçerik üretim hattı (pipeline/, geliştirme makinesinde│
                  │ çalışır; beceri kütüphanesi + MCP'ler; çıktıyı        │
                  │ Postgres'e yazar, sonra sunucuya taşınır)             │
                  └──────────────────────────────────────────────────────┘
```

**Parçalar ve sorumlulukları:**

1. **İçerik üretim hattı** (`pipeline/`): Bilgi bankasını üretir, doğrular ve Postgres'e yazar. Geliştirme bilgisayarında, yerel Docker Postgres'e karşı çalışır. Kaldığı yerden devam edebilir (resumable). Aynı konu ikinci kez çalıştırılırsa üzerine yazar (idempotent). Sonuç, `pg_dump` ile bilgi bankası tabloları olarak sunucuya aktarılır. Öğrenci verisi tablolarına dokunulmaz.
2. **Postgres 17** (Docker, `db` servisi): Tek doğruluk kaynağı. Bilgi bankası, öğrenci ilerlemesi, sohbet geçmişi ve API kullanım kayıtları burada durur. Dışarıya port açılmaz. Yerel geliştirmede, makinedeki diğer projelerle çakışmayacak bir host portuna bağlanır.
3. **Python sunucusu** (`server/`, Docker `api` servisi, FastAPI): Uygulamanın konuştuğu tek arka uç. Bilgi bankasını sunar, ilerlemeyi kaydeder ve yapay zekâ gerektiren tüm canlı işlemleri yapar. Claude API anahtarı yalnızca buradaki `.env` dosyasında durur. Yüklenen notlar `hukuk_uploads` volume'ünde saklanır.
4. **Android uygulaması** (`app/`): React Native + Expo (arx-panel'deki mobil uygulamayla aynı Expo sürüm ailesi). Bilgi bankasını expo-sqlite ile telefonda saklar. Çevrimdışıyken yapılan işlemleri internet gelince eşitler. Mevcut Expo hesabıyla EAS Build `preview` profili kullanılarak APK üretilir ve telefona doğrudan yüklenir.

**Barındırma:** Mevcut Plesk VPS'teki (arx-panel'in çalıştığı sunucu) ayrı bir Docker Compose yığını, `/opt/hukuk` altında. Plesk'te `hukuk.arxdigitalsevice.com` subdomain'i açılır, Let's Encrypt sertifikası alınır. nginx yönlendirmesi, Plesk'in "Additional nginx directives" alanıyla `api` servisinin yalnızca `127.0.0.1`'e bağlı portuna yapılır. Deploy, arx-panel'deki yöntemle yapılır: git bundle → scp → `docker compose up -d --build`. Diğer yığınlara (arx-panel, ads-panel) dokunulmaz. Port seçimi deploy öncesinde sunucudaki kullanılan portlar kontrol edilerek yapılır. Ek barındırma maliyeti yok.

**Giriş:** Tek kullanıcı. Şifre, sunucu `.env`'inde bcrypt özeti olarak durur. Giriş başarılı olunca uzun ömürlü bir JWT döner, telefonda expo-secure-store'da saklanır. Giriş ucunda deneme sınırı vardır (dakikada 5).

**Yedekleme:** Her gece `pg_dump` ve uploads arşivi alınır, arx-panel'deki `ops/backup.sh` deseniyle. Geri yükleme bir kez denenir.

**MCP entegrasyonu:** Sunucu ve içerik hattı, iki MCP sunucusunu resmî MCP Python SDK'sının istemcisiyle stdio üzerinden başlatır (`uvx --from turk-hukuku-mevzuat-mcp turk-hukuku-mevzuat`, `uvx --from turk-hukuku-ictihat-mcp turk-hukuku-ictihat`). Bu araçlar Claude API'ye istemci tarafı araç (tool) olarak tanıtılır, Claude'un çağrıları sunucu tarafından MCP'ye iletilir.
- Mevzuat MCP araçları: `mevzuat_ara`, `madde_getir`, `kanun_metni_getir`, `bilinen_kanunlar`.
- İçtihat MCP araçları: `ictihat_ara`, `karar_getir`.

**Web araması:** Asistanın güncel değişiklikler (Resmî Gazete, yeni kanunlar) için kullandığı web araması Claude API'nin sunucu tarafı web arama aracıyla yapılır.

**Beceri kütüphanesi:** `aydincan/turk-hukuku-ve-claude` deposu `vendor/` altına alınır (lisansı Apache-2.0 veya MIT, atıf korunur). `pipeline/skill_map.yaml`, her dersi ilgili eklenti ve becerilere eşler. Örneğin Borçlar Genel → borçlar hukuku eklentisinin becerileri. Bu eşleme, yapım adımı 1'de depo incelenerek oluşturulur. Eşleşen beceri bulunmayan dersler için temel metodoloji ve atıf becerileri kullanılır. Beceri metinleri, model çağrılarında sistem talimatı olarak eklenir ve prompt önbelleğine alınır.

**Yapay zekâ sağlayıcısı:** Anthropic Claude API (resmî `anthropic` Python SDK'sı). API anahtarı console.anthropic.com'dan alınır ve claude.ai aboneliğinden ayrı, kullandıkça ödenir.

**Model kullanımı (fiyat/performans karması):** Kural basit. Hatanın pahalı olduğu ve az sayıda yapılan işler en güçlü modelde, sık yapılan işler orta modelde, mekanik işler en ucuz modelde çalışır.

| İş | Model | Gerekçe |
|---|---|---|
| Bilgi bankası üretimi ve doğrulama | Claude Opus 5.5 (`claude-opus-5-5`) | Bir kerelik iş, kalıcı içerik. Hata pahalı. Mümkün olan adımlar Batch API ile %50 indirimli çalışır. |
| Olay cevabı puanlama | Claude Opus 5.5 | Az sayıda yapılır, hukuki akıl yürütme ister. |
| Canlı asistan | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | En sık kullanılan özellik. Hızlı, araç kullanımında (MCP, web araması) güçlü. |
| Asistanda "Daha derin cevap" düğmesi | Claude Opus 5.5 | Öğrenci istediğinde aynı soruyu Opus yeniden cevaplar. Pahalı model yalnızca gerektiğinde çalışır. |
| Not özetleme ve çelişki tespiti | Claude Sonnet 5.5 | Uzun metin, orta zorluk. |
| Nottan kart/soru üretme, konu eşleştirme, sohbet başlığı | Claude Haiku 5.5 (`claude-haiku-5-5`) | Mekanik, yüksek hacimli işler. Maliyeti Opus'un yaklaşık 40'ta biri. |

**Maliyet kontrolleri:**
- Beceri metinleri ve sabit sistem talimatları prompt önbelleğine alınır. Önbellekten okunan girdi, normal girdi ücretinin onda biri kadardır.
- Anthropic Console'da aylık harcama limiti tanımlanır (öneri: 50$).
- Asistan sohbeti uzadığında (yaklaşık 20 mesaj) uygulama yeni sohbet açmayı önerir, çünkü her mesajda tüm geçmiş yeniden gönderilir.
- Sunucu her çağrının token kullanımını `api_usage(id, feature, model, input_tokens, output_tokens, cache_read_tokens, cost_usd, created_at)` tablosuna yazar. Uygulamanın ayarlar ekranı bu ayın harcamasını gösterir.

**Arama:** Asistanın bilgi bankası ve notlarda yaptığı arama, v1'de Postgres tam metin araması (`turkish` dil yapılandırması) ile yapılır. Tek kullanıcı ve yaklaşık 300 konu için bu yeterli. Arama kalitesi yetersiz kalırsa pgvector ile vektör aramaya geçilir. Bu, Bölüm 1'deki ilk öneriden bilinçli bir sadeleştirmedir.

## 4. Veri modeli (Postgres 17)

**Bilgi bankası (içerik hattı yazar, uygulama okur):**
- `courses(id, name, year, sort_order, is_active)`
- `units(id, course_id, title, sort_order)`
- `topics(id, unit_id, title, sort_order, summary_md, content_md, critical_md, doctrine_md, glossary jsonb, generated_at, model, skill_refs text[], verification_status ['verified'|'partial'|'failed'], search_tsv tsvector)`
- `topic_articles(id, topic_id, law_name, law_no, article_no, official_text, source_url, fetched_at, verified bool)`
- `topic_cases(id, topic_id, court, chamber, esas_no, karar_no, decision_date, summary_md, source_url, verified bool)`
- `questions(id, topic_id, kind ['mcq'|'case'], stem_md, options jsonb, correct_option, explanation_md, rubric jsonb, model_answer_md, origin ['bank'|'note'], note_id null)`
- `flashcards(id, topic_id, front_md, back_md, origin ['bank'|'note'], note_id null)`
- `comparison_tables(id, course_id, title, columns jsonb, rows jsonb, related_topic_ids uuid[])`

**Öğrenci verisi (tek kullanıcı. Veritabanına yalnızca `api` servisi erişir):**
- `attempts(id, question_id, kind, selected_option, answer_text, correct bool, score int, feedback jsonb, created_at)`
- `card_states(card_id, ease float, interval_days int, repetitions int, due_at, last_grade)`
- `card_reviews(id, card_id, grade ['again'|'hard'|'good'|'easy'], reviewed_at)`
- `topic_mastery(topic_id, score int, data_points int, updated_at)`: ilerleme kayıtlarından türetilir
- `notes(id, course_id, title, storage_path, extracted_text, summary_md, status ['processing'|'ready'|'failed'], error, created_at)`
- `note_topics(note_id, topic_id, confidence float)`
- `chat_threads(id, title, topic_id null, created_at)`
- `chat_messages(id, thread_id, role, content_md, sources jsonb, created_at)`

## 5. İçerik üretim hattı

Her adım ayrı çalıştırılabilir ve sonucunu kaydeder.

1. **Müfredat çıkarımı:** Her ders için ilgili beceriler ve model ile ünite → konu → alt başlık ağacı üretilir. Sonuç `pipeline/curriculum/<ders>.yaml` dosyasına yazılır. Dosya insan tarafından gözden geçirilebilir, onaydan sonra veritabanına yüklenir.
2. **Konu üretimi:** Her konu için Opus 5.5 çağrılır. Talimata ilgili becerilerin metni eklenir, Mevzuat MCP araçları açıktır. Çıktı katı bir JSON şemasında üretilir: özet, anlatım, sınav kritik, doktrin, sözlük, madde referansları, 20-30 çoktan seçmeli soru, 2-5 olay sorusu (puanlama ölçütü ve örnek çözümüyle), 15-25 kart.
3. **İçtihat toplama:** İçtihat MCP ile konuya ilişkin önemli kararlar aranır. Karar künyesi **yalnızca araç sonucundan** alınır. Karar özeti, `karar_getir` ile alınan tam metinden çıkarılır.
4. **Doğrulama:** Her madde referansı için `madde_getir` çağrılır. Resmî metin `topic_articles.official_text` alanına yazılır, anlatımdaki ifade bununla karşılaştırılır. Uyuşmayan veya bulunamayan referans anlatımdan çıkarılır ya da "doğrulanamadı" diye işaretlenir. Konunun durumu `verification_status` alanına yazılır.
5. **Karşılaştırma tabloları:** Ders başına sık karıştırılan kavram çiftleri ve üçlüleri için tablolar üretilir.
6. **Yükleme:** Sonuçlar yerel Postgres'e yazılır ve arama indeksi güncellenir. Sonra bilgi bankası tabloları sunucuya aktarılır (bkz. Bölüm 3, parça 1).

**İçerik kuralları:**
- Doktrin görüşleri belirli bir yazarın adına yazılmaz. "Baskın görüş", "bir görüşe göre" gibi ifadeler kullanılır.
- Ders kitaplarından metin kopyalanmaz. İçerik kanun metni, karar metni ve modelin kendi anlatımıyla üretilir.
- Her konunun üretim tarihi ve kullanılan model kaydedilir. Kanun değişikliğinde konu tek komutla yeniden üretilebilir.

**Pilot:** Önce yalnızca **Borçlar Hukuku Genel Hükümler** üretilir. Gerçek API maliyeti ölçülür. Öğrenci 10 konuyu okuyup hataları işaretler. Kabul koşulu: tüm madde referansları doğrulanmış olmalı ve öğrencinin işaretlediği içerik hatası konu başına ortalama 1'den az olmalı. Kabul edilmeden diğer derslere geçilmez.

**Maliyet tahmini (kaba):** 14 dersin tamamı için bir kerelik yaklaşık 100-180$. Batch API kullanılan adımlarla bu yaklaşık 50-90$'a iner. Aylık işletme maliyeti, karma model düzeniyle ve kullanım yoğunluğuna göre: hafif kullanımda yaklaşık 10$, normal kullanımda yaklaşık 30$, yoğun kullanımda (sınav dönemi) yaklaşık 75$. Tümü Opus 5.5 olsaydı aynı senaryolar yaklaşık 18$ / 50$ / 135$ olurdu. Sunucu mevcut VPS'te çalıştığı için ek barındırma maliyeti yok. Konu okuma, quiz ve kartlar API çağrısı yapmaz. Maliyetin büyük kısmı asistandan gelir. Kesin rakamlar pilottan ve ilk ayın `api_usage` kayıtlarından sonra güncellenecek.

## 6. Uygulama ekranları ve akışlar

**Alt menü:** Ana Sayfa · Dersler · Çalış · Notlarım · Asistan

- **Ana Sayfa:** Bugün tekrar edilecek kart sayısı, en zayıf 5 konu ("şuna çalış"), kaldığın yerden devam et.
- **Dersler:** Ders listesi (ekleme, çıkarma, düzenleme) → ünite/konu ağacı (her konunun yanında ustalık yüzdesi) → konu sayfası. Konu sayfasında şu sekmeler bulunur: Özet, Anlatım, Kritik, Maddeler, Kararlar, Sözlük. Altta "Bu konudan quiz çöz" ve "Asistana sor" düğmeleri olur.
- **Çalış:**
  - **Quiz:** Kapsam seçilir (ders, ünite, konu, karışık, zayıf konularım) ve soru sayısı belirlenir. Her cevaptan sonra doğru şık, açıklama ve ilgili madde gösterilir. Çevrimdışı çalışır.
  - **Olay çözme:** Olay gösterilir, öğrenci cevabını yazar (veya Android'in sesle yazma özelliğini kullanır). Sunucu, Opus 5.5 ile cevabı puanlama ölçütüne göre puanlar. Sonuçta 0-100 puan, doğru tespitler, atlanan maddeler, eksik tartışmalar ve örnek çözüm gösterilir. İnternet gerekir.
  - **Kartlar:** SM-2 algoritmasıyla zamanlanır. Değerlendirme seçenekleri: bilemedim, zorlandım, bildim, çok kolay. Çevrimdışı çalışır.
  - **Karşılaştırma tabloları:** Ders bazında listelenir.
  - **Eksik analizi:** Ders bazında konu renk haritası, en zayıf konular ve hata kalıplarından üretilen somut tespitler (örn. "kast–taksir ayrımında 4 sorunun 3'ünü yanlış yaptın").
- **Notlarım:** PDF veya fotoğraf yüklenir, ders seçilir. Sunucu metni çıkarır (PDF metni yoksa ya da dosya fotoğrafsa Claude'un görsel okumasıyla). Ardından özet üretir, notu bilgi bankasındaki konulara eşler, çoktan seçmeli soru ve kart üretir, bilgi bankasıyla çelişen ifadeleri uyarı olarak işaretler. Nottan üretilen sorular ve kartlar `origin='note'` olarak normal quiz ve kart akışına katılır.
- **Asistan:** Sohbet ekranı. Sırayla şu kaynaklara başvurur: (1) bilgi bankası ve öğrencinin notları (tam metin arama), (2) Mevzuat MCP, (3) İçtihat MCP, (4) web araması. Cevabın altında kaynak etiketleri gösterilir: 📘 Bilgi bankası, ⚖️ Madde, 🏛️ Karar, 🌐 Web; her etiket linklidir. Hızlı düğmeler: "Daha basit anlat", "Bundan 3 soru sor", "Daha derin cevap" (aynı soruyu Opus 5.5 ile yeniden cevaplar). Asistan bir konu sayfasından açılırsa o konuyu bağlam olarak alır.
- **Uyarı ekranı:** İlk açılışta ve asistan ekranında, içeriğin hukuki danışmanlık olmadığını ve resmî kaynaktan teyit edilmesi gerektiğini belirten kısa bir not gösterilir.

## 7. Hesaplama kuralları

**Ustalık puanı (konu başına, 0-100):**
- Her veri noktasının değeri:
  - Çoktan seçmeli: doğru = 100, yanlış = 0
  - Olay: alınan puan (0-100)
  - Kart: bilemedim = 0, zorlandım = 60, bildim = 85, çok kolay = 100
- Ağırlıklar: çoktan seçmeli 1, olay 2, kart 0,5. Zaman ağırlığı 14 günlük yarı ömürle azalır (`0.5^(gün/14)`).
- Puan, ağırlıklı ortalamadır. 3'ten az veri noktası olan konu "yetersiz veri" olarak gösterilir ve zayıf konu sıralamasına girmez.
- Ders puanı, konu puanlarının ortalamasıdır (yalnızca yeterli verisi olan konular).

**Kart zamanlaması:** Standart SM-2.
- Başlangıç kolaylık katsayısı 2,5, en düşük değeri 1,3.
- "Bilemedim" seçilirse tekrar sayısı sıfırlanır ve kart 1 gün sonra gelir.

## 8. Hata durumları

| Durum | Davranış |
|---|---|
| MCP captcha / 403 / 429 / zaman aşımı | Asistan: "Resmî kaynağa şu an ulaşılamıyor" der, bilgi bankasındaki metni üretim tarihiyle gösterir, madde veya karar uydurmaz. İçerik hattı: konu `partial` işaretlenir, sonra yeniden denenir. |
| Uygulama çevrimdışı | Konu okuma, çoktan seçmeli quiz ve kartlar çalışır. Sonuçlar yerelde tutulur, bağlantı gelince sunucuya gönderilir. Asistan, olay puanlama ve not yükleme "internet gerekli" mesajı gösterir. |
| Aylık harcama limitine ulaşıldı | Yapay zekâ gerektiren özellikler "Bu ayın API limiti doldu" mesajı gösterir. Bilgi bankası, quiz ve kartlar çalışmaya devam eder. |
| Claude API hatası / aşırı yük | Artan bekleme süreleriyle en fazla 3 kez tekrar denenir. Başarısız olursa anlaşılır bir hata mesajı gösterilir. Olay cevabı ve sohbet mesajı yerelde saklanır, kaybolmaz. |
| Okunamayan not sayfası | `notes.status='failed'` olur ve okunamayan sayfa belirtilir. Kullanıcıdan yeniden yüklemesi istenir. |
| Çok büyük dosya | 20 MB ve 50 sayfa üstü reddedilir, bölmesi önerilir. |
| Model geçersiz JSON üretirse (içerik hattı) | Şema doğrulaması başarısız olur. Konu en fazla 2 kez yeniden üretilir, sonra `failed` işaretlenip rapora yazılır. |

## 9. Test

- **Sunucu (pytest):** Ustalık puanı hesaplaması, SM-2 zamanlaması, quiz kapsam filtreleri, olay puanlama yanıtının şema doğrulaması, MCP hatalarında asistanın uydurmadan "ulaşılamıyor" davranışı (MCP taklit edilerek).
- **İçerik hattı:** Her konu çıktısının JSON şema doğrulaması. Madde referanslarının resmî metinle otomatik karşılaştırması. Hattın sonunda üretilen, ders bazında doğrulama oranlarını gösteren rapor.
- **Uygulama:** Çevrimdışı eşitleme mantığı ve ustalık hesabı için birim testleri. Ana akışların (konu açma, quiz çözme, kart tekrarı) gerçek cihazda veya emülatörde elle denenmesi.
- **İnsan kontrolü:** Bölüm 5'teki pilot kabul koşulu.

## 10. Yapım sırası

1. **Altyapı:** Docker Compose (Postgres 17 + FastAPI), veritabanı şeması, tek kullanıcılı giriş, MCP istemci bağlantıları, beceri deposunun alınması ve `skill_map.yaml`.
2. **İçerik hattı ve pilot:** Borçlar Genel'in üretilmesi, maliyet ölçümü, öğrenci incelemesi.
3. **Uygulama çekirdeği:** Dersler, konu sayfası, çevrimdışı önbellek, quiz, eksik analizi.
4. Kartlar, karşılaştırma tabloları, olay çözme.
5. Notlarım.
6. Asistan.
7. Kalan 13 dersin üretimi (3-6. adımlarla paralel ilerleyebilir).
8. Sunucuya deploy (Plesk'te `hukuk` subdomain'i, nginx, yedekleme), APK oluşturma ve telefona kurulum.

## 11. Riskler

- **Yanlış hukuki bilgi:** Doğrulama adımı, yalnızca araçtan gelen künyeler, yazar adı vermeme kuralı ve pilot insan kontrolüyle azaltılır. Tamamen ortadan kalkmaz, uyarı ekranı bunu belirtir.
- **MCP projelerinin yeniliği:** Polatkan'ın MCP'leri yeni ve az kullanılmış. Çalışmazlarsa yedek olarak Said Sürücü'nün `yargi-mcp` ve `mevzuat-mcp` sunucuları kullanılabilir. Sunucudaki MCP katmanı tek bir arayüzün arkasında durduğundan değişim yalnızca o katmanı etkiler.
- **Resmî sitelerin yapısının değişmesi:** MCP'ler bozulabilir. Bilgi bankası zaten saklanmış olduğundan uygulama çalışmaya devam eder, yalnızca canlı arama etkilenir.
- **Paylaşılan VPS:** Sunucu, müşteri sistemlerinin (arx-panel, ads-panel) çalıştığı makinede. Hukuk yığınına bellek sınırı konur (`api` için 512 MB, `db` için 512 MB). Deploy öncesinde disk ve bellek kontrol edilir. Ayrı Compose projesi ve ayrı volume'ler sayesinde diğer yığınlarla veri paylaşımı olmaz.
- **Müfredat tahmini:** Gerçek ders içerikleri standart müfredattan farklı olabilir. Ders düzenleme özelliği ve tek ders için yeniden üretim komutu bunu karşılar.
