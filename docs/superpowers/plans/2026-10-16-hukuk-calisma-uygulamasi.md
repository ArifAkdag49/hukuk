# Hukuk Çalışma Uygulaması — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tek bir Marmara Hukuk öğrencisi için çalışan bir sistem kurmak: bilgi bankası üreten içerik hattı, FastAPI sunucusu (bilgi bankası, ilerleme, notlar, olay puanlama, asistan) ve Android uygulaması (Expo).

**Architecture:** Docker Compose içinde Postgres 17 ve FastAPI. Sunucu Claude API'yi (resmî `anthropic` SDK) ve iki MCP sunucusunu (stdio) kullanır. İçerik hattı geliştirme makinesinde aynı veritabanına yazar. Expo uygulaması bilgi bankasını tek bir dışa aktarım ucundan indirip expo-sqlite'ta saklar. İlerleme yerelde tutulur ve senkronize edilir. Ustalık puanı ve SM-2 hesapları uygulamada (TypeScript) yapılır, böylece çevrimdışı da çalışır.

**Tech Stack:** Python 3.12, FastAPI, psycopg 3, anthropic (1.x), mcp, pydantic 2, pytest. Postgres 17. Expo SDK 57 (arx-panel mobil uygulamasıyla aynı aile), expo-router, expo-sqlite, expo-secure-store, expo-document-picker, expo-image-picker, jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-16-hukuk-calisma-uygulamasi-design.md`

## Global Constraints

- Model kimlikleri: `claude-opus-5-5` (içerik üretimi, doğrulama, olay puanlama, "Daha derin cevap"), `claude-sonnet-5-5` (asistan, not özeti), `claude-haiku-5-5` (nottan kart/soru, konu eşleştirme, sohbet başlığı). Tarih eki eklenmez.
- Opus 5.5'te `thinking` parametresi gönderilmez. Derinlik `output_config={"effort": ...}` ile ayarlanır. `budget_tokens` ve `tool_choice` `any`/`tool` kullanılmaz (400 döner).
- Fiyatlar (USD / 1M token): Opus 5.5 4 / 20 (önbellek okuma 0,20). Sonnet 5.5 2 / 10 (önbellek okuma 0,20). Haiku 5.5 0,10 / 0,50 (önbellek okuma 0,01). Önbellek yazma, girdi fiyatının 1,25 katı.
- Aylık AI harcama tavanı: `AI_MONTHLY_CAP_USD` (varsayılan 50). Aşılınca AI uçları HTTP 402 ve `{"detail": "Bu ayın API limiti doldu"}` döner.
- API anahtarı yalnızca `.env` dosyasında durur. Hiçbir zaman loglanmaz, koda ya da git'e girmez.
- Doktrin görüşleri yazar adıyla verilmez. Karar künyesi yalnızca İçtihat MCP sonucundan alınır. Madde metni yalnızca Mevzuat MCP'den alınır.
- Yerel portlar: Postgres `5446`, API `8810`. Sunucuda API yalnızca `127.0.0.1`'e bağlanır.
- Arayüz: açık tema, canlı renkler, büyük ve okunaklı yazı, Türkçe metinler, her derse ayırt edici bir renk.
- Bu gece kapsam dışı (kullanıcı onayı gerekir): VPS'e deploy, Plesk subdomain'i, 14 dersin tamamının üretimi. Yalnızca pilot ders (HUK2011 Borçlar Hukuku Genel Hükümler) üretilir.

## Review Focus

1. **Bozuk ya da çok büyük not dosyası:** 20 MB üstü dosya veya 50 sayfa üstü PDF yüklendiğinde, sunucu kayıt oluşturmadan 413 dönmeli ve uygulama anlaşılır bir mesaj göstermeli. (Test: Task 7)
2. **MCP çökmesi veya engel (captcha/403/429):** Asistan madde ya da karar uydurmamalı, "resmî kaynağa ulaşılamıyor" demeli. Araç hatası `is_error` ile modele iletilmeli. (Test: Task 4)
3. **Çevrimdışı çözülen quiz, sonra senkronizasyon:** Aynı deneme iki kez gönderilirse çift kayıt olmamalı. Bunun için istemci UUID'leri ve `ON CONFLICT DO NOTHING` kullanılır. (Test: Task 3)
4. **Bilgi bankası yeniden üretilirse:** Soru ve kart kimlikleri sabit kalmalı (konu kimliği + sıra). Böylece eski ilerleme kaybolmaz. (Test: Task 5)
5. **Ay sınırı:** Harcama tavanı doluyken AI uçları 402 dönmeli. Okuma, quiz ve kartlar çalışmaya devam etmeli. (Test: Task 4)

---

## Dosya yapısı

```
Hukuk/
  .env                      # ANTHROPIC_API_KEY, APP_PASSWORD_HASH, JWT_SECRET, ...
  .env.example
  docker-compose.yml        # db (5446) + api (8810)
  db/001_schema.sql         # tüm tablolar (idempotent)
  server/
    Dockerfile
    requirements.txt
    app/
      main.py               # FastAPI uygulaması, lifespan (DB havuzu + MCP hub)
      config.py             # Settings (env)
      db.py                 # psycopg AsyncConnectionPool, yardımcılar
      auth.py               # şifre doğrulama, JWT, require_user bağımlılığı, deneme sınırı
      llm.py                # AsyncAnthropic sarmalayıcı: fiyat, api_usage kaydı, ay tavanı
      mcp_hub.py            # iki MCP stdio oturumu: call_tool(server, name, args) -> str
      search.py             # Postgres FTS: topics + notes
      routers/
        auth.py kb.py progress.py notes.py cases.py assistant.py usage.py
      services/
        notes_service.py    # metin çıkarma, özet, eşleme, soru/kart üretimi
        grading.py          # olay puanlama
        assistant_service.py# araç döngüsü, kaynak toplama
    tests/
      conftest.py           # test veritabanı (hukuk_test), istemci, sahte LLM/MCP
      test_auth.py test_kb.py test_progress.py test_llm.py test_notes.py test_cases.py test_assistant.py
  pipeline/
    __main__.py             # CLI: curriculum | generate | tables | load | status
    common.py               # DB, anthropic istemcisi, maliyet kaydı, MCP bağlantısı
    skills.py               # vendor'daki beceri metinlerini yükler
    models.py               # pydantic çıktı şemaları
    curriculum.py generate.py cases.py verify.py tables.py load.py
    skill_map.yaml
    curriculum/HUK2011.yaml
    out/HUK2011/<slug>.json # konu başına üretim çıktısı (devam edilebilirlik)
  vendor/turk-hukuku-ve-claude/   # git clone (lisans korunur)
  app/                      # Expo uygulaması
    app/(tabs)/index.tsx dersler.tsx calis.tsx notlar.tsx asistan.tsx
    app/ders/[id].tsx app/konu/[id].tsx app/quiz.tsx app/olay/[id].tsx
    app/kartlar.tsx app/tablolar.tsx app/analiz.tsx app/giris.tsx app/ayarlar.tsx
    src/theme.ts src/api.ts src/db.ts src/sync.ts src/mastery.ts src/sm2.ts
    src/components/*.tsx
    __tests__/mastery.test.ts sm2.test.ts
```

---

### Task 1: Altyapı — git, Docker Compose, şema

**Files:** Create: `docker-compose.yml`, `db/001_schema.sql`, `.env.example`, `.gitignore` (güncelle), `README.md`

**Interfaces:**
- Produces: veritabanı `hukuk` (kullanıcı `hukuk`), test veritabanı `hukuk_test`. Tablolar, spec Bölüm 4'teki gibi. Ek olarak: `topics.course_id`, `topics.verification_notes jsonb`, `questions.course_id`, `flashcards.course_id`, `notes.mime`, `notes.contradictions jsonb`, `kb_meta(key,value)`. `topic_mastery` tablosu yok, çünkü ustalık uygulamada hesaplanıyor.
- Kimlikler: `courses.id` = ders kodu (`HUK2011`). `units.id` = `HUK2011-u01`. `topics.id` = `HUK2011-<slug>`. `questions.id` = `<topic_id>-q01` / `-o01` (olay). `flashcards.id` = `<topic_id>-k01`. Nottan üretilenler için `note-<uuid>-q01`. İlerleme tabloları istemci UUID'si kullanır.

- [ ] **Step 1:** `git init`, mevcut `.gitignore`'a `pipeline/out/` hariç tutulmadan (üretim çıktısı commit edilir) `__pycache__/`, `.venv/`, `node_modules/`, `uploads/` ekle.
- [ ] **Step 2:** `docker-compose.yml`: `db` (postgres:17-alpine, `5446:5432`, volume `hukuk_pgdata`, `./db` → `/docker-entrypoint-initdb.d`, healthcheck) ve `api` (build `./server`, `127.0.0.1:8810:8000`, `env_file: .env`, volume `hukuk_uploads:/data/uploads`, bellek sınırı 512m, `depends_on` db healthy).
- [ ] **Step 3:** `db/001_schema.sql`'i yaz (tüm tablolar `create table if not exists`, `topics.search_tsv` için `to_tsvector('turkish', ...)` ile `generated always as ... stored` ve GIN indeks, `notes.search_tsv` aynı şekilde). Test veritabanı için `create database hukuk_test` ayrı bir init dosyasında (`db/000_test_db.sql`).
- [ ] **Step 4:** `docker compose up -d db` → `psql -c "\dt"` ile tabloların varlığını doğrula. `select to_tsvector('turkish','sözleşmeler')` sonucunda kök görülmeli.
- [ ] **Step 5:** Commit: `chore: altyapı, docker compose ve şema`

### Task 2: Sunucu çekirdeği — config, DB, giriş

**Files:** Create: `server/requirements.txt`, `server/Dockerfile`, `server/app/{main,config,db,auth}.py`, `server/app/routers/auth.py`, `server/tests/{conftest,test_auth}.py`

**Interfaces:**
- `config.Settings`: `database_url`, `anthropic_api_key`, `app_password_hash` (bcrypt), `jwt_secret`, `ai_monthly_cap_usd: float = 50`, `upload_dir = "/data/uploads"`, `mcp_enabled: bool = True`.
- `db.get_pool() -> AsyncConnectionPool`, `db.fetch_all(sql, params) -> list[dict]`, `db.fetch_one(...) -> dict | None`, `db.execute(...)`.
- `auth.require_user` (FastAPI bağımlılığı, `Authorization: Bearer`). `POST /auth/login {password}` → `{token}`. Yanlış şifrede 401. Aynı IP'den dakikada 5'ten fazla denemede 429.
- `GET /health` → `{"ok": true}` (kimlik doğrulama gerekmez).

- [ ] **Step 1:** Test: doğru şifre → 200 ve token. Yanlış şifre → 401. Token olmadan `/kb/version` → 401. 6. deneme → 429.
- [ ] **Step 2:** Testlerin başarısız olduğunu gör, uygula, geçtiğini gör.
- [ ] **Step 3:** `scripts/sifre_ozeti.py` ile şifre özeti üret. Rastgele bir uygulama şifresi oluştur, `.env`'e özetini ve `JWT_SECRET`'i yaz. Şifrenin düz hâlini `GIRIS_BILGISI.txt` dosyasına yaz (git dışında) ki kullanıcı görebilsin.
- [ ] **Step 4:** Commit.

### Task 3: Bilgi bankası ve ilerleme uçları

**Files:** Create: `server/app/routers/{kb,progress}.py`, `server/tests/{test_kb,test_progress}.py`

**Interfaces:**
- `GET /kb/version` → `{"version": str}` (`kb_meta.kb_version`, her yüklemede güncellenir).
- `GET /kb/export` → `{"version", "courses":[...], "units":[...], "topics":[{..., "articles":[...], "cases":[...]}], "questions":[...], "flashcards":[...], "tables":[...]}`. Tüm sütunlar camelCase değil, snake_case.
- `POST /kb/courses {code,name,year}`, `PATCH /kb/courses/{id} {name?, is_active?}`.
- `POST /progress/sync {"attempts":[Attempt], "card_reviews":[CardReview], "card_states":[CardState]}` → `{"ok": true, "server_time": iso}`. Attempt = `{id uuid, question_id, kind, selected_option?, answer_text?, correct?, score?, feedback?, created_at}`. Çift gönderim `on conflict (id) do nothing`. `card_states` için `on conflict (card_id) do update` (yalnızca `updated_at` daha yeniyse).
- `GET /progress/all` → `{"attempts", "card_reviews", "card_states"}` (yeniden kurulumda geri yükleme için).

- [ ] **Step 1:** Testler: export boş veritabanında boş listeler döner. Örnek kayıtlar eklenince ilişkiler doğru gelir. Aynı attempt iki kez sync edilirse 1 satır olur (Review Focus 3). Eski `updated_at`'li card_state yeniyi ezmez.
- [ ] **Step 2:** Uygula, testleri geçir, commit.

### Task 4: AI katmanı — LLM sarmalayıcı, maliyet, MCP hub

**Files:** Create: `server/app/llm.py`, `server/app/mcp_hub.py`, `server/app/routers/usage.py`, `server/tests/test_llm.py`

**Interfaces:**
- `llm.PRICES: dict[str, tuple[float,float,float]]` (girdi, çıktı, önbellek okuma, $/1M).
- `llm.cost_usd(model, usage) -> float` (`input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`).
- `async llm.ensure_budget() -> None`. Ay toplamı ≥ tavan ise `HTTPException(402)` fırlatır.
- `async llm.create(feature: str, **kwargs) -> Message`: `messages.create` çağırır, kullanımı `api_usage`'a yazar.
- `async llm.parse(feature, output_format: type[BaseModel], **kwargs) -> BaseModel`: `messages.parse` ile aynı işi yapar.
- `mcp_hub.McpHub`: `async start()`, `async stop()`, `async call(tool_name: str, args: dict) -> tuple[str, bool]` (metin, hata_mı). Araç adına göre doğru sunucuya yönlendirir. Hata ya da zaman aşımında (30 sn) `("Resmî kaynağa şu anda ulaşılamıyor: <neden>", True)` döner.
- `mcp_hub.ASSISTANT_TOOLS`: `mevzuat_ara`, `madde_getir`, `ictihat_ara`, `karar_getir` için Claude araç tanımları (şemalar MCP'nin `list_tools` çıktısından alınır).
- `GET /usage/month` → `{"month": "2026-10", "cost_usd": float, "cap_usd": float, "by_feature": {feature: cost}}`.

- [ ] **Step 1:** Testler: `cost_usd` Opus için 1M girdi + 1M çıktı = 24,0. Tavan doluyken `ensure_budget` 402 fırlatır (Review Focus 5). Sahte MCP oturumu istisna fırlatınca `call` hata metniyle `is_error=True` döner (Review Focus 2).
- [ ] **Step 2:** MCP paketlerini kur (`pip install turk-hukuku-mevzuat-mcp turk-hukuku-ictihat-mcp mcp`). Konsol betiklerinin adlarını ve araç şemalarını `list_tools` ile doğrula.
- [ ] **Step 3:** Uygula, testleri geçir. Gerçek bağlantı denemesi: `madde_getir("TBK","49")` sonuç döndürmeli. Commit.

### Task 5: İçerik hattı ve pilot ders (HUK2011)

**Files:** Create: `pipeline/*`, `pipeline/skill_map.yaml`, `vendor/turk-hukuku-ve-claude` (clone)

**Interfaces (pydantic, `pipeline/models.py`):**
- `Curriculum{units: list[Unit{title, topics: list[TopicPlan{slug, title, maddeler: list[MaddeRef{kanun, madde}], ictihat_sorgulari: list[str]}]}]}`
- `TopicContent{summary_md, content_md, critical_md, doctrine_md, glossary: list[Term{term, definition}]}`
- `TopicQuiz{mcq: list[Mcq{stem_md, options: list[str] (4 şık), correct_option: int (0-3), explanation_md, madde_ref: str}], cases: list[CaseQ{stem_md, rubric: list[RubricItem{point, weight, madde_ref}], model_answer_md}], cards: list[Card{front_md, back_md}]}`
- `CaseSummary{relevant: bool, summary_md}`; `Verification{status: "verified"|"partial"|"failed", issues: list[Issue{field, quote, problem}]}`
- `ComparisonTables{tables: list[Table{title, columns: list[str], rows: list[list[str]], related_slugs: list[str]}]}`

**Akış:**
1. `curriculum HUK2011`: ders için beceri metinleri (skill_map) ve kanun sistematiği verilerek Opus 5.5 (effort `high`) çağrılır. Sonuç `Curriculum` olarak `curriculum/HUK2011.yaml`'a yazılır.
2. `generate HUK2011`: her konu için (çıktı dosyası zaten varsa atlanır):
   a. `madde_getir` ile maddelerin resmî metni alınır. Alınamayan madde listeye "doğrulanamadı" diye düşülür.
   b. `TopicContent` üretilir (Opus, resmî madde metinleri istem içinde).
   c. `TopicQuiz` üretilir (Opus, 20-30 MCQ, 2-5 olay, 15-25 kart).
   d. `ictihat_ara` (her sorgu, `mahkeme="yargitay"`, `adet=5`) çalıştırılır. İlk 3 aday için `karar_getir` ile tam metin alınır, Opus `CaseSummary` üretir. Künye alanları yalnızca araç çıktısından alınır.
   e. `Verification` (Opus) çalışır: içerik resmî metinlerle karşılaştırılır.
   f. Sonuç `out/HUK2011/<slug>.json`'a yazılır.
3. `tables HUK2011`: karşılaştırma tabloları üretilir.
4. `load HUK2011`: JSON dosyaları veritabanına yazılır (upsert). Kimlikler sıra numarasından türetilir (Review Focus 4). `kb_meta.kb_version` güncellenir.

- [ ] **Step 1:** Beceri deposunu klonla, HUK2011 için ilgili becerileri bul, `skill_map.yaml` yaz.
- [ ] **Step 2:** `load` için test: aynı JSON iki kez yüklenirse kimlikler değişmez, satır sayısı aynı kalır.
- [ ] **Step 3:** Hattı yaz. Önce tek bir konuyla dene, maliyeti `api_usage`'dan oku.
- [ ] **Step 4:** Tüm HUK2011'i arka planda üret, `load` et, rapor (`status`) al: konu sayısı, doğrulama durumları, toplam maliyet.
- [ ] **Step 5:** Commit (curriculum, out/ JSON'ları, kod).

### Task 6: Olay puanlama ucu

**Files:** Create: `server/app/services/grading.py`, `server/app/routers/cases.py`, `server/tests/test_cases.py`

**Interfaces:**
- `POST /cases/grade {question_id, answer_text}` → `{"score": int, "correct_points": [str], "missed": [{"point": str, "madde_ref": str}], "missing_discussions": [str], "feedback_md": str, "model_answer_md": str}`. Opus 5.5 (effort `high`) ve `messages.parse` kullanır. Boş cevap → 422. Puanlama ölçütü sorudan gelir.
- [ ] Testler (sahte LLM): şema doğru dönüyor. Boş cevap 422. Bütçe doluysa 402. Uygula, commit.

### Task 7: Notlar

**Files:** Create: `server/app/services/notes_service.py`, `server/app/routers/notes.py`, `server/tests/test_notes.py`

**Interfaces:**
- `POST /notes` (multipart: `file`, `course_id`, `title`) → `{"id", "status": "processing"}`. 20 MB üstü veya 50 sayfa üstü → 413 (Review Focus 1). Desteklenen türler: PDF, JPEG, PNG, HEIC dışı görseller.
- Arka plan işi: PDF'te metin katmanı varsa `pypdf` ile metin çıkarılır. Yoksa ya da dosya görselse, sayfalar Claude'a doğrudan document/image olarak verilir. Sonra sırasıyla: Sonnet 5.5 ile özet ve çelişkiler (`NoteDigest{summary_md, contradictions: list[{quote, problem, suggestion}]}`), Haiku 5.5 ile konu eşleştirme (o dersin konu başlıklarıyla) ve soru/kart üretimi (`NoteQuiz{mcq, cards}`). Durum `ready` olur. Hata olursa `failed` ve hata mesajı yazılır.
- `GET /notes` (liste), `GET /notes/{id}` → not ile birlikte `questions`, `flashcards`, `topics`. `DELETE /notes/{id}`.
- [ ] Testler: 413 durumları, sahte LLM ile tam akış `ready` durumuna ulaşıyor ve sorular `note-<id>-q01` kimliğiyle kaydediliyor. Uygula, commit.

### Task 8: Asistan

**Files:** Create: `server/app/search.py`, `server/app/services/assistant_service.py`, `server/app/routers/assistant.py`, `server/tests/test_assistant.py`

**Interfaces:**
- `search.search_kb(query, limit=5) -> list[{"kind": "topic"|"note", "id", "title", "snippet"}]` (`websearch_to_tsquery('turkish', ...)`, `ts_headline`).
- Araçlar: `bilgi_bankasi_ara{sorgu}` (yerel), MCP araçları (Task 4) ve `{"type": "web_search_20260209", "name": "web_search", "max_uses": 3}`.
- `POST /assistant/threads {topic_id?}` → thread. `GET /assistant/threads`, `GET /assistant/threads/{id}/messages`.
- `POST /assistant/threads/{id}/messages {content, deep: bool}` → `{"message": {...role:"assistant", content_md, sources:[{"type":"kb"|"madde"|"karar"|"web","label","ref"}], model}}`. Model `deep ? opus : sonnet`. En fazla 8 tur araç döngüsü, `pause_turn` devam ettirilir. Sistem istemi: kaynaksız iddia yok, araç hatasında uydurma yok, Türkçe, öğrenci seviyesine uygun. İlk mesajdan sonra Haiku ile başlık atılır. Sohbet 20 mesajı geçince yanıta `"suggest_new_thread": true` eklenir.
- [ ] Testler (sahte LLM + sahte MCP): araç çağrısı yapılıp sonuç dönünce kaynak listesine `madde` eklenir. MCP hatası `is_error` olarak modele iletilir. `deep=true` olunca Opus seçilir. Uygula, commit.

### Task 9: Android uygulaması

**Files:** `app/` (yukarıdaki yapı)

**Interfaces:**
- `src/api.ts`: `login(password)`, `getKbVersion()`, `exportKb()`, `syncProgress(payload)`, `getAllProgress()`, `uploadNote(file, courseId, title)`, `listNotes()`, `getNote(id)`, `gradeCase(questionId, answer)`, `createThread(topicId?)`, `listThreads()`, `getMessages(id)`, `sendMessage(id, content, deep)`, `getUsage()`. Taban adres `EXPO_PUBLIC_API_URL`.
- `src/db.ts`: expo-sqlite şeması (sunucudaki KB tablolarının aynası + `local_attempts`, `local_card_states`, `local_card_reviews`, `sync_queue`).
- `src/sm2.ts`: `review(state: CardState | null, grade: 'again'|'hard'|'good'|'easy', now: Date): CardState` (spec Bölüm 7).
- `src/mastery.ts`: `topicMastery(points: DataPoint[], now: Date): {score: number|null, dataPoints: number}` (ağırlıklar ve 14 günlük yarı ömür, 3'ten az veri → `null`).
- Ekranlar spec Bölüm 6'daki gibi: Ana Sayfa, Dersler → Ders → Konu (sekmeler), Çalış (Quiz, Olay, Kartlar, Tablolar, Analiz), Notlarım, Asistan, Giriş, Ayarlar (bu ay harcama, senkronizasyon, ders düzenleme).
- Tasarım: açık zemin (#F7F8FC), beyaz kartlar, canlı ders renkleri (14 farklı ton), büyük başlıklar, yuvarlatılmış kartlar, net ikonlar, Türkçe metinler.
- [ ] **Step 1:** jest testleri: `sm2` (ilk "bildim" → 1 gün, ikinci → 6 gün, "bilemedim" sıfırlar, kolaylık katsayısı ≥ 1,3) ve `mastery` (yarı ömür, ağırlıklar, `null` eşiği).
- [ ] **Step 2:** İskelet, tema, giriş ve senkronizasyon.
- [ ] **Step 3:** Ekranlar. Her ekran, yerel sunucuya karşı web önizlemede veya emülatörde kontrol edilir.
- [ ] **Step 4:** Commit.

### Task 10: Uçtan uca doğrulama ve sabah özeti

- [ ] `docker compose up -d --build`. Giriş → export → pilot dersin konuları görünüyor.
- [ ] Gerçek API ile birer kez denenir: olay puanlama, bir test notu yükleme, asistana bir soru ve bir "daha derin" soru. Toplam maliyet raporlanır.
- [ ] Uygulama web önizlemede açılır, ekran görüntüleri alınır.
- [ ] `SABAH_OZETI.md`: ne hazır, ne denendi, ne kaldı (deploy, APK, kalan 13 ders), harcanan API tutarı, kullanıcıdan beklenen onaylar.
