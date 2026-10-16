-- Öğrencinin konu notları ve vurguları. Tekrar çalıştırılabilir.
-- İstemci "son yazan kazanır" mantığıyla gönderir (updated_at); vurgu silme
-- deleted=true ile gelir ki başka cihazdaki eski kopya onu geri getirmesin.

create table if not exists topic_notes (
  topic_id    text primary key,
  body_md     text not null,
  updated_at  timestamptz not null
);

create table if not exists highlights (
  id          uuid primary key,
  topic_id    text not null,
  section     text not null,           -- summary | content | critical | doctrine
  block_hash  text not null,           -- paragraf metninin özeti; içerik değişirse vurgu düşer
  excerpt     text not null,           -- paragrafın ilk ~200 karakteri (liste ve arama için)
  deleted     boolean not null default false,
  updated_at  timestamptz not null
);
create index if not exists highlights_topic_idx on highlights (topic_id) where not deleted;
