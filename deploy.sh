#!/bin/bash

set -euo pipefail

APP_NAME="moviebox"
BRANCH="main"
HEALTH_PORT="${DEPLOY_HEALTH_PORT:-3003}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # CloudPanel abre sesiones no interactivas con el Node del sistema.
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null
fi

if [ "$(node --version | sed 's/^v//' | cut -d. -f1)" -lt 20 ]; then
  NODE22_DIR="$(find "$NVM_DIR/versions/node" -maxdepth 1 -type d -name 'v22.*' 2>/dev/null | sort -V | tail -n 1)"
  if [ -n "$NODE22_DIR" ] && [ -x "$NODE22_DIR/bin/node" ]; then
    export PATH="$NODE22_DIR/bin:$PATH"
  fi
fi

NODE_MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "MovieBox requiere Node 20 o superior; version actual: $(node --version)" >&2
  exit 1
fi

echo "Actualizando MovieBox desde GitHub..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo "Instalando dependencias y compilando frontend..."
npm ci
npm run typecheck
npm run build

echo "Preparando backend y base de datos..."
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
mkdir -p uploads logs

echo "Reiniciando MovieBox en PM2..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start dist/index.js \
    --name "$APP_NAME" \
    --time \
    --max-memory-restart 512M \
    --error logs/error.log \
    --output logs/output.log \
    --env production
fi
pm2 save

echo "Verificando API local..."
READY=0
for attempt in {1..20}; do
  if curl --fail --silent --show-error "http://127.0.0.1:${HEALTH_PORT}/api/health" >/dev/null; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" != "1" ]; then
  pm2 logs "$APP_NAME" --lines 50 --nostream || true
  exit 1
fi

echo "MovieBox publicado correctamente."
pm2 status
