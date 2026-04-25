# =============================================================================
# One-time GCP bootstrap for Verbum (PowerShell version).
#
# Run once after `gcloud auth login` and after creating the GCP project in
# the Console. This script is idempotent -- re-running won't break anything.
#
# What it does:
#   1. Enables required APIs
#   2. Creates Artifact Registry repo for the API image
#   3. Creates secrets for GEMINI_API_KEY and ABIBLIA_DIGITAL_TOKEN
#   4. Creates the verbum-api-runtime service account and grants it
#      Secret Manager Accessor role
# =============================================================================

$ErrorActionPreference = 'Stop'

# --- Config ------------------------------------------------------------------
$ProjectId = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { 'verbum-app-bible' }
$Region    = if ($env:GCP_REGION)     { $env:GCP_REGION }     else { 'us-central1' }
$RepoName  = 'verbum-images'
$SaName    = 'verbum-api-runtime'
$SaEmail   = "$SaName@$ProjectId.iam.gserviceaccount.com"

Write-Host "==> Project: $ProjectId"
Write-Host "==> Region:  $Region"

gcloud config set project $ProjectId | Out-Null

# Helper: run a gcloud "describe" and return $true if exists, $false if not.
# Uses try/catch + temporary SilentlyContinue because PowerShell 5.1 turns any
# native-command stderr into a terminating error when $ErrorActionPreference
# is 'Stop' -- and a NOT_FOUND from gcloud writes to stderr by design.
function Test-GcloudResource {
    param([scriptblock]$DescribeCmd)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $null = & $DescribeCmd 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $prev
    }
}

# --- 1. Enable APIs ----------------------------------------------------------
Write-Host "==> Enabling APIs (run, artifactregistry, secretmanager, cloudbuild)..."
gcloud services enable `
    run.googleapis.com `
    artifactregistry.googleapis.com `
    secretmanager.googleapis.com `
    cloudbuild.googleapis.com

# --- 2. Artifact Registry repo -----------------------------------------------
$repoExists = Test-GcloudResource { gcloud artifacts repositories describe $RepoName --location=$Region }
if (-not $repoExists) {
    Write-Host "==> Creating Artifact Registry repo $RepoName..."
    gcloud artifacts repositories create $RepoName `
        --repository-format=docker `
        --location=$Region `
        --description='Verbum container images'
} else {
    Write-Host "==> Artifact Registry repo $RepoName already exists, skipping."
}

# --- 3. Secrets --------------------------------------------------------------
function New-SecretIfMissing {
    param([string]$Name)
    $exists = Test-GcloudResource { gcloud secrets describe $Name }
    if ($exists) {
        Write-Host "==> Secret $Name already exists, skipping creation."
    } else {
        Write-Host "==> Creating secret $Name (empty; populate with gcloud secrets versions add)..."
        gcloud secrets create $Name --replication-policy=automatic
    }
}

New-SecretIfMissing -Name 'GEMINI_API_KEY'
New-SecretIfMissing -Name 'ABIBLIA_DIGITAL_TOKEN'

Write-Host ""
Write-Host "==> Now populate the secret values manually:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    'YOUR_GEMINI_KEY'  | gcloud secrets versions add GEMINI_API_KEY        --data-file=-"
Write-Host "    'YOUR_ABIBLIA_JWT' | gcloud secrets versions add ABIBLIA_DIGITAL_TOKEN --data-file=-"
Write-Host ""

# --- 4. Service account ------------------------------------------------------
$saExists = Test-GcloudResource { gcloud iam service-accounts describe $SaEmail }
if (-not $saExists) {
    Write-Host "==> Creating service account $SaName..."
    gcloud iam service-accounts create $SaName --display-name='Verbum API runtime'
} else {
    Write-Host "==> Service account $SaName already exists, skipping creation."
}

Write-Host "==> Granting Secret Manager Accessor on each secret to $SaEmail..."
foreach ($secret in @('GEMINI_API_KEY', 'ABIBLIA_DIGITAL_TOKEN')) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$SaEmail" `
        --role='roles/secretmanager.secretAccessor' `
        --quiet | Out-Null
}

# --- 5. Cloud Build permissions ---------------------------------------------
# Since 2024, `gcloud builds submit` runs as the Compute Engine default SA
# rather than the legacy <project_number>@cloudbuild.gserviceaccount.com.
# That SA does NOT inherit the build-time permissions automatically; we
# have to grant them explicitly or every `gcloud builds submit` 403s on
# the source upload bucket.
$ProjectNumber = gcloud projects describe $ProjectId --format='value(projectNumber)'
$ComputeSa     = "$ProjectNumber-compute@developer.gserviceaccount.com"

Write-Host "==> Granting Cloud Build runtime roles to $ComputeSa..."
foreach ($role in @(
    'roles/storage.objectViewer',     # read the source tarball Cloud Build uploads
    'roles/artifactregistry.writer',  # push the built image to AR
    'roles/logging.logWriter'         # stream build logs
)) {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$ComputeSa" `
        --role=$role `
        --condition=None `
        --quiet | Out-Null
}

Write-Host ""
Write-Host "==> Setup complete." -ForegroundColor Green
Write-Host "==> Next: populate the secrets (above), then run infra\scripts\deploy.ps1"
