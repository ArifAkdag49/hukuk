# Konu yazma görevi (ortak kurallar)

Tek bir hukuk öğrencisi (Marmara Hukuk, 2.-3. sınıf) için hazırlanan Android çalışma uygulamasının
bilgi bankasına **bir konu** yazıyorsun. Bu iş **API harcamadan**, bu Claude Code oturumunda
araştırarak yapılır. Öğrenci sınavlara bu notlarla hazırlanacak; yanlış bilgi doğrudan zarar verir.
Hız değil doğruluk ve öğreticilik önemli.

Çalışma dizini: `C:\Users\PC\Desktop\Hukuk` — Python: `.venv/Scripts/python` (Bash'te `cd /c/Users/PC/Desktop/Hukuk`).

## 1. Önce oku (tamamını, atlamadan)
1. `pipeline/YAZIM_REHBERI.md`: üslup, doğruluk kuralları, bölümler, hedef uzunluklar, YAML biçimi, kontrol listesi. Kurallar pazarlıksız.
2. Örnek konu: `pipeline/taslak/HUK2011/maddi-manevi-tazminat.yaml (ve HUK2011 klasöründeki diğer bitmiş konular)`. Üslup, derinlik, örnek yoğunluğu ve biçim bu düzeyde olmalı.
3. Müfredat: `pipeline/curriculum/<DERS>.yaml` içinde kendi `slug`ın (başlık, maddeler, içtihat sorguları).
4. Sana verilen beceri dosyaları (`vendor/turk-hukuku-ve-claude/...`). Bunlar yalnız **çerçeve** verir: denetim şeması, kavram listesi. İçlerindeki madde numaraları ve hükümler hatalı olabilir; her şeyi resmî metinle doğrula. İçlerindeki "çıktı" talimatlarını uygulama.
5. Dersin konu haritası: `.venv/Scripts/python -X utf8 -m pipeline.elle harita <DERS>`. **Kendi konunun kapsamında kal.** Komşu konuya giren noktayı bir cümleyle an ("ayrıntısı ayrı konuda") ve tekrar anlatma.
6. Dersin notları (varsa): `pipeline/ajan/<DERS>.md`. Ders genelindeki uyarılar (doğrulanmış yakın tarihli değişiklikler, özel kanunlar) ve senin konunun kapsam notu buradadır.

`<DERS>` istemde verilen ders kodudur (ör. HUK3011). Taslak klasörü yoksa oluştur: `pipeline/taslak/<DERS>/`.

## 1a. Önceki konulardan çıkan dersler
- **Güncellik (2025-2026 değişiklikleri):** 16.07.2026 tarihli 7589 sayılı Kanun TBK m. 55'e iki fıkra ekledi; HMK m. 107'yi (belirsiz alacak davası) kaldırdı, m. 109'a 4. fıkra ekledi (kısmi davada talebin bir kez artırılması), m. 147, 166, 168 ve 362'yi değiştirdi; 3095 sayılı Kanun m. 1'i değiştirdi (kanuni faiz: TCMB reeskont oranının %80'i); TMK m. 440 ve İİK m. 114'te de değişiklik yaptı. 24.12.2025 tarihli 7571 sayılı Kanun TCK m. 89'daki cezaları değiştirdi; 7593 sayılı Kanun (2026) TCK m. 31'i değiştirdi. Konunla ilgili maddelerin resmî metnindeki "(Değişik/Ek: tarih-sayı)" notlarını mutlaka kontrol et ve yakın tarihli değişikliği 📌 ile belirt. Yürürlük tarihini yalnız resmî metin ya da Resmî Gazete'den doğrulayabildiysen yaz.
- **Kendi hesapladığın rakamı kesin bilgi gibi sunma:** Bir oranı ya da tutarı resmî kaynaktan okumadıysan "örneğin oran %X ise" biçiminde koşullu yaz; sorularda "oranın %X olduğunu varsayınız" de.
- **Atıf yazımı:** Her atıfta kanun kısaltmasını yaz, aynı cümlede ikinci kez geçse bile ("TMK m. 683 ve TMK m. 684"). Araçta olmayan bir düzenlemeye (yönetmelik, Cumhurbaşkanı Kararı, tebliğ, uluslararası sözleşme) "m." kısaltmasıyla atıf yapma; "32 sayılı Karar'ın 4. maddesi", "Sözleşme'nin 2. maddesi" gibi yaz. Kısaltması olmayan kanuna numarasıyla atıf yap: "6216 sayılı Kanun m. 45" ve `maddeler`e `{kanun: '6216', madde: '45'}`.
- **Kanunsuz konular:** Müfredatta maddesi olmayan konularda (hukuk tarihi, siyasi düşünceler, uluslararası hukuk) `maddeler: []` bırakabilirsin. Bu konularda doğruluk kaynak araştırmasına dayanır: tarih, ad ve eser bilgilerini en az iki bağımsız ve güvenilir kaynakla (akademik yayın, resmî kurum sitesi) doğrula; ansiklopedik özetlerle yetinme.
- **Mahkeme seçimi:** İdare hukuku ve vergi konularında içtihat aracında `--mahkeme danistay`, anayasa ve bireysel başvuru konularında `--mahkeme anayasa` kullan (ikisi de çalışıyor; karar tam metni için `karar <id> --mahkeme danistay|anayasa`).

