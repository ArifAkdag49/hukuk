# Konu yazma görevi: kaynak paketinden ders notu (Sonnet)

Tek bir hukuk öğrencisi (Marmara Hukuk, 3. sınıf) için hazırlanan Android çalışma uygulamasının bilgi bankasına
**bir konu** yazıyorsun. Araştırma yapıldı: konunun doğrulanmış bütün bilgisi **kaynak paketinde**
(`pipeline/kaynak/<DERS>/<slug>.md`). Senin işin bu paketten öğretici, örnekli, not üslubunda bir konu yazmak.
**Yeni araştırma yapma; paketin dışındaki bilgiyi nota koyma.** Paket bir konuda susuyorsa sen de sus ya da raporla.
Öğrenci sınava bu notla hazırlanacak; yanlış bilgi doğrudan zarar verir.

Çalışma dizini: `C:\Users\PC\Desktop\Hukuk` — Python: `.venv/Scripts/python` (Bash'te `cd /c/Users/PC/Desktop/Hukuk`).
Çıktı: `pipeline/taslak/<DERS>/<slug>.yaml` (klasör yoksa oluştur).

## 1. Önce oku (tamamını)
1. `pipeline/YAZIM_REHBERI.md`: üslup, doğruluk kuralları, bölümler, hedef uzunluklar, YAML biçimi, kontrol listesi.
2. Kaynak paketi: `pipeline/kaynak/<DERS>/<slug>.md`.
3. Örnek konu: `pipeline/taslak/HUK3011/tescil-serh-ve-beyan.yaml` (üslup, derinlik ve biçim bu düzeyde).

## 2. Kurallar
- **Her hukuki bilgi pakete dayanır.** Süre, oran, şart ve sonuçları paketteki tırnaklı madde metninden aktar. Emin
  olmak için yalnız şu komutla madde metnine bakabilirsin (önbellekten gelir): `.venv/Scripts/python -X utf8 -m pipeline.arastir madde TMK 683`.
  İçtihat araması, web araması ve karar tam metni okuma **yapma**.
- **Kararlar:** `kararlar` listesine yalnız paketin 4. bölümündeki kararları koy; özetleri paketteki olgulardan yaz,
  olgu ekleme. Pakette numarasız anılan kararları anlatımda numara vermeden kullanabilirsin.
- **Sorular:** paketin 7. bölümündeki doğrulanmış olgulardan kur. Tek, tartışmasız doğru cevap; çeldiriciler pakettki
  tuzaklardan (8. bölüm). 6. bölümdeki tartışmalı noktalar soru ve olay **sonucu olamaz**; yalnız doktrinde anlatılır.
- **Olaylar:** paketin 9. bölümündeki olay malzemesini kullan; çözümün her adımı bir maddeye dayansın.
- **Kesin olmayanlar** (10. bölüm) nota kesin dille girmez.
- 📌 Yakın tarihli değişiklikleri paketin 3. bölümünden ver.
- **Atıf yazımı:** Her atıfta kanun kısaltmasını yaz ("TMK m. 683 ve TMK m. 684"); kanunları karıştıran listelerde her
  maddeye kısaltma. Yönetmelik, tebliğ, Cumhurbaşkanı Kararı ve sözleşmelere "m." ile atıf yapma ("Yönetmelik'in 4.
  maddesi"). Numaralı kanun: "3402 sayılı Kanun m. 14", `maddeler`e `{kanun: '3402', madde: '14'}`. Geçici maddeye
  "TMK'nın geçici 1. maddesi" diye yazıyla. Kendi hesapladığın rakamı kesin bilgi gibi verme.
- **Hedefler:** özet 250-450 kelime, anlatım 1800-3000, kritik 10-15 madde, doktrin 150-500 kelime, sözlük 8-15 terim,
  kararlar 2-3, 20 çoktan seçmeli soru (en az 6'sı mini olay), 3 olay (5-8 ölçüt, toplam 100 puan, çözüm 300-700 kelime),
  15-25 kart. Üslup: üniversite öğrencisine ders anlatımı; bol ve doğru örnek, tablo ve ⚠️ kutuları.

## 3. Çalışma sırası
1. Paketi ve rehberi oku. 2. Taslağı yaz. 3. Denetimi çalıştır, **hata ve uyarı kalmayana kadar** düzelt:
   `.venv/Scripts/python -X utf8 -m pipeline.elle kontrol <DERS> <slug>`. 4. Rehberin 6. bölümündeki kontrol listesini geç.

## 4. Yasaklar
- `elle bitir`, `pipeline load|generate|all|tables`, git komutları yok. `pipeline/*.py`, `server/`, `app/`,
  `pipeline/YAZIM_REHBERI.md`, kaynak paketi ve başka konuların dosyalarına dokunma.
- Kaynaklardan ya da paketten uzun cümle kopyalama; kendi anlatımınla yaz (madde metni tırnağı hariç).

## 5. Rapor (kısa)
`elle kontrol`'ün son satırı; pakette eksik bulduğun ya da paketle çelişir gördüğün noktalar; kesin yazmaktan
kaçındığın yerler; denetimde yanlış alarm.
