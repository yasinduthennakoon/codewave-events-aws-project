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

# 2. Ensure the JWT authorizer exists and seed its ID into SSM.
#    Serverless Framework manages HTTP API authorizers outside CloudFormation,
#    so their IDs can't be referenced via !Ref. We create (or find) the
#    authorizer via AWS CLI and store the ID so other services can use it.
echo ""
echo "Ensuring JWT authorizer exists and seeding ID into SSM..."
REGION="ap-southeast-1"
API_ID=$(aws ssm get-parameter \
  --name "/cloudwave/$STAGE/httpApi/id" \
  --query Parameter.Value --output text)

AUTH_ID=$(aws apigatewayv2 get-authorizers \
  --api-id "$API_ID" \
  --query 'Items[?Name==`cognitoAuthorizer`].AuthorizerId | [0]' \
  --output text)

if [ "$AUTH_ID" = "None" ] || [ -z "$AUTH_ID" ]; then
  echo "No authorizer found — creating cognitoAuthorizer..."
  USER_POOL_ID=$(aws ssm get-parameter \
    --name "/cloudwave/$STAGE/cognito/userPoolId" \
    --query Parameter.Value --output text)
  CLIENT_ID=$(aws ssm get-parameter \
    --name "/cloudwave/$STAGE/cognito/clientId" \
    --query Parameter.Value --output text)
  AUTH_ID=$(aws apigatewayv2 create-authorizer \
    --api-id "$API_ID" \
    --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --name cognitoAuthorizer \
    --jwt-configuration "{\"Audience\":[\"$CLIENT_ID\"],\"Issuer\":\"https://cognito-idp.$REGION.amazonaws.com/$USER_POOL_ID\"}" \
    --query AuthorizerId --output text)
  echo "Created authorizer: $AUTH_ID"
else
  echo "Found existing authorizer: $AUTH_ID"
fi

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
