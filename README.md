# Hukuk Çalışma

Tek bir Marmara Hukuk öğrencisi için çalışma uygulaması: önceden üretilmiş ve
resmî kaynaklarla doğrulanmış bilgi bankası, quiz, olay çözme, tekrar kartları,
ders notu yükleme ve canlı asistan.

- Tasarım: [docs/superpowers/specs/2026-10-16-hukuk-calisma-uygulamasi-design.md](docs/superpowers/specs/2026-10-16-hukuk-calisma-uygulamasi-design.md)
- Uygulama planı: [docs/superpowers/plans/2026-10-16-hukuk-calisma-uygulamasi.md](docs/superpowers/plans/2026-10-16-hukuk-calisma-uygulamasi.md)
- Sunucuya kurulum: [DEPLOY.md](DEPLOY.md)
- Android uygulaması: [app/OKUBENI.md](app/OKUBENI.md)

## Parçalar

| Dizin | Ne |
|---|---|
| `server/` | FastAPI: giriş, bilgi bankası dışa aktarımı, ilerleme senkronizasyonu, notlar, olay puanlama, asistan, harcama |
| `pipeline/` | İçerik hattı: müfredat → konu içeriği → sorular/olaylar/kartlar → Yargıtay kararları → doğrulama → yükleme |
| `db/` | Postgres şeması |
| `app/` | Expo (React Native) Android uygulaması |
| `vendor/` | `aydincan/turk-hukuku-ve-claude` beceri kütüphanesi (git dışı, aşağıdaki komutla alınır) |

Kaynaklar: madde metinleri Adalet Bakanlığı bedesten mevzuat servisinden
(`server/app/mevzuat.py`), kararlar `turk-hukuku-ictihat-mcp` üzerinden gelir.

## Yerelde çalıştırma

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r server/requirements-dev.txt
git clone --depth 1 https://github.com/aydincan/turk-hukuku-ve-claude vendor/turk-hukuku-ve-claude
docker compose up -d --build        # db 127.0.0.1:5446, api 127.0.0.1:8810
```

`.env` dosyası `.env.example`'a göre doldurulur (API anahtarı, şifre özeti, JWT sırrı).
Giriş şifresi `GIRIS_BILGISI.txt` dosyasındadır (git dışı).

## Testler

```bash
cd server && ../.venv/Scripts/python -m pytest -q      # test veritabanı: hukuk_test
cd app && npx jest && npx tsc --noEmit
```

## İçerik hattı

```bash
python -X utf8 -m pipeline courses                 # 14 dersi kaydet
python -X utf8 -m pipeline curriculum HUK2011      # konu ağacı
python -X utf8 -m pipeline generate HUK2011 --limit 10
python -X utf8 -m pipeline tables HUK2011
python -X utf8 -m pipeline load HUK2011
python -X utf8 -m pipeline status HUK2011          # maliyet ve doğrulama durumu
```

Her konu `pipeline/out/<ders>/<slug>.json` dosyasına yazılır. Var olan konu
atlanır, yani hat kaldığı yerden devam eder. Konu başına maliyet yaklaşık 1$
(Opus 5.5).
