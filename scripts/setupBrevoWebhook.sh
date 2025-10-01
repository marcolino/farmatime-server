#!/usr/bin/env bash
#
# Script to setup Brevo Webhook (idempotent)

set -euo pipefail

# ------------------------------
# Configuration
# ------------------------------
WEBHOOK_URL="https://farmaperte-prod.fly.dev/webhook/brevo"
BREVO_WEBHOOKS="https://api.brevo.com/v3/webhooks"
BREVO_EMAIL_API_KEY=$(grep BREVO_EMAIL_API_KEY .env | cut -f2 -d=)
BREVO_WEBHOOK_SECRET=$(grep BREVO_WEBHOOK_SECRET .env | cut -f2 -d=)
EVENTS='["delivered","opened","click","hardBounce","softBounce","blocked","spam","error"]'

# ------------------------------
# 1️⃣ Find existing webhook for target URL only
# ------------------------------
EXISTING_ID=$(curl --silent --location "$BREVO_WEBHOOKS" \
  --header "api-key: $BREVO_EMAIL_API_KEY" | \
  grep -oP '"url":"'"$WEBHOOK_URL"'".*?"id":\K\d+' || true)

if [ -n "$EXISTING_ID" ]; then
  echo "Deleting existing webhook ID: $EXISTING_ID"
  curl --location --request DELETE "$BREVO_WEBHOOKS/$EXISTING_ID" \
       --header "api-key: $BREVO_EMAIL_API_KEY" --silent
fi

# ------------------------------
# 2️⃣ Create new webhook
# ------------------------------
echo "Creating new webhook..."
NEW_ID=$(curl --silent --location "$BREVO_WEBHOOKS" \
  --header "Content-Type: application/json" \
  --header "api-key: $BREVO_EMAIL_API_KEY" \
  --data @- <<EOF | grep -oP '"id":\s*\d+' | grep -oP '\d+'
{
  "description": "Setup webhook for transactional events",
  "url": "$WEBHOOK_URL",
  "events": $EVENTS,
  "type": "transactional",
  "headers": [
    {
      "key": "x-webhook-secret",
      "value": "$BREVO_WEBHOOK_SECRET"
    }
  ]
}
EOF
)

echo "Webhook created with ID: $NEW_ID"
