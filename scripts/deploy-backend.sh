#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Deploys all five backend microservices in the correct dependency order.
# Each service publishes its outputs (Cognito ID, SQS ARN, S3 bucket, etc.)
# to SSM Parameter Store under /cloudwave/${STAGE}/ so the next service
# can read them at deploy time.
# ----------------------------------------------------------------------------
set -euo pipefail

STAGE="${1:-dev}"
echo "Deploying CloudWave to stage: $STAGE"

SERVICES=(
  "auth-service"            # publishes Cognito User Pool ARN/ID/ClientId
  "notifications-service"   # publishes SQS queue ARN, sets up EventBridge schedule
  "files-service"           # publishes S3 bucket name + CloudFront domain
  "events-service"          # consumes Cognito ARN for JWT authorizer
  "registrations-service"   # consumes Cognito ARN + SQS ARN
)

for svc in "${SERVICES[@]}"; do
  echo ""
  echo "============================================================"
  echo " Deploying $svc"
  echo "============================================================"
  pushd "backend/services/$svc" > /dev/null
  npx serverless deploy --stage "$STAGE"
  popd > /dev/null
done

echo ""
echo "✅ All services deployed to stage $STAGE."
