# Konu denetleme görevi (bağımsız doğruluk denetimi)

Bir hukuk öğrencisinin (Marmara Hukuk) çalışma uygulaması için başka bir ajanın yazdığı **bir konu taslağını**
bağımsız olarak denetliyorsun. Öğrenci sınava bu notla hazırlanacak; bir yanlış cevap anahtarı ya da yanlış süre
doğrudan zarar verir. Yazarın iddialarına güvenme: her şeyi resmî metinden ve karar tam metninden kendin doğrula.
Bu iş **API harcamadan**, bu Claude Code oturumunda yapılır.

Çalışma dizini: `C:\Users\PC\Desktop\Hukuk` — Python: `.venv/Scripts/python` (Bash'te `cd /c/Users/PC/Desktop/Hukuk`).

## 1. Önce oku
1. `pipeline/YAZIM_REHBERI.md` (tamamı; özellikle doğruluk kuralları ve 6. bölümdeki kontrol listesi).
2. Taslağın tamamı: `pipeline/taslak/<DERS>/<slug>.yaml`.
3. Soru özeti: `.venv/Scripts/python -X utf8 -m pipeline.elle ozet <DERS> <slug>`
   (her sorunun doğru şıkkı ✓, yanlışları ✗ ve açıklaması; olayların sonuç bölümleri).

## 2. Araçlar
- Resmî madde metni: `.venv/Scripts/python -X utf8 -m pipeline.arastir madde TBK 112 113` (TMK, HMK, İİK, TTK, TCK, AY, KMK vb.; numaralı kanun için `madde 6216 45`).
- Karar tam metni: `.venv/Scripts/python -X utf8 -m pipeline.arastir karar <id> --max 20000` (idare/anayasa için `--mahkeme danistay|anayasa`).
- İçtihat arama: `.venv/Scripts/python -X utf8 -m pipeline.arastir ictihat "<ifade>" --adet 8`.
- Denetim: `.venv/Scripts/python -X utf8 -m pipeline.elle kontrol <DERS> <slug>`.
- Yakın tarihli değişiklikler: `.venv/Scripts/python -X utf8 -m pipeline.arastir degisiklik <DERS> --yil 2023`. Taslağın
  atıf yaptığı maddelerden listede çıkanların güncel hâliyle anlatıldığını kontrol et.
- Tam metinde arama (geçici maddeler, dipnotlar): `.venv/Scripts/python -X utf8 -m pipeline.arastir tam <KANUN> --ara "<desen>"`.
- WebSearch/WebFetch: yalnız yakın tarihli kanun değişikliği, İBK ya da yerleşik uygulamayı teyit için. Künyeyi web'den alma.

## 3. Ne denetlenir (sırayla, atlamadan)
1. **Çoktan seçmeli soruların hepsi.** Her soru için ilgili maddenin resmî metnini aç ve şunları doğrula:
   işaretli şık doğru mu; başka bir şık da savunulabilir biçimde doğru mu (öyleyse soru bozuk); açıklama doğru mu;
   süre, oran, şart ve sonuçlar metinle birebir mi. Mini olaylarda olgulardan tek bir sonuç çıkıyor mu.
2. **Olay soruları.** Çözümün dayandığı her kural metinle uyumlu mu; sonucu tartışmalı ya da değişken bir içtihat mı
   belirliyor (belirliyorsa olgu değiştirilerek tartışma dışına alınmalı, tartışma doktrine taşınmalı);
   ölçütlerin puan toplamı 100 mü; çözüm ölçütlerin hepsini karşılıyor mu.
3. **Kararlar.** Her kararın tam metnini aç. Özetteki her olgu (mahkeme/daire, esas-karar numarası, tarih, taraflar
   ve ilişkileri, ilk derece ve istinafın gerekçesi, Yargıtay'ın sonucu, tutarlar) metinde var mı. Karar özetin
   söylediğini gerçekten söylüyor mu. Abartı, eksik ya da kararın söylemediği genelleme var mı.
4. **Anlatım, kritik noktalar, tablolar, sözlük, kartlar.** Her madde numarası doğru içerikle eşleşiyor mu; her süre,
   oran, tutar ve yaş resmî metinle aynı mı; resmî metindeki "(Değişik/Ek ...: tarih-sayı)" notlarına göre güncel mi;
   mülga bir hükme yürürlükteymiş gibi atıf var mı; kaynaktan okunmamış bir rakam kesin bilgi gibi yazılmış mı.
   Kartların ön-arka eşleşmesi ve sözlük tanımları doğru mu.
5. **Doktrin.** Tartışmalı noktalar iki görüşle mi verilmiş; yazar adı var mı (olmamalı).

## 4. Düzeltme kuralları
- **Kesin hatayı taslakta doğrudan düzelt:** yalnız resmî metin ya da karar tam metniyle ispatlayabildiğin hatalar.
  Üslubu koru, en küçük değişikliği yap; bölüm yeniden yazma. Bozuk bir soruyu düzeltemiyorsan aynı kazanımı ölçen
  yeni ve tartışmasız bir soruyla değiştir (soru sayısı ve mini olay sayısı azalmasın).
- **Emin olmadığın noktayı değiştirme;** raporda belirt.
- Düzeltmeden sonra `elle kontrol` çalıştır; hata ve uyarı kalmasın.
- Yasaklar: API çağıran ya da veritabanına yazan komutlar (`python -m pipeline generate|all|tables|load`, `elle bitir`);
  `pipeline/*.py`, `server/`, `app/`, `pipeline/YAZIM_REHBERI.md` ve başka konuların dosyalarını değiştirmek; git komutları;
  kaynaklardan cümle kopyalamak.

## 5. Rapor (kısa ve dürüst)
- `elle kontrol` çıktısının son satırı.
- Yaptığın her düzeltme: yer (ör. "soru 7", "olay 2 çözümü", "karar 1 özeti"), önce → sonra, kanıt (madde ya da karar id).
- Değiştirmediğin şüpheli noktalar (madde madde, nedeniyle).
- Denetlediğin soru, olay ve karar sayısı; hiç açmadığın bir kaynak kaldıysa söyle.
