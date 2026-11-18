#!/usr/bin/env bash
# Copia de seguridad: base de datos (copia consistente) + fotos, en un solo archivo con fecha.
# Guarda las últimas 14 copias en deploy/backups/. Para correrlo todos los días, ver docs/DESPLIEGUE_ORACLE.md.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p backups
docker compose exec -T app node backup.mjs

STAMP="$(date +%Y%m%d-%H%M)"
FILES=("snapshot.sqlite")
[ -d data/uploads ] && FILES+=("uploads")
tar czf "backups/sampacho-${STAMP}.tar.gz" -C data "${FILES[@]}"

# Borra las copias de más de 14 días
find backups -name 'sampacho-*.tar.gz' -mtime +14 -delete
echo "Copia lista: backups/sampacho-${STAMP}.tar.gz ($(du -h "backups/sampacho-${STAMP}.tar.gz" | cut -f1))"
