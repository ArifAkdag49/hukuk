-- Asistana gönderilen fotoğraflar: dosyalar upload_dir/sohbet altında, burada kimlikleri tutulur.
alter table chat_messages add column if not exists images jsonb not null default '[]';
