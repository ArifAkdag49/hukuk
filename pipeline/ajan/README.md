# Ajanlarla içerik üretimi

Bilgi bankası içeriği API harcamadan, Claude Code oturumunda yazılır. Ana oturum işi alt ajanlara dağıtır;
her konu üç adımdan geçer:

1. **Yazar ajanı** (`YAZAR.md` + ders notu `<DERS>.md`): resmî madde metni, karar tam metni ve kaynak
   araştırmasıyla `pipeline/taslak/<DERS>/<slug>.yaml` taslağını yazar; `elle kontrol` temiz olmalı.
2. **Denetçi ajanı** (`DENETCI.md`): taslağı bağımsız olarak resmî metinle ve karar metniyle karşılaştırır;
   ispatlanabilen hataları düzeltir, şüpheli noktaları raporlar.
3. **Ana oturum**: denetçi raporunu okur, gerekirse kilit noktalara bakar, sonra
   `python -X utf8 -m pipeline.elle bitir <DERS> <slug>`, `python -X utf8 -m pipeline load <DERS>`,
   `pipeline/ICERIK_DEFTERI.md` satırı ve commit.

Yazar ajanına verilen istem: "Önce ortak kuralları oku ve harfiyen uygula: `pipeline/ajan/YAZAR.md`
(`<DERS>` = ...)" + konu adı, slug, çıktı yolu, beceri dosyası + ders notundaki kapsam maddesi.

Yardımcı komutlar:

    python -X utf8 -m pipeline.elle harita <DERS>          # ünite ve konular, müfredat maddeleri
    python -X utf8 -m pipeline.elle ozet <DERS> <slug>     # sorular doğru şıkla, olayların sonucu
    python -X utf8 -m pipeline.arastir tam TBK --ara "GEÇİCİ MADDE"   # tam metinde arama

Ders notları (`<DERS>.md`), ders geneli uyarıları (doğrulanmış yakın tarihli değişiklikler, özel kanunlar)
ve her konunun kapsamını tutar. Yeni bir doğrulanmış değişiklik ya da sık yapılan bir hata bulunduğunda
ilgili ders notuna ya da `YAZAR.md`'nin "Önceki konulardan çıkan dersler" bölümüne eklenir.
