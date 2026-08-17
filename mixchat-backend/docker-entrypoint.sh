#!/bin/sh
set -e

echo "==> Running database migrations (Prisma)..."
npx prisma migrate deploy || {
  echo "Prisma migrations failed or already applied. Continuing..."
}

echo "==> Starting MixChat Backend API..."
exec node dist/src/main.js
