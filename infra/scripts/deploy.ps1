# =============================================================================
# Build + push + deploy the Verbum API to Cloud Run (PowerShell version).
#
# Prerequisites:
#   - setup-gcp.ps1 has been run once
#   - Both secrets (GEMINI_API_KEY, ABIBLIA_DIGITAL_TOKEN) populated
#   - data/analytics/bible.duckdb is up to date (~270 MB)
#   - data/audio/ contains the MP3 corpus (~119 MB)
# =============================================================================

$ErrorActionPreference = 'Stop'

$ProjectId   = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { 'verbum-app-bible' }
$Region      = if ($env:GCP_REGION)     { $env:GCP_REGION }     else { 'us-central1' }
$ServiceName = 'verbum-api'
$RepoName    = 'verbum-images'
$SaEmail     = "verbum-api-runtime@$ProjectId.iam.gserviceaccount.com"
$ImageUri    = "$Region-docker.pkg.dev/$ProjectId/$RepoName/${ServiceName}:latest"

gcloud config set project $ProjectId | Out-Null

# --- 1. Build + push via Cloud Build -----------------------------------------
Write-Host "==> Building image via Cloud Build (target: api stage)..."
Write-Host "==> Image: $ImageUri"

# Cloud Build reads .dockerignore so the upload stays under ~400 MB.
gcloud builds submit `
    --tag $ImageUri `
    --machine-type=e2-highcpu-8 `
    --timeout=20m `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Cloud Build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

# --- 2. Deploy to Cloud Run --------------------------------------------------
Write-Host "==> Deploying to Cloud Run service $ServiceName..."

gcloud run deploy $ServiceName `
    --image=$ImageUri `
    --region=$Region `
    --platform=managed `
    --allow-unauthenticated `
    --service-account=$SaEmail `
    --set-secrets='GEMINI_API_KEY=GEMINI_API_KEY:latest,ABIBLIA_DIGITAL_TOKEN=ABIBLIA_DIGITAL_TOKEN:latest' `
    --memory=1Gi `
    --cpu=1 `
    --concurrency=40 `
    --timeout=60 `
    --min-instances=0 `
    --max-instances=3 `
    --port=8080

if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Cloud Run deploy failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

# --- 3. Smoke test -----------------------------------------------------------
$Url = gcloud run services describe $ServiceName --region=$Region --format='value(status.url)'
Write-Host ""
Write-Host "==> Deployed: $Url" -ForegroundColor Green
Write-Host "==> Smoke test:"
Write-Host "    Invoke-RestMethod $Url/health"
Write-Host "    Invoke-RestMethod ""$Url/api/v1/books?translation_id=kjv"" | Select-Object -First 3"
