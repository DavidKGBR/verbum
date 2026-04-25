#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Build + push + deploy the Verbum API to Cloud Run.
#
# Prerequisites:
#   - setup-gcp.sh has been run once
#   - Both secrets (GEMINI_API_KEY, ABIBLIA_DIGITAL_TOKEN) populated with versions
#   - data/analytics/bible.duckdb is up to date (~270 MB)
#   - data/audio/ contains the MP3 corpus (~119 MB)
#
# What it does:
#   1. Builds the `api` Docker stage via Cloud Build (no local Docker needed)
#   2. Pushes to Artifact Registry
#   3. Deploys to Cloud Run with the runtime service account + secrets
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-verbum-app-bible}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="verbum-api"
REPO_NAME="verbum-images"
SA_EMAIL="verbum-api-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

gcloud config set project "$PROJECT_ID"

# ─── 1. Build + push via Cloud Build ─────────────────────────────────────────
echo "==> Building image via Cloud Build (target: api stage)..."
echo "==> Image: $IMAGE_URI"

# We build only the `api` stage to skip the dashboard/production-etl baggage.
# Cloud Build reads .dockerignore so the upload stays under ~400 MB.
gcloud builds submit \
    --tag "$IMAGE_URI" \
    --machine-type=e2-highcpu-8 \
    --timeout=20m \
    .

# ─── 2. Deploy to Cloud Run ──────────────────────────────────────────────────
echo "==> Deploying to Cloud Run service $SERVICE_NAME..."

# Build the secrets list. SENTRY_DSN is optional — only mount it if the secret
# exists; otherwise the backend just runs without Sentry telemetry.
SECRETS="GEMINI_API_KEY=GEMINI_API_KEY:latest,ABIBLIA_DIGITAL_TOKEN=ABIBLIA_DIGITAL_TOKEN:latest"
if gcloud secrets describe SENTRY_DSN >/dev/null 2>&1; then
    echo "==> SENTRY_DSN secret found, mounting it."
    SECRETS="$SECRETS,SENTRY_DSN=SENTRY_DSN:latest"
else
    echo "==> SENTRY_DSN secret not found, skipping (backend will run without telemetry)."
fi

gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE_URI" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --service-account="$SA_EMAIL" \
    --set-secrets="$SECRETS" \
    --memory=1Gi \
    --cpu=1 \
    --concurrency=40 \
    --timeout=60 \
    --min-instances=0 \
    --max-instances=3 \
    --port=8080

# ─── 3. Smoke test ───────────────────────────────────────────────────────────
URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
echo
echo "==> Deployed: $URL"
echo "==> Smoke test:"
echo "    curl ${URL}/health"
echo "    curl '${URL}/api/v1/books?translation_id=kjv' | head -c 200"
