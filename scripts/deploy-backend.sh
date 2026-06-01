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

deploy_service() {
  local svc="$1"
  echo ""
  echo "============================================================"
  echo " Deploying $svc"
  echo "============================================================"
  pushd "backend/services/$svc" > /dev/null
  npx serverless deploy --stage "$STAGE"
  popd > /dev/null
}

# 1. auth-service — publishes Cognito IDs and the shared HTTP API ID to SSM
deploy_service "auth-service"

# 2. Seed the JWT authorizer ID into SSM.
#    Serverless Framework manages HTTP API authorizers outside CloudFormation,
#    so their IDs can't be referenced via !Ref. We fetch the ID via AWS CLI.
echo ""
echo "Seeding HTTP API authorizer ID into SSM..."
API_ID=$(aws ssm get-parameter \
  --name "/cloudwave/$STAGE/httpApi/id" \
  --query Parameter.Value --output text)
AUTH_ID=$(aws apigatewayv2 get-authorizers \
  --api-id "$API_ID" \
  --query 'Items[0].AuthorizerId' --output text)
aws ssm put-parameter \
  --name "/cloudwave/$STAGE/httpApi/authorizerId" \
  --value "$AUTH_ID" \
  --type String --overwrite
echo "Authorizer ID $AUTH_ID stored at /cloudwave/$STAGE/httpApi/authorizerId"

# 3. notifications-service — publishes SQS ARN (no HTTP API dependency)
deploy_service "notifications-service"

# 4. files-service — reads HTTP API ID + authorizer ID from SSM
deploy_service "files-service"

# 5. events-service — reads HTTP API ID + authorizer ID from SSM
deploy_service "events-service"

# 6. registrations-service — reads HTTP API ID + authorizer ID + SQS ARN
deploy_service "registrations-service"

echo ""
echo "All services deployed to stage $STAGE."
