#!/usr/bin/env bash
# Redeploy del sitio a AWS (S3 + CloudFront).
# Uso: ./scripts/deploy.sh
set -euo pipefail

PROFILE="ota-cleanup"
BUCKET="mis-viajes-site-730335402738"
DISTRIBUTION_ID="E1HVYFBAQASLTV"

cd "$(dirname "$0")/.."

echo "==> Build estatico"
npm run build

echo "==> Subiendo HTML (cache corto, para que el redeploy se vea al toque)"
aws s3 sync out/ "s3://$BUCKET/" \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "_next/static/*" \
  --profile "$PROFILE"

echo "==> Subiendo assets con hash (cache largo, son inmutables)"
aws s3 sync out/_next/static/ "s3://$BUCKET/_next/static/" \
  --cache-control "public, max-age=31536000, immutable" \
  --profile "$PROFILE"

echo "==> Invalidando cache de CloudFront"
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --profile "$PROFILE"

echo "==> Listo: https://d15dijpwwyhntu.cloudfront.net"
