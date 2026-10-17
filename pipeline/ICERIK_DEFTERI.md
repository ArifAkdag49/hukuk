# İçerik defteri

Elle (Claude Code'da, API'siz) yazılan konuların durumu. Bir oturum kesilirse
kaldığı yerden buradan devam edilir. Kural ve biçim: `pipeline/YAZIM_REHBERI.md`.

Durumlar: `bekliyor` · `yazılıyor` · `denetimde` (yazıldı, bağımsız denetçide) · `bitti` (elle bitir geçti) · `yüklendi` (sunucuda)

Akış ve görev metinleri: `pipeline/ajan/README.md`.

Kapsam (kullanıcı kararı, 2026-10-18): 3. sınıfın bütün dersleri (HUK3011 Eşya, HUK3012 Borçlar Özel,
HUK3013 Ticaret, HUK3015 Ceza Özel, HUK3017 Medeni Usul, HUK3014 İş, HUK3016 İnsan Hakları) ve 2. sınıftan
yalnız HUK2009 İdare ile HUK2017 Devletler Umumi. HUK2011'de yeni araştırma yapılmaz; biten konular yüklenir.
HUK2013, HUK2012, HUK2015 ve HUK2003 kapsam dışı.

## HUK2011 Borçlar Hukuku Genel Hükümler (28 konu)

| # | slug | durum | not |
|---|---|---|---|
| 1 | borc-iliskisi-temel-kavramlar | API (eski üslup) | yeniden yazılmayacak (kullanıcı kararı) |
| 2 | oneri-ve-kabul | API (eski üslup) | 〃 |
| 3 | sekil-ve-on-sozlesme | API (eski üslup) | 〃 |
| 4 | yorum-muvazaa-genel-islem-kosullari | API (eski üslup) | 〃 |
| 5 | kesin-hukumsuzluk-ve-asiri-yararlanma | API (eski üslup) | 〃 |
| 6 | yanilma | API (eski üslup) | 〃 |
| 7 | aldatma-korkutma-iptal | API (eski üslup) | 〃 |
| 8 | temsil-ve-yetkisiz-temsil | API (eski üslup) | 〃 |
| 9 | haksiz-fiil-genel-sorumluluk | API (eski üslup) | 〃 |
| 10 | kusursuz-sorumluluk-halleri | API (eski üslup) | 〃 |
| 11 | maddi-manevi-tazminat | yüklendi | örnek konu (rehberin referansı); sunucuya yüklendi (2026-10-17) |
| 12 | haksiz-fiil-muteselsil-sorumluluk-zamanasimi | yüklendi | ajan yazdı, ana oturum okudu; sunucuya yüklendi (2026-10-17) |
| 13 | sebepsiz-zenginlesme-sartlar | yüklendi | ajan yazdı, ana oturum soruları ve kilit hükümleri denetledi; sunucuya yüklendi (2026-10-17) |
| 14 | sebepsiz-zenginlesme-iade-kapsami | yüklendi | ajan yazdı, ana oturum soruları ve kilit hükümleri denetledi; sunucuya yüklendi (2026-10-17) |
| 15 | ifa-genel-esaslar | yüklendi | ajan yazdı, ana oturum soruları ve kilit hükümleri denetledi; sunucuya yüklendi (2026-10-17) |
| 16 | ifa-yeri-zamani-karsilikli-ifa | yüklendi | ajan yazdı, ana oturum soruları ve kilit hükümleri denetledi; sunucuya yüklendi (2026-10-17) |
| 17 | alacakli-temerrudu | yüklendi | ajan yazdı, ana oturum okudu; sunucuya yüklendi (2026-10-17) |
| 18 | borca-aykirilik-ve-tazminat | yüklendi | ajan yazdı; denetçi 9 küçük düzeltme (doktrin etiketleri, karar özetleri); sunucuya yüklendi (2026-10-18) |
| 19 | borclu-temerrudu-sart-ve-sonuclar | yüklendi | ajan yazdı; denetçi kanuni faiz yürürlüğünü (31.7.2026) düzeltti; sunucuya yüklendi (2026-10-18) |
| 20 | karsilikli-sozlesmelerde-secimlik-haklar | yüklendi | ajan yazdı; bağımsız denetim yapılmadı (kullanıcı kararıyla durduruldu); sunucuya yüklendi (2026-10-18) |
| 21 | imkansizlik-ve-asiri-ifa-guclugu | yüklendi | ajan yazdı; bağımsız denetim yapılmadı; sunucuya yüklendi (2026-10-18) |
| 22 | sona-erme-halleri-ve-takas | yüklendi | ajan yazdı; denetim yarıda kaldı; sunucuya yüklendi (2026-10-18) |
| 23 | zamanasimi | yüklendi | ajan yazdı; denetçi soru 3'ü düzeltti (Av. K. m. 40), HMK m. 141 güncel metne uyduruldu; sunucuya yüklendi (2026-10-18) |
| 24 | muteselsil-borcluluk | yüklendi | ajan yazdı; bağımsız denetim yapılmadı; sunucuya yüklendi (2026-10-18) |
| 25 | kosullu-borclar | iptal | kullanıcı kararıyla yazılmadı (2026-10-18) |
| 26 | baglanma-parasi-cayma-parasi-cezai-sart | yüklendi | ajan yazdı (son düzeltmeler yarıda); TBK m. 180/2 ana oturumda kontrol edildi; denetim yapılmadı; sunucuya yüklendi (2026-10-18) |
| 27 | alacagin-devri | iptal | kullanıcı kararıyla yazılmadı (2026-10-18) |
| 28 | borcun-ustlenilmesi-ve-sozlesmenin-devri | iptal | kullanıcı kararıyla yazılmadı (2026-10-18) |

