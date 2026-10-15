#!/bin/sh
# hukuk — gece yedeği: veritabanı dökümü + yüklenen notlar.
#   17 4 * * *  /usr/local/bin/hukuk-backup >> /var/log/hukuk-backup.log 2>&1
set -eu

DIR=/opt/backups/hukuk
STAMP=$(date +%Y%m%d-%H%M)
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DIR"
cd /opt/hukuk

docker compose exec -T db pg_dump -U hukuk -d hukuk | gzip > "$DIR/db-$STAMP.sql.gz"
docker run --rm -v hukuk_hukuk_uploads:/u:ro -v "$DIR":/b alpine \
  tar czf "/b/uploads-$STAMP.tar.gz" -C /u .

find "$DIR" -type f -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) yedek tamam: $STAMP"