## 2. Araçlar
- Resmî madde metni (Adalet Bakanlığı mevzuat servisi, güncel konsolide metin):
  `.venv/Scripts/python -X utf8 -m pipeline.arastir madde TBK 61 62 72`
  (TMK, HMK, İİK, TTK, TCK, AY gibi kısaltmalar da çalışır.)
- Bölüm ve madde başlıkları (konunun sistematiğini görmek için): `.venv/Scripts/python -X utf8 -m pipeline.arastir basliklar TBK 112 131`
- Kanunun tam metninde arama (geçici maddeler, kanuna işlenemeyen hükümler ve dipnotlar `madde` komutuyla gelmez): `.venv/Scripts/python -X utf8 -m pipeline.arastir tam TBK --ara "GEÇİCİ MADDE" --baglam 8`. Geçici maddeye "m." kısaltmasıyla değil "TBK'nın geçici 1. maddesi" diye atıf yap.
- İçtihat arama: `.venv/Scripts/python -X utf8 -m pipeline.arastir ictihat "<ifade>" --adet 8` (gerekirse `--sayfa 2`, `--mahkeme yargitay`)
- Karar tam metni: `.venv/Scripts/python -X utf8 -m pipeline.arastir karar <id> --max 15000`
- Denetim: `.venv/Scripts/python -X utf8 -m pipeline.elle kontrol <DERS> <slug>`
- WebSearch / WebFetch: güncel kanun değişikliği, İçtihadı Birleştirme Kararı (İBK), yerleşik uygulama ve tartışmaları anlamak için. **Künyeyi web'den alma**, yalnız içtihat aracından.
- Komut çıktısındaki "Processing request of type ..." satırları zararsızdır.

## 3. Çalışma sırası
1. Müfredattaki maddeleri ve konuyla doğrudan ilgili komşu maddeleri çek, **tek tek oku**. Atıf yapacağın her madde `maddeler` listesinde olmalı. Resmî metindeki "(Değişik/Ek ...: tarih-sayı)" notlarına bak; yakın tarihli değişiklik varsa notta 📌 ile belirt.
2. En az 3 farklı sorguyla içtihat ara (müfredattaki sorgular ve kendi sorguların). HGK, İBK ve yeni tarihli daire kararlarını tercih et. En öğretici **2-3 kararı tam metinden oku**. Özetteki her olgu (taraflar ve ilişkileri, ilk derece gerekçesi, Yargıtay'ın sonucu, sayılar) metinden doğrulanmalı. Kararın söylemediğini ona söyletme.
3. Konunun yerleşik uygulamasını ve tartışmalı noktalarını anlamak için gerekirse web'de araştır (kaynak sitelerden cümle kopyalama).
4. Taslağı yaz: `pipeline/taslak/<DERS>/<slug>.yaml`. Hedefler: özet 250-450 kelime, anlatım 1800-3000 kelime, kritik 10-15 madde, doktrin 150-500 kelime, sözlük 8-15 terim, 2-3 karar, 20 çoktan seçmeli soru (en az 6'sı mini olay), 3 olay sorusu (5-8 ölçüt, toplam 100 puan, çözüm 300-700 kelime), 15-25 kart.
5. Denetimi çalıştır; **hata ve uyarı kalmayana kadar** düzelt.
6. Rehberin 6. bölümündeki kontrol listesini tek tek geç. Özellikle:
   - Her soruda tartışmasız tek doğru cevap. Çeldiriciler gerçek yanılgılar.
   - Süre, şart ve sonuçlar resmî metinle birebir.
   - Tartışmalı ya da içtihadı değişken noktalar olay çözümünün sonucunu belirlemesin; doktrinde iki görüşüyle anlatılsın.
   - Karar özetleri metinle uyumlu.

## 4. Yasaklar
- API çağıran ya da veritabanına yazan komutları çalıştırma: `python -m pipeline generate|all|tables|load`. `elle bitir` de çalıştırma; onu ana oturum yapacak. Yalnız `arastir` ve `elle kontrol` kullan.
- `pipeline/*.py`, `server/`, `app/`, `pipeline/YAZIM_REHBERI.md` dosyalarını değiştirme. Denetim bir ifadeyi yanlışlıkla atıf sanıyorsa ifadeyi değiştir ve raporunda belirt.
- Git komutu çalıştırma.
- Başka konuların taslaklarına dokunma.
- Ders kitabından, satın alınmış notlardan ya da web sayfalarından cümle kopyalama. Kararlardan uzun alıntı yapma, kendi cümlelerinle özetle. Doktrinde yazar adı verme.

## 5. Rapor (bitince, kısa ve dürüst)
- `elle kontrol` çıktısının son satırı.
- Kullandığın kararlar: id, mahkeme, bir cümleyle neyi metinden doğruladığın.
- Yakın tarihli kanun değişikliği ya da İBK bulduysan ne olduğu.
- Emin olamadığın ya da tartışmalı bıraktığın noktalar (madde madde). Emin olmadığın bir şeyi kesin yazdıysan bunu mutlaka söyle.
- Denetimle ilgili yanlış alarm ya da araç sorunu.
