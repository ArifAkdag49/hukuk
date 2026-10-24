# Araştırma görevi: konu için kaynak paketi (Opus)

Tek bir hukuk öğrencisi (Marmara Hukuk, 3. sınıf) için hazırlanan çalışma uygulamasına bir konu yazılacak. Senin işin
**yazmak değil, araştırmak**: konunun bütün doğrulanmış bilgisini tek bir **kaynak paketi** dosyasında toplamak. Notu
paketten başka bir ajan (Sonnet) yazacak ve **yeni araştırma yapmayacak**. Bu yüzden paket eksiksiz ve yalnız
doğrulanmış bilgiden oluşmalı. Pakette olmayan bilgi nota giremez; pakette yanlış olan her şey nota da yanlış geçer.

Çalışma dizini: `C:\Users\PC\Desktop\Hukuk` — Python: `.venv/Scripts/python` (Bash'te `cd /c/Users/PC/Desktop/Hukuk`).
Çıktı: `pipeline/kaynak/<DERS>/<slug>.md` (klasör yoksa oluştur).

## 1. Önce oku
1. `pipeline/YAZIM_REHBERI.md`: doğruluk kuralları (özellikle tartışmalı noktalar, kendi hesaplanan rakamlar, atıf yazımı).
2. Müfredat: `pipeline/curriculum/<DERS>.yaml` içinde kendi `slug`ın; konu sınırları için `.venv/Scripts/python -X utf8 -m pipeline.elle harita <DERS>`.
3. Ders notu: `pipeline/ajan/<DERS>.md` (ders geneli uyarılar ve senin konunun kapsam maddesi).
4. Beceri dosyası (istemde verilir): yalnız kavram listesi ve çerçeve; içindeki madde numaraları hatalı olabilir.

## 2. Araçlar
- Madde metni: `.venv/Scripts/python -X utf8 -m pipeline.arastir madde TMK 683 684` (numaralı kanun: `madde 3402 14`).
- Başlıklar: `pipeline.arastir basliklar TMK 683 729`. Tam metinde arama (geçici maddeler, dipnotlar): `pipeline.arastir tam TMK --ara "<desen>"`.
- Değişiklikler: `pipeline.arastir degisiklik <DERS> --yil 2021` ve gerekirse `degisiklik <KANUN> --yil 2021`.
- İçtihat: `pipeline.arastir ictihat "<ifade>" --adet 8` (idare `--mahkeme danistay`, anayasa `--mahkeme anayasa`); tam metin `pipeline.arastir karar <id> --max 15000`.
  Servis "erişim sınırı" verirse 15-20 saniye bekleyip yeniden dene.
- WebSearch/WebFetch: yalnız yerleşik uygulamayı ve tartışmaları anlamak için. **Künye ve madde metni web'den alınmaz.**

## 3. Çalışma sırası
1. Müfredattaki ve konuyla doğrudan ilgili komşu maddeleri çek ve **tek tek oku**. Her maddenin çekilmiş olması şart:
   yazar ve denetim aracı metni önbellekten okur.
2. Değişiklik raporunu çalıştır; konuna giren her değişikliği madde metninden ve dipnottan oku.
3. En az 3 sorguyla içtihat ara. HGK, İBK ve yeni tarihli kararları tercih et. **En öğretici 3 kararı tam metinden oku**;
   en fazla 3 kararı daha yalnız ilke doğrulamak için açabilirsin. Daha fazlasını okuma: maliyetin büyük kısmı burada.
4. Paketi yaz (aşağıdaki biçim). Her bilginin yanında dayanağı olsun (madde, karar id'si ya da "öğreti").
5. Paketi kendin bir kez baştan sona kontrol et: her süre, oran ve şart resmî metinle birebir mi; her karar olgusu tam
   metinde var mı; tartışmalı her nokta "tartışmalı" diye işaretli mi.

## 4. Paketin biçimi (Markdown, 2500-4500 kelime)
```
# <DERS> <konu no>: <başlık> (<slug>)
## 1. Kapsam
Konuya girenler; komşu konular (hangi konuda olduğu) ve bu konuda yalnız bir cümleyle anılacaklar.
## 2. Maddeler
Her madde için: `KANUN m. N` — başlığı — kuralın 1-3 cümlelik özü. Süre, oran, şart ve sonuçları **resmî metinden
tırnak içinde birebir** ver. Yazarın `maddeler` listesine koyacağı tam liste en sonda: `{kanun: TMK, madde: '683'}`.
## 3. Yakın tarihli değişiklikler (📌)
Değişiklik, tarih, kanun numarası, eski ve yeni hâl (metinden), yürürlük (yalnız resmî kaynaktan doğrulandıysa).
## 4. Kararlar (tam metinden okunan 3 karar)
Her biri: id, künye (araçtan: mahkeme, E., K., tarih), olgular, ilk derece ve istinaf, Yargıtay'ın sonucu ve oy durumu,
ilke. Yalnız metinde olanı yaz. Ayrıca yalnız ilke doğrulamak için açtığın kararlar: id + tek cümle ilke.
## 5. İBK ve yerleşik içtihat
Künyesi araçtan doğrulanan İBK'lar; doğrulanamayanlar yalnız yıl ya da "yerleşik içtihat" diye.
## 6. Tartışmalı noktalar
Her biri için iki görüş (yazar adı yok) ve varsa Yargıtay'ın tutumu. **Bunlar soru ve olay sonucu olamaz.**
## 7. Sınav için doğrulanmış olgular (25-35 madde)
Soru yazılabilecek, tartışmasız, tek cümlelik bilgiler; her birinin dayanağı. Yazar soruları buradan kuracak.
## 8. Sık karıştırılanlar ve tuzaklar
Karıştırılan ikililer, yanlış bilinenler, eski kitaplarda kalmış kurallar.
## 9. Olay malzemesi
3 olay fikri: kısa olgular, her alt sorunun tartışmasız cevabı ve dayanağı. Sonuç tartışmalı bir noktaya bağlı olmasın.
6-8 kısa örnek (anlatım için).
## 10. Kesin olmayanlar
Doğrulayamadığın ve yazarın kesin dille yazmaması gereken her şey.
```

## 5. Yasaklar
- Not (YAML) yazma; yalnız paket. `elle kontrol`, `elle bitir`, `pipeline load|generate|all|tables` çalıştırma.
- `pipeline/*.py`, `server/`, `app/`, `pipeline/YAZIM_REHBERI.md` ve başka konuların dosyalarına dokunma. Git komutu yok.
- Kaynaklardan cümle kopyalama (madde metni tırnağı hariç). Kararlardan uzun alıntı yok.

## 6. Rapor (kısa)
Paketin yolu ve kelime sayısı; okunan kararlar (id + bir cümle); bulunan değişiklikler; kesin olmayanlar; araç sorunları.
