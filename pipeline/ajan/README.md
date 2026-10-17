# Ajanlarla içerik üretimi

Bilgi bankası içeriği API harcamadan, Claude Code oturumunda yazılır. Ana oturum işi alt ajanlara dağıtır;
her konu dört adımdan geçer (kurulum 2026-10-18; kullanıcı kararı: araştırma Opus, yazma Sonnet):

| Adım | Ajan (model) | Görev metni | Çıktı |
|---|---|---|---|
| 1. Araştırma | Araştırmacı (`model: opus`) | `ARASTIRMACI.md` + ders notu `<DERS>.md` | `pipeline/kaynak/<DERS>/<slug>.md` |
| 2. Yazma | Yazar (`model: sonnet`) | `YAZAR.md` | `pipeline/taslak/<DERS>/<slug>.yaml` |
| 3. Denetim | Denetçi (`model: opus`) | `DENETCI.md` | taslakta düzeltmeler + rapor |
| 4. Bitirme | Ana oturum | — | `elle bitir`, defter, commit; sunucuya yükleme |

Aynı anda en çok 4-6 ajan çalıştır: mevzuat ve içtihat servisleri hız sınırı koyuyor.

## İstem kalıpları (ana oturum `Agent` aracına verir)

Araştırmacı:
> Önce görev tanımını oku ve harfiyen uygula: `pipeline/ajan/ARASTIRMACI.md` (`<DERS>` = HUK3011).
> Konu <no>: **<başlık>** (slug: `<slug>`). Paket: `pipeline/kaynak/HUK3011/<slug>.md`.
> Beceri: `vendor/turk-hukuku-ve-claude/<eklenti>/skills/<beceri>/SKILL.md`. Kapsam: `pipeline/ajan/HUK3011.md` içindeki
> "Ders geneli" ve <no>. konunun maddesi.

Yazar (araştırmacı bitince):
> Önce görev tanımını oku ve harfiyen uygula: `pipeline/ajan/YAZAR.md` (`<DERS>` = HUK3011).
> Konu <no>: **<başlık>** (slug: `<slug>`). Kaynak paketi: `pipeline/kaynak/HUK3011/<slug>.md`.
> Çıktı: `pipeline/taslak/HUK3011/<slug>.yaml`. `beceriler`: `<eklenti>/<beceri>`.

Denetçi (yazar bitince):
> Önce görev tanımını oku ve harfiyen uygula: `pipeline/ajan/DENETCI.md` (`<DERS>` = HUK3011, `<slug>` = <slug>).
> + yazarın raporundaki "emin olunamayan" noktalar madde madde.

Konu başlığı, slug ve beceri: `python -X utf8 -m pipeline.elle harita <DERS>` ve `pipeline/curriculum/<DERS>.yaml`.
Beceri dosyası bulunamazsa: `ls vendor/turk-hukuku-ve-claude/*/skills/<beceri>/SKILL.md`.

## Yardımcı komutlar

    python -X utf8 -m pipeline.elle harita <DERS>          # ünite ve konular, müfredat maddeleri
    python -X utf8 -m pipeline.elle kontrol <DERS> <slug>  # taslak denetimi
    python -X utf8 -m pipeline.elle ozet <DERS> <slug>     # sorular doğru şıkla, olayların sonucu
    python -X utf8 -m pipeline.elle bitir <DERS> <slug>    # ana oturum: pipeline/out/... yazar
    python -X utf8 -m pipeline.arastir degisiklik <DERS> --yil 2021   # yakın tarihli değişiklikler
    python -X utf8 -m pipeline.arastir tam TBK --ara "GEÇİCİ MADDE"   # tam metinde arama

Ders notları (`<DERS>.md`) ders geneli uyarıları (doğrulanmış yakın tarihli değişiklikler, özel kanunlar) ve her
konunun kapsamını tutar. Yeni bir doğrulanmış değişiklik ya da sık yapılan bir hata bulununca ilgili ders notuna eklenir.
Durum takibi: `pipeline/ICERIK_DEFTERI.md`. Buluttan devam: `BULUT.md`.
