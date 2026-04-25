# =============================================================================
# Bootstrap Workload Identity Federation for GitHub Actions deploy.
#
# Idempotent — re-run is safe. Creates:
#   - workload identity pool "github"
#   - OIDC provider "github-provider" restricted to DavidKGBR/verbum
#   - service account verbum-github-deploy with Cloud Run / Build / AR roles
#   - the binding that lets the GitHub repo impersonate the SA
# =============================================================================

$ErrorActionPreference = 'Stop'

$ProjectId = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { 'verbum-app-bible' }
$Repo      = if ($env:GH_REPO)        { $env:GH_REPO }        else { 'DavidKGBR/verbum' }
$PoolName  = 'github'
$Provider  = 'github-provider'
$SaName    = 'verbum-github-deploy'
$SaEmail   = "$SaName@$ProjectId.iam.gserviceaccount.com"

Write-Host "==> Project: $ProjectId"
Write-Host "==> Repo:    $Repo"

gcloud config set project $ProjectId | Out-Null

function Test-GcloudResource {
    param([scriptblock]$Cmd)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $null = & $Cmd 2>&1
        return $LASTEXITCODE -eq 0
    } catch { return $false } finally { $ErrorActionPreference = $prev }
}

# --- Enable APIs -----------------------------------------------------------
Write-Host "==> Enabling iam + iamcredentials APIs..."
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

# --- Workload Identity Pool ------------------------------------------------
$poolExists = Test-GcloudResource { gcloud iam workload-identity-pools describe $PoolName --location=global }
if (-not $poolExists) {
    Write-Host "==> Creating workload identity pool $PoolName..."
    gcloud iam workload-identity-pools create $PoolName --location=global --display-name='GitHub Actions'
} else {
    Write-Host "==> Pool $PoolName already exists, skipping."
}

# --- OIDC Provider --------------------------------------------------------
$provExists = Test-GcloudResource { gcloud iam workload-identity-pools providers describe $Provider --location=global --workload-identity-pool=$PoolName }
if (-not $provExists) {
    Write-Host "==> Creating OIDC provider $Provider (restricted to repo $Repo)..."
    gcloud iam workload-identity-pools providers create-oidc $Provider `
        --location=global `
        --workload-identity-pool=$PoolName `
        --issuer-uri='https://token.actions.githubusercontent.com' `
        --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' `
        --attribute-condition="assertion.repository=='$Repo'"
} else {
    Write-Host "==> Provider $Provider already exists, skipping."
}

# --- Service Account ------------------------------------------------------
$saExists = Test-GcloudResource { gcloud iam service-accounts describe $SaEmail }
if (-not $saExists) {
    Write-Host "==> Creating service account $SaName..."
    gcloud iam service-accounts create $SaName --display-name='GitHub Actions deploy'
} else {
    Write-Host "==> Service account $SaName already exists, skipping."
}

# --- Roles ---------------------------------------------------------------
Write-Host "==> Granting deploy roles to $SaEmail..."
foreach ($role in @(
    'roles/run.admin',
    'roles/iam.serviceAccountUser',
    'roles/cloudbuild.builds.editor',
    'roles/artifactregistry.writer',
    'roles/storage.objectViewer',
    'roles/logging.logWriter'
)) {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$SaEmail" `
        --role=$role `
        --condition=None `
        --quiet | Out-Null
}

# --- Allow GitHub repo to impersonate the SA -----------------------------
$ProjNum = gcloud projects describe $ProjectId --format='value(projectNumber)'
$Member  = "principalSet://iam.googleapis.com/projects/$ProjNum/locations/global/workloadIdentityPools/$PoolName/attribute.repository/$Repo"
Write-Host "==> Binding $Repo -> $SaEmail (workloadIdentityUser)..."
gcloud iam service-accounts add-iam-policy-binding $SaEmail `
    --role='roles/iam.workloadIdentityUser' `
    --member=$Member `
    --quiet | Out-Null

$WifProvider = "projects/$ProjNum/locations/global/workloadIdentityPools/$PoolName/providers/$Provider"

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
Write-Host ""
Write-Host "Next: set the following GitHub secrets in ${Repo}:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  gh secret set GCP_WIF_PROVIDER --body '$WifProvider'"
Write-Host "  gh secret set FIREBASE_SERVICE_ACCOUNT < firebase-sa.json"
Write-Host "  gh secret set VITE_SENTRY_DSN --body 'https://...@sentry.io/...'"
Write-Host "  gh secret set VITE_GA4_MEASUREMENT_ID --body 'G-KM0HVG2QJY'"
Write-Host ""
Write-Host "FIREBASE_SERVICE_ACCOUNT: create a SA in this project with role"
Write-Host "  'Firebase Hosting Admin', generate a JSON key, then upload via gh secret set."
