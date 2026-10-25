-- Asistan sohbeti yüklenen bir ders notuna bağlanabilir: asistan o notun özetini ve metnini bağlam olarak alır.
alter table chat_threads add column if not exists note_id uuid references notes(id) on delete set null;
