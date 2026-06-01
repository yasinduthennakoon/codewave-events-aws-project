#!/usr/bin/env bash
# Tears down all microservices in reverse dependency order.
set -euo pipefail

STAGE="${1:-dev}"

# Reverse of deploy order
SERVICES=(
  "registrations-service"
  "events-service"
  "files-service"
  "notifications-service"
  "auth-service"
)

for svc in "${SERVICES[@]}"; do
  echo "Removing $svc ..."
  pushd "backend/services/$svc" > /dev/null
  npx serverless remove --stage "$STAGE" || true
  popd > /dev/null
done

echo "✅ All services removed."
