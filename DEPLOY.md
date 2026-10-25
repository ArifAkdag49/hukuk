# hukuk — devreye alma (VPS)

Hedef: `https://hukuk.arxdigitalsevice.com`, arx-panel'in çalıştığı Plesk VPS.
Ayrı bir Compose yığını (`/opt/hukuk`); arx-panel ve ads-panel yığınlarına
dokunulmaz. API yalnız `127.0.0.1:8810`'a bağlı, dışarıya nginx üzerinden açılır.

> Bu adımlar sunucuda müşteri sistemlerinin yanında çalıştığı için
> **kullanıcı onayıyla** yapılır.

## 0 — Ön kontrol

```bash
ssh root@87.106.47.17 'free -m; df -h /; ss -ltnp | grep -E ":(5446|8810)\b" || echo "portlar boş"'
```

## 1 — Plesk

1. Domains → arxdigitalsevice.com → **Add Subdomain** → `hukuk`
2. SSL/TLS → Let's Encrypt sertifikası
3. Apache & nginx Settings → **Additional nginx directives** → `ops/nginx.conf` içeriği

## 2 — Kodu taşı (arx-panel'deki gibi bundle ile)

```bash
git bundle create /tmp/hukuk.bundle main
scp /tmp/hukuk.bundle root@87.106.47.17:/tmp/
ssh root@87.106.47.17 'mkdir -p /opt/hukuk && cd /opt/hukuk && git init -q 2>/dev/null; git fetch /tmp/hukuk.bundle main && git reset --hard FETCH_HEAD'
```

## 3 — Ortam dosyası (sunucuda `/opt/hukuk/.env`)

```
ANTHROPIC_API_KEY=...
APP_PASSWORD_HASH=...        # yereldeki .env ile aynı (aynı şifre) ya da yeni: python server/scripts/sifre_ozeti.py
JWT_SECRET=...               # yeni üret: python -c "import secrets;print(secrets.token_hex(32))"
POSTGRES_PASSWORD=...        # güçlü, yeni
AI_MONTHLY_CAP_USD=50
```

## 4 — Ayağa kaldır

```bash
cd /opt/hukuk && docker compose up -d --build
curl -s localhost:8810/health
```

## 5 — Bilgi bankasını yükle (yerelden, SSH tüneliyle)

Bilgi bankası `pipeline/out/` altındaki JSON dosyalarından yüklenir; içerik
yeniden üretilmez, API çağrısı yapılmaz.

```bash
ssh -N -L 5447:127.0.0.1:5446 root@87.106.47.17 &
DATABASE_URL=postgresql://hukuk:<POSTGRES_PASSWORD>@127.0.0.1:5447/hukuk python -m pipeline courses
DATABASE_URL=postgresql://hukuk:<POSTGRES_PASSWORD>@127.0.0.1:5447/hukuk python -m pipeline load HUK2011
```

## 6 — Yedekleme

```bash
cp ops/backup.sh /usr/local/bin/hukuk-backup && chmod +x /usr/local/bin/hukuk-backup
crontab -e   #  17 4 * * *  /usr/local/bin/hukuk-backup >> /var/log/hukuk-backup.log 2>&1
/usr/local/bin/hukuk-backup     # bir kez elle dene
```

## 7 — Uygulama (APK)

`app/` dizininde, Expo hesabıyla:

```bash
npx eas build -p android --profile preview
```

Çıkan APK bağlantısı telefonda açılır; "bilinmeyen kaynaklardan yükleme" izni gerekir.

## 8 — Web sürümü (iPhone ve tarayıcı)

Adres: `https://hukuk.arxdigitalsevice.com/app/`. Aynı alan adında olduğu için CORS gerekmez. nginx
`/app/` isteklerini Plesk kök klasöründeki `app/` dizininden verir (`ops/nginx.conf`); geri kalan her şey API'ye gider.
Veriler tarayıcıda IndexedDB'de tutulur. Bildirimler web'de çalışmaz. iPhone'da Safari → Paylaş →
"Ana Ekrana Ekle" ile uygulama gibi açılır.

`app/` dizininde derle (Git Bash'te `MSYS_NO_PATHCONV=1` şart, yoksa `/app` Windows yoluna çevrilir):

```bash
MSYS_NO_PATHCONV=1 EXPO_BASE_URL=/app EXPO_PUBLIC_API_URL=https://hukuk.arxdigitalsevice.com npx expo export --platform web --output-dir dist-web
tar --force-local -czf /tmp/hukuk-web.tgz -C dist-web . && scp /tmp/hukuk-web.tgz arx-sunucu:/tmp/
```

Sunucuda eski sürümün yerine koy (sahiplik Plesk kök klasörüyle aynı olmalı):

```bash
ssh arx-sunucu 'D=/var/www/vhosts/arxdigitalsevice.com/hukuk.arxdigitalsevice.com; OWN=$(stat -c "%U:%G" $D)
rm -rf $D/app.new && mkdir -p $D/app.new && tar -xzf /tmp/hukuk-web.tgz -C $D/app.new
chown -R $OWN $D/app.new && find $D/app.new -type d -exec chmod 755 {} + && find $D/app.new -type f -exec chmod 644 {} +
rm -rf $D/app.old; [ -d $D/app ] && mv $D/app $D/app.old; mv $D/app.new $D/app; rm -rf $D/app.old'
```

`ops/nginx.conf` değişirse sunucudaki `/var/www/vhosts/system/hukuk.arxdigitalsevice.com/conf/vhost_nginx.conf`
dosyasına kopyalanır (Plesk "Additional nginx directives" bu dosyadır), ardından `nginx -t && systemctl reload nginx`.

## Rutin güncelleme

```bash
git bundle create /tmp/hukuk.bundle main && scp /tmp/hukuk.bundle root@87.106.47.17:/tmp/
ssh root@87.106.47.17 'cd /opt/hukuk && git fetch /tmp/hukuk.bundle main && git reset --hard FETCH_HEAD && docker compose up -d --build'
```

Şema değişikliği `db/` altındaki dosyalar `create ... if not exists` ile
yazıldığı için elle uygulanır:

```bash
ssh root@87.106.47.17 'cd /opt/hukuk && docker compose exec -T db psql -U hukuk -d hukuk -v ON_ERROR_STOP=1 < db/001_schema.sql'
```

Sonraki dosyalar (`002_...`, `003_sohbet_notu.sql` gibi) aynı komutla, dosya adı değiştirilerek sırayla uygulanır; hepsi tekrar çalıştırılabilir (`if not exists`).
