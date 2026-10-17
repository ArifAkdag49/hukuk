# Buluttan (Claude Code cloud) devam

2026-10-18'de yerel oturumdan buluta devredildi. Kaldığı yer ve kurallar:

## Durum
- Kapsam ve ilerleme: `pipeline/ICERIK_DEFTERI.md` (kullanıcı kararı: 3. sınıfın bütün dersleri + HUK2009 İdare + HUK2017
  Devletler Umumi; HUK2011 kapatıldı).
- HUK3011 Eşya: 1-13 bitti (taslak + `pipeline/out`), 14-28 bekliyor. Sıradaki dersler: HUK3012, HUK3013, HUK3015,
  HUK3017, HUK3014, HUK3016, HUK2009, HUK2017.
- Akış ve istem kalıpları: `pipeline/ajan/README.md` (araştırma Opus, yazma Sonnet, denetim Opus).
- Kullanıcı token maliyetine duyarlı: aynı anda en çok 4-6 ajan; her dalgadan önce kalan krediyi kontrol et.

## Kurulum (bulut ortamı)
    python -m venv .venv && . .venv/bin/activate      # Windows değil: Python yolu .venv/bin/python
    pip install -r server/requirements.txt pyyaml
Görev metinlerindeki `.venv/Scripts/python` bulutta `.venv/bin/python` olur.
İçtihat aracı (`turk-hukuku-ictihat-mcp`) bu paketle gelir; `pipeline.arastir` için veritabanı ya da `.env` gerekmez.
Mevzuat ve içtihat servisleri (bedesten.adalet.gov.tr) ağdan erişilebilir olmalı; önce dene:
    python -X utf8 -m pipeline.arastir madde TMK 683
    python -X utf8 -m pipeline.arastir ictihat "ecrimisil" --adet 3
`pipeline/cache/` git'te yok; araçlar gerektikçe yeniden çeker.

## Buluttan yapılmayacaklar
- Sunucuya yükleme (`pipeline load` sunucu DB'sine) bulutta yapılmaz: SSH anahtarı yerelde. Bulut taslak ve
  `pipeline/out` dosyalarını commit edip dalı push eder; yükleme yerel oturumda yapılır.
- `main`'e doğrudan push yok; iş dalında çalış, bitince PR.
- Gizli bilgi (`.env`, anahtar) commit edilmez.
