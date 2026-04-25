#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-time GCP bootstrap for Verbum.
#
# Run once after `gcloud auth login` and after creating the GCP project in
# the Console. This script is idempotent — re-running won't break anything.
#
# What it does:
#   1. Enables required APIs
#   2. Creates Artifact Registry repo for the API image
#   3. Creates secrets for GEMINI_API_KEY and ABIBLIA_DIGITAL_TOKEN
#   4. Creates the verbum-api-runtime service account and grants it
#      Secret Manager Accessor role
#
# After this you can run deploy.sh.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-verbum-app-bible}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="verbum-images"
SA_NAME="verbum-api-runtime"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Project: $PROJECT_ID"
echo "==> Region:  $REGION"

gcloud config set project "$PROJECT_ID"

# ─── 1. Enable APIs ──────────────────────────────────────────────────────────
echo "==> Enabling APIs (run, artifactregistry, secretmanager, cloudbuild)..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com

# ─── 2. Artifact Registry repo ───────────────────────────────────────────────
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" >/dev/null 2>&1; then
    echo "==> Creating Artifact Registry repo $REPO_NAME..."
    gcloud artifacts repositories create "$REPO_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Verbum container images"
else
    echo "==> Artifact Registry repo $REPO_NAME already exists — skipping."
fi

# ─── 3. Secrets ──────────────────────────────────────────────────────────────
create_secret_if_missing() {
    local name=$1
    if gcloud secrets describe "$name" >/dev/null 2>&1; then
        echo "==> Secret $name already exists — skipping creation."
    else
        echo "==> Creating secret $name (empty — populate with: gcloud secrets versions add)..."
        gcloud secrets create "$name" --replication-policy=automatic
    fi
}

create_secret_if_missing "GEMINI_API_KEY"
create_secret_if_missing "ABIBLIA_DIGITAL_TOKEN"

cat <<EOF

==> Now populate the secret values manually (only the human author sees them):

    printf 'YOUR_GEMINI_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=-
    printf 'YOUR_ABIBLIA_JWT' | gcloud secrets versions add ABIBLIA_DIGITAL_TOKEN --data-file=-

EOF

# ─── 4. Service account ──────────────────────────────────────────────────────
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
    echo "==> Creating service account $SA_NAME..."
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="Verbum API runtime"
else
    echo "==> Service account $SA_NAME already exists — skipping creation."
fi

echo "==> Granting Secret Manager Accessor on each secret to $SA_EMAIL..."
for secret in GEMINI_API_KEY ABIBLIA_DIGITAL_TOKEN; do
    gcloud secrets add-iam-policy-binding "$secret" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet
done

# ─── 5. Cloud Build permissions ──────────────────────────────────────────────
# Since 2024, `gcloud builds submit` runs as the Compute Engine default SA
# rather than the legacy <project_number>@cloudbuild.gserviceaccount.com.
# That SA does NOT inherit the build-time permissions automatically; we
# have to grant them explicitly or every `gcloud builds submit` 403s on
# the source upload bucket.
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "==> Granting Cloud Build runtime roles to $COMPUTE_SA..."
for role in \
    roles/storage.objectViewer \
    roles/artifactregistry.writer \
    roles/logging.logWriter; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${COMPUTE_SA}" \
        --role="$role" \
        --condition=None \
        --quiet >/dev/null
done

echo
echo "==> Setup complete."
echo "==> Next: populate the secrets (above), then run infra/scripts/deploy.sh"
