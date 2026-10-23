#!/usr/bin/env bash
# Redeploy del sitio a AWS (S3 + CloudFront).
# Uso: ./scripts/deploy.sh
set -euo pipefail

PROFILE="ota-cleanup"
BUCKET="mis-viajes-site-730335402738"
DISTRIBUTION_ID="E1HVYFBAQASLTV"

cd "$(dirname "$0")/.."

# En Windows, invocar "bash scripts/deploy.sh" directo desde PowerShell a veces
# no hereda el PATH con la carpeta de instalacion de AWS CLI. Si no lo encuentra,
# lo agregamos a mano antes de fallar.
if ! command -v aws >/dev/null 2>&1; then
  export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
fi
if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: no se encontro el comando 'aws'. Instala AWS CLI o revisa tu PATH." >&2
  exit 1
fi

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

echo "==> Manifiesto de la web app con su tipo correcto (sync no siempre reconoce .webmanifest)"
aws s3 cp out/manifest.webmanifest "s3://$BUCKET/manifest.webmanifest"   --content-type "application/manifest+json"   --cache-control "public, max-age=0, must-revalidate"   --profile "$PROFILE"

echo "==> Invalidando cache de CloudFront"
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --profile "$PROFILE"

echo "==> Listo: https://d15dijpwwyhntu.cloudfront.net"
