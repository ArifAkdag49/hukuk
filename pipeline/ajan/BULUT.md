# Buluttan (Claude Code cloud) devam: yazma işi

Bilgi bankası içeriği Claude Code'da yazılır, API ücreti yoktur. Bu dosya bulut oturumunun nasıl devam edeceğini anlatır.
Ana düzen: `pipeline/ajan/README.md`. **Güncel durum için önce çalıştır:** `python -X utf8 -m pipeline.durum`.

## Kapsam ve kullanıcı kararları (2026-10-18/19)
- Kapsam: 3. sınıfın bütün dersleri (HUK3011, 3012, 3013, 3015, 3017, 3014, 3016) + HUK2009 İdare + HUK2017 Devletler Umumi.
  HUK2011 ve diğerleri kapsam dışı.
- **YENİ ARAŞTIRMA YAPILMAZ.** Yalnız araştırma paketi (`pipeline/kaynak/<DERS>/<slug>.md`) olan konular yazılır. Paketi olmayan
  konuya dokunma (ör. HUK3017, 3014, 3016, 2009, 2017 ve HUK3015'in kalan 12 konusu): kullanıcı araştırmayı ayrıca getirecek.
- **Yazar Sonnet** (`model: sonnet`), HAFİF MOD hedefleriyle (12 soru, 2 olay, 12 kart, 1500-2000 kelime). Ayrı Opus denetçi ve
  araştırmacı yok: token ve süre için kaldırıldı. Şüpheli bir nokta çıkarsa yalnız o nokta doğrulatılır.
- Bir yazar ajanına **art arda iki konu** ver (rehber ve kurallar bir kez okunur). Aynı anda **en çok 6-8 ajan**.

## Kurulum
    python -m venv .venv && . .venv/bin/activate        # bulutta yol: .venv/bin/python (görev metinlerindeki .venv/Scripts/python yerine)
    pip install -r server/requirements.txt pyyaml
Ortamın ağ erişimine şu adresler eklenmiş olmalı (Environment → Network access → Allowed domains):
`bedesten.adalet.gov.tr`, `mevzuat.adalet.gov.tr`, `www.mevzuat.gov.tr`, `emsal.uyap.gov.tr`, `karararama.danistay.gov.tr`,
`kararlarbilgibankasi.anayasa.gov.tr`, `www.resmigazete.gov.tr`. Dene:
    python -X utf8 -m pipeline.arastir madde TMK 683
    python -X utf8 -m pipeline.arastir ictihat "ecrimisil" --adet 2
(İçtihat MCP alt süreci proxy ayarlarını artık alıyor: `server/app/mcp_hub.py::_ictihat_env`. Yine de hata verirse nedenini raporla.)

Beceri kütüphanesi (`vendor/turk-hukuku-ve-claude`) git'te yok; `pipeline/ajan/README.md` ya da KURULUM notundaki komutla klonla,
yoksa YAML `beceriler` alanı için `pipeline.durum --siradaki` çıktısındaki `?/<beceri>` yerine ders notundaki eklenti adını kullan.
Yazarın kullandığı `elle kontrol` karar künyesini karar metninden okur: **yazmadan önce karar metinlerini önbelleğe al**
(`pipeline/cache` git'te yok). Her ders için bir kez:
    cat pipeline/kaynak/HUK3013/*.md pipeline/kaynak/HUK3015/*.md > /tmp/kararlar.md
    python -X utf8 -m pipeline.kaynak kararlar /tmp/kararlar.md        # tek bağlantıyla, 15-30 dakika sürebilir; yarıda kalırsa tekrar çalıştır
(HUK3012 için de gerekirse; HUK3012'nin kalan konuları az.)

## İş akışı
1. `python -X utf8 -m pipeline.durum` (özet) ve `python -X utf8 -m pipeline.durum <DERS> --siradaki 12` (yazılacak konular: no | slug | beceri | başlık).
   Sıra: HUK3012 kalanları → HUK3013 → HUK3015 (yalnız paketi olan 15 konu).
2. Her iki konu için bir yazar ajanı başlat (`pipeline/ajan/README.md` "Yazar" kalıbı; **model: sonnet**):
   > Önce görev tanımını oku ve harfiyen uygula: `pipeline/ajan/YAZAR.md` (`<DERS>` = ...). Hedefler HAFİF MOD'dadır (12 soru, 2 olay, 12 kart,
   > 1500-2000 kelime anlatım). Örnek konu dosyasını okuma. Sana İKİ konu veriliyor; sırayla ikisini de yap; kontrol temizse `elle bitir` de çalıştır.
   > Konu <no>: **<başlık>** (slug: `<slug>`). Kaynak paketi: `pipeline/kaynak/<DERS>/<slug>.md`. Çıktı: `pipeline/taslak/<DERS>/<slug>.yaml`. `beceriler`: `<eklenti>/<beceri>`.
   > Argon paketi: YAZAR.md'deki "Argon paketi" kurallarını uygula. ÖNEMLİ: önceki yazarlar paketlerdeki madde alıntılarının, fıkra numaralarının ve
   > karar özetlerinin çoğunun resmî metinle uyuşmadığını buldu; her şeyi araçtan ve `arastir karar <id> --max 6000` (önbellekten) ile kontrol et.
   > Paket kesik/boş olabilir: eksik yeri madde ve karar metinlerinden tamamla, uydurma. Ders notu: `pipeline/ajan/<DERS>.md`.
   > Bitince YAZAR.md'deki kısa rapor biçimiyle bildir.
3. Bir dalga bitince (her 6-8 yazar): `git add pipeline/taslak pipeline/out && git commit -m "feat(icerik): <DERS> konu ... " && git push origin arif/icerik-burada`
   (commit mesajı sonuna `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). `elle bitir` çıktısı olmayan taslak varsa sen çalıştır.
4. `pipeline.durum` "yazılacak 0" olunca dur ve kısa rapor ver (biten konular, yaklaşık token).

## Buluttan yapılmayacaklar
- `pipeline load` (sunucu yüklemesi yerelde yapılır: SSH anahtarı yerelde), `main`'e push, `.env`/anahtar commit'i, `pipeline/*.py` ve `server/` değişikliği.
- Yeni konu araştırması, araştırması olmayan konuyu yazmak, web'den madde metni ya da künye almak.
