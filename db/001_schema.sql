-- hukuk — şema. Tekrar çalıştırılabilir (create ... if not exists).
-- Kimlik kuralları:
--   courses.id   = ders kodu            (HUK2011)
--   units.id     = <ders>-u<nn>         (HUK2011-u01)
--   topics.id    = <ders>-<slug>        (HUK2011-sozlesmenin-kurulmasi)
--   questions.id = <konu>-q<nn> (çoktan seçmeli), <konu>-o<nn> (olay), note-<uuid>-q<nn>
--   flashcards.id= <konu>-k<nn>, note-<uuid>-k<nn>
-- Bilgi bankası yeniden üretildiğinde kimlikler sıra numarasından türediği için
-- sabit kalır; öğrencinin ilerlemesi kaybolmaz.

-- ── bilgi bankası ─────────────────────────────────────────────────────
create table if not exists courses (
  id          text primary key,
  code        text not null,
  name        text not null,
  year        int  not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

create table if not exists units (
  id          text primary key,
  course_id   text not null references courses(id) on delete cascade,
  title       text not null,
  sort_order  int  not null default 0
);

create table if not exists topics (
  id                  text primary key,
  unit_id             text not null references units(id) on delete cascade,
  course_id           text not null references courses(id) on delete cascade,
  title               text not null,
  sort_order          int  not null default 0,
  summary_md          text not null default '',
  content_md          text not null default '',
  critical_md         text not null default '',
  doctrine_md         text not null default '',
  glossary            jsonb not null default '[]',
  generated_at        timestamptz,
  model               text,
  skill_refs          text[] not null default '{}',
  verification_status text not null default 'partial'
                      check (verification_status in ('verified','partial','failed')),
  verification_notes  jsonb not null default '[]',
  search_tsv          tsvector generated always as (
                        to_tsvector('turkish',
                          coalesce(title,'') || ' ' || coalesce(summary_md,'') || ' ' ||
                          coalesce(content_md,'') || ' ' || coalesce(critical_md,''))
                      ) stored
);
create index if not exists topics_search_idx on topics using gin (search_tsv);
create index if not exists topics_unit_idx on topics (unit_id);

create table if not exists topic_articles (
  id             bigserial primary key,
  topic_id       text not null references topics(id) on delete cascade,
  sort_order     int  not null default 0,
  law_name       text not null,
  law_no         text,
  article_no     text not null,
  official_text  text,
  source_url     text,
  fetched_at     timestamptz,
  verified       boolean not null default false
);
create index if not exists topic_articles_topic_idx on topic_articles (topic_id);

create table if not exists topic_cases (
  id             bigserial primary key,
  topic_id       text not null references topics(id) on delete cascade,
  sort_order     int  not null default 0,
  court          text not null,
  chamber        text,
  esas_no        text,
  karar_no       text,
  decision_date  text,
  summary_md     text not null default '',
  source_url     text,
  verified       boolean not null default false
);
create index if not exists topic_cases_topic_idx on topic_cases (topic_id);

-- ── notlar (sorular/kartlar notlara bağlanabildiği için önce) ─────────
create table if not exists notes (
  id              uuid primary key,
  course_id       text not null references courses(id) on delete cascade,
  title           text not null,
  file_path       text not null,
  mime            text not null,
  extracted_text  text,
  summary_md      text,
  contradictions  jsonb not null default '[]',
  status          text not null default 'processing'
                  check (status in ('processing','ready','failed')),
  error           text,
  created_at      timestamptz not null default now(),
  search_tsv      tsvector generated always as (
                    to_tsvector('turkish',
                      coalesce(title,'') || ' ' || coalesce(summary_md,'') || ' ' ||
                      coalesce(extracted_text,''))
                  ) stored
);
create index if not exists notes_search_idx on notes using gin (search_tsv);

create table if not exists note_topics (
  note_id     uuid not null references notes(id) on delete cascade,
  topic_id    text not null references topics(id) on delete cascade,
  confidence  real not null default 0,
  primary key (note_id, topic_id)
);

create table if not exists questions (
  id               text primary key,
  topic_id         text references topics(id) on delete cascade,
  course_id        text not null references courses(id) on delete cascade,
  sort_order       int  not null default 0,
  kind             text not null check (kind in ('mcq','case')),
  stem_md          text not null,
  options          jsonb,
  correct_option   int,
  explanation_md   text,
  rubric           jsonb,
  model_answer_md  text,
  origin           text not null default 'bank' check (origin in ('bank','note')),
  note_id          uuid references notes(id) on delete cascade
);
create index if not exists questions_topic_idx on questions (topic_id);

create table if not exists flashcards (
  id          text primary key,
  topic_id    text references topics(id) on delete cascade,
  course_id   text not null references courses(id) on delete cascade,
  sort_order  int  not null default 0,
  front_md    text not null,
  back_md     text not null,
  origin      text not null default 'bank' check (origin in ('bank','note')),
  note_id     uuid references notes(id) on delete cascade
);
create index if not exists flashcards_topic_idx on flashcards (topic_id);

create table if not exists comparison_tables (
  id                 text primary key,
  course_id          text not null references courses(id) on delete cascade,
  sort_order         int  not null default 0,
  title              text not null,
  columns            jsonb not null,
  rows               jsonb not null,
  related_topic_ids  text[] not null default '{}'
);

create table if not exists kb_meta (
  key    text primary key,
  value  text not null
);
insert into kb_meta (key, value) values ('kb_version', '0') on conflict do nothing;

-- ── öğrenci ilerlemesi (istemci UUID'leri; çift gönderim zararsız) ───
-- Soru/kart silinse bile geçmiş kalsın diye yabancı anahtar yok.
create table if not exists attempts (
  id               uuid primary key,
  question_id      text not null,
  kind             text not null check (kind in ('mcq','case')),
  selected_option  int,
  answer_text      text,
  correct          boolean,
  score            int,
  feedback         jsonb,
  created_at       timestamptz not null
);
create index if not exists attempts_question_idx on attempts (question_id);

create table if not exists card_reviews (
  id           uuid primary key,
  card_id      text not null,
  grade        text not null check (grade in ('again','hard','good','easy')),
  reviewed_at  timestamptz not null
);

create table if not exists card_states (
  card_id        text primary key,
  ease           real not null,
  interval_days  int  not null,
  repetitions    int  not null,
  due_at         timestamptz not null,
  last_grade     text,
  updated_at     timestamptz not null
);

-- ── asistan ───────────────────────────────────────────────────────────
create table if not exists chat_threads (
  id          uuid primary key,
  title       text not null default 'Yeni sohbet',
  topic_id    text references topics(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists chat_messages (
  id          uuid primary key,
  thread_id   uuid not null references chat_threads(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content_md  text not null,
  sources     jsonb not null default '[]',
  model       text,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on chat_messages (thread_id, created_at);

-- ── API kullanımı ve maliyet ──────────────────────────────────────────
create table if not exists api_usage (
  id                  bigserial primary key,
  feature             text not null,
  model               text not null,
  input_tokens        int  not null default 0,
  output_tokens       int  not null default 0,
  cache_read_tokens   int  not null default 0,
  cache_write_tokens  int  not null default 0,
  cost_usd            numeric(12,6) not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists api_usage_created_idx on api_usage (created_at);
