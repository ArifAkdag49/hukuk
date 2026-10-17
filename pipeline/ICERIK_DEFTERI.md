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
| 1 | esya-hukukuna-giris-ve-ilkeler | yüklendi | ajan yazdı; denetçi ehliyetsizlikte TMK m. 1023 tartışmasını ekledi (HGK 2026); sunucuya yüklendi (2026-10-18) |
| 2 | zilyetlik-kavrami-turleri-ve-devri | yüklendi | ajan yazdı; denetçi soru 12 ve olay 2'yi iki görüşe göre de doğru hâle getirdi; sunucuya yüklendi (2026-10-18) |
| 3 | zilyetligin-korunmasi-ve-hak-karineleri | yüklendi | ajan yazdı; denetçi 2 küçük yumuşatma; sunucuya yüklendi (2026-10-18) |
| 4 | iyiniyetli-kazanim-ve-zilyetin-iade-borcu | yüklendi | ajan yazdı; denetçi hile-irade dışı çıkış genellemesini düzeltti; sunucuya yüklendi (2026-10-18) |
| 5 | tapu-sicili-kurulus-ve-ilkeler | yüklendi | ajan yazdı; denetçisiz; olay 2 HGK 2025 çoğunluk görüşüne dayanır; sunucuya yüklendi (2026-10-18) |
| 6 | tescil-serh-ve-beyan | yüklendi | ajan yazdı; denetçi soru 12 tarihini (TMK m. 895/2) ve 3 küçük noktayı düzeltti; sunucuya yüklendi (2026-10-18) |
| 7 | tapuya-guven-ve-yolsuz-tescil | yüklendi | ajan yazdı; denetçisiz; 1974 İBK künyesi araçla okunan HGK metinlerinden; sunucuya yüklendi (2026-10-18) |
| 8 | mulkiyetin-icerigi-ve-korunmasi | yüklendi | ajan yazdı (son rötuşta durduruldu, kontrol temiz); denetçisiz; sunucuya yüklendi (2026-10-18) |
| 9 | mulkiyetin-kapsami-butunleyici-parca-eklenti | yüklendi | ajan yazdı; denetçi bozuk soru 6'yı ve 3 belirsiz noktayı düzeltti; sunucuya yüklendi (2026-10-18) |
| 10 | payli-mulkiyet | yüklendi | ajan yazdı; denetçisiz; sunucuya yüklendi (2026-10-18) |
| 11 | elbirligi-mulkiyeti-ve-ortakligin-giderilmesi | yüklendi | ajan yazdı; denetçisiz (kullanıcı kararı: token tasarrufu); sunucuya yüklendi (2026-10-18) |
| 12 | tasinmaz-mulkiyetinin-kazanilmasi | yüklendi | ajan yazdı; denetçisiz; AYM 2026 iptali (2942 m. 10/8) notu; sunucuya yüklendi (2026-10-18) |
| 13 | kazandirici-zamanasimi-isgal-yeni-arazi | yüklendi | ajan yazdı; denetçisiz; 📌 TMK m. 713/4 (7418, 2022); sunucuya yüklendi (2026-10-18) |
| 14 | tasinmaz-mulkiyetinin-kapsami-ve-komsuluk | bitti | bulutta araştırma-yazma-denetim; denetçi soru 17 cevap anahtarını (TMK m. 751) ve 7 küçük noktayı düzeltti; 📌 HUAK m. 18/B komşu hakkı; yüklenmedi |
| 15 | yapi-hukuku-ve-taskin-yapi | bitti | bulutta araştırma-yazma-denetim; denetçi TMK m. 723/3 "geçmeyebilir"i (takdir, tavan değil) 6 yerde ve 15 günlük itiraz olaylarını düzeltti; yüklenmedi |
| 16 | yasal-onalim-alim-ve-geri-alim | bitti | bulutta araştırma-yazma-denetim; denetçi 14 düzeltme (7571 geçiş kuralı: bedel kuralı bütün davalara, olay 3 tarihleri, geri alım lehtarı); 📌 TMK m. 733-734 (7571, 25.12.2025); yüklenmedi |
| 17 | gecit-hakki-su-ve-diger-kanuni-kisitlamalar | bitti | bulutta araştırma-yazma-denetim; denetçi 8 küçük düzeltme (soru 3 ikinci doğruya yakın şık, TMK m. 745/2 sınırı, doktrinde kalan yazar talimatı); 📌 HUAK m. 18/B; yüklenmedi |
| 18 | tasinir-mulkiyetinin-devri-ve-mulkiyeti-sakli-tutma | bekliyor | yazar durduruldu (buluta devir), taslak yok |
| 19 | tasinir-mulkiyetinin-diger-kazanma-yollari | bekliyor | |
| 20 | tasinmaz-irtifaki | bitti | bulutta araştırma-yazma-denetim; denetçi 7 küçük düzeltme (karar 3 özetinde olaya özgü sonucun genellenmesi, "İBK yoktur" → bulunamadı); yüklenmedi |
| 21 | intifa-ve-oturma-hakki | bekliyor | |
| 22 | ust-hakki-kaynak-hakki-ve-tasinmaz-yuku | bekliyor | |
| 23 | tasinmaz-rehni-genel-hukumler | bekliyor | |
| 24 | ipotek-ve-kanuni-ipotek | bekliyor | |
| 25 | ipotekli-borc-senedi-ve-irat-senedi | bekliyor | |
| 26 | tasinir-rehni-hak-rehni-ve-hapis-hakki | bekliyor | |
| 27 | kat-mulkiyeti-kurulus-ve-kat-irtifaki | bekliyor | |
| 28 | kat-maliklerinin-haklari-borclari-ve-yonetim | bekliyor | |