## HUK3011 Eşya Hukuku (28 konu)

| # | slug | durum | not |
|---|---|---|---|
| 1 | esya-hukukuna-giris-ve-ilkeler | bitti | ajan yazdı; denetçi ehliyetsizlikte TMK m. 1023 tartışmasını ekledi (HGK 2026); yerelde yüklendi |
| 2 | zilyetlik-kavrami-turleri-ve-devri | denetimde | ajan yazdı (kontrol temiz) |
| 3 | zilyetligin-korunmasi-ve-hak-karineleri | denetimde | ajan yazdı (kontrol temiz) |
| 4 | iyiniyetli-kazanim-ve-zilyetin-iade-borcu | denetimde | ajan yazdı (kontrol temiz) |
| 5 | tapu-sicili-kurulus-ve-ilkeler | yazılıyor | |
| 6 | tescil-serh-ve-beyan | bitti | ajan yazdı; denetçi soru 12 tarihini (TMK m. 895/2) ve 3 küçük noktayı düzeltti; yerelde yüklendi |
| 7 | tapuya-guven-ve-yolsuz-tescil | yazılıyor | |
| 8 | mulkiyetin-icerigi-ve-korunmasi | yazılıyor | |
| 9 | mulkiyetin-kapsami-butunleyici-parca-eklenti | bitti | ajan yazdı; denetçi bozuk soru 6'yı ve 3 belirsiz noktayı düzeltti; yerelde yüklendi |
| 10 | payli-mulkiyet | yazılıyor | |
| 11 | elbirligi-mulkiyeti-ve-ortakligin-giderilmesi | yazılıyor | |
| 12 | tasinmaz-mulkiyetinin-kazanilmasi | yazılıyor | |
| 13 | kazandirici-zamanasimi-isgal-yeni-arazi | yazılıyor | |
| 14 | tasinmaz-mulkiyetinin-kapsami-ve-komsuluk | yazılıyor | |
| 15 | yapi-hukuku-ve-taskin-yapi | yazılıyor | |
| 16 | yasal-onalim-alim-ve-geri-alim | yazılıyor | |
| 17 | gecit-hakki-su-ve-diger-kanuni-kisitlamalar | yazılıyor | |
| 18 | tasinir-mulkiyetinin-devri-ve-mulkiyeti-sakli-tutma | yazılıyor | |
| 19 | tasinir-mulkiyetinin-diger-kazanma-yollari | bekliyor | |
| 20 | tasinmaz-irtifaki | bekliyor | |
| 21 | intifa-ve-oturma-hakki | bekliyor | |
| 22 | ust-hakki-kaynak-hakki-ve-tasinmaz-yuku | bekliyor | |
| 23 | tasinmaz-rehni-genel-hukumler | bekliyor | |
| 24 | ipotek-ve-kanuni-ipotek | bekliyor | |
| 25 | ipotekli-borc-senedi-ve-irat-senedi | bekliyor | |
| 26 | tasinir-rehni-hak-rehni-ve-hapis-hakki | bekliyor | |
| 27 | kat-mulkiyeti-kurulus-ve-kat-irtifaki | bekliyor | |
| 28 | kat-maliklerinin-haklari-borclari-ve-yonetim | bekliyor | |
