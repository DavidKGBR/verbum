# Verbum infra

Deployment automation for the Verbum API.

**Stack:** Cloud Run (backend) + Artifact Registry (images) + Secret Manager
(API keys). Frontend is deployed separately via Firebase Hosting (Sessão 6).

## One-time bootstrap

Before the very first deploy:

```bash
# 1. Authenticate with GCP and create the project in the Console
#    (Project ID: verbum-app-bible — or override via GCP_PROJECT_ID env var)
gcloud auth login
gcloud config set project verbum-app-bible

# 2. Enable billing on the project (required for Cloud Run)
#    Console → Billing → Link billing account

# 3. Run the bootstrap script
#    macOS/Linux/Git Bash:
bash infra/scripts/setup-gcp.sh
#    Windows PowerShell:
.\infra\scripts\setup-gcp.ps1

# 4. Populate the secrets (the script tells you the exact commands)
#    Bash:
printf 'YOUR_GEMINI_KEY'  | gcloud secrets versions add GEMINI_API_KEY        --data-file=-
printf 'YOUR_ABIBLIA_JWT' | gcloud secrets versions add ABIBLIA_DIGITAL_TOKEN --data-file=-
#    PowerShell:
'YOUR_GEMINI_KEY'  | gcloud secrets versions add GEMINI_API_KEY        --data-file=-
'YOUR_ABIBLIA_JWT' | gcloud secrets versions add ABIBLIA_DIGITAL_TOKEN --data-file=-
```

## Deploy

```bash
# macOS/Linux/Git Bash:
bash infra/scripts/deploy.sh
# Windows PowerShell:
.\infra\scripts\deploy.ps1
```

Builds via Cloud Build (no local Docker needed), pushes to Artifact Registry,
deploys to Cloud Run. Takes ~5-8 min the first time, ~3-4 min on subsequent
deploys (Cloud Build caches layers).

## Configuration knobs

| Setting | Value | Notes |
|---|---|---|
| Memory | 1 GiB | DuckDB 270MB + Python ~150MB + headroom |
| CPU | 1 | Single worker, single core |
| Concurrency | 40 | Requests per instance |
| Min instances | 0 | Scales to zero when idle (free tier friendly) |
| Max instances | 3 | Caps cost spike if viral |
| Timeout | 60s | Per-request |

Tweak in `deploy.sh` before re-running.

## Secret management

Two secrets live in Secret Manager:

| Secret | Used by | How to rotate |
|---|---|---|
| `GEMINI_API_KEY` | `/ai/explain`, `/ai/compare` | `gcloud secrets versions add GEMINI_API_KEY --data-file=-` then redeploy (Cloud Run picks up `:latest`) |
| `ABIBLIA_DIGITAL_TOKEN` | Pipeline only (extract step). NOT used at runtime by the API. | Same pattern. Token is free-tier; rotates only if expires. |

⚠️ **Note on `ABIBLIA_DIGITAL_TOKEN`:** the runtime API doesn't actually call
abibliadigital.com.br — that data is already loaded into the DuckDB file
shipped in the image. The secret is wired up for completeness in case future
endpoints need live extraction; consider removing it from `deploy.sh` if it
stays unused after launch.

## Observability (Sessão 8)

All telemetry is **opt-in**. The app runs identically without it; populate the
secrets / env vars below to start collecting signal.

### Backend — Sentry (errors + traces)

1. Create a free project at [sentry.io](https://sentry.io). Pick "FastAPI"
   when prompted; copy the DSN.
2. Push the DSN as a new secret:
   ```bash
   printf 'https://...@sentry.io/123' | gcloud secrets create SENTRY_DSN --replication-policy=automatic --data-file=-
   gcloud secrets add-iam-policy-binding SENTRY_DSN \
       --member="serviceAccount:verbum-api-runtime@verbum-app-bible.iam.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   ```
3. Re-run `deploy.ps1` / `deploy.sh`. The deploy scripts auto-detect the
   secret and mount it. Backend boot logs `Sentry initialized` once it's live.
4. Verify: `curl https://.../health` should return `"sentry": true`.

PII is intentionally **not** captured (`send_default_pii=False`). Trace
sample rate is 5% — adjust in `src/api/main.py` if you need more.

### Frontend — Sentry + GA4

Vite reads env vars at build time, so set them before `npm run build`:

```bash
# frontend/.env.production (gitignored)
VITE_SENTRY_DSN=https://...@sentry.io/456
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

Then re-run `firebase deploy --only hosting`. Both are no-ops when blank.

GA4 setup: Firebase Console → Project settings → Integrations → Google
Analytics → enable. Copy the Measurement ID (format `G-XXXXXXXXXX`).
The integration auto-creates the GA4 property linked to Firebase Hosting,
so realtime traffic shows up in both consoles.

### Cloud Run uptime check (free)

After the first deploy, in GCP Console:

1. Monitoring → Uptime checks → Create
2. Target: HTTPS, hostname `verbum-api-219759089368.us-central1.run.app`,
   path `/health`, every 5 min from 3 regions
3. Alert: notify on email when 2 of 3 regions fail
4. Free tier: up to 3 endpoints

### What good looks like

- `/health` returns `{"status": "ok", "db_verses_count": 372308, "sentry": true}`
- Sentry dashboard shows release `verbum-api@2.0.0` and `verbum-frontend@2.0.0`
- GA4 Realtime shows your own visit
- Uptime check is green

---

## Cost guardrails

Set up manually in the GCP Console after the first deploy:

1. **Billing → Budgets & alerts:** create a $5/mo budget alert with email at
   50% / 90% / 100% thresholds.
2. **AI Studio (separate console at aistudio.google.com):** under the Gemini
   project, set a daily quota cap on `gemini-2.5-flash-lite`. Recommended:
   1000 requests/day. The in-app rate limiter (20 calls / 10 min per IP,
   `src/api/rate_limit.py`) already caps individual abuse; the daily quota
   protects against distributed/bot attacks.

Worst-case Gemini spend with 1000 req/day cap × `gemini-2.5-flash-lite` pricing
≈ $0.40/day = $12/month. Cloud Run at low traffic is ~$0-3/month. Total
realistic v1 budget: under $15/month.

## What's NOT in this folder yet

- **Terraform** — shell scripts are simpler for a single-service v1. Migrate
  to Terraform if/when there's a second service or shared modules across
  environments (planned for v1.5).
- **GitHub Actions deploy workflow** — Sessão 9 of the launch plan.
- **Firebase Hosting config** — lives in `firebase.json` at repo root,
  configured in Sessão 6.

## Runtime caveats

- **AI cache is ephemeral per Cloud Run instance.** `data/ai_cache/` is
  written to the container's writable layer, lost on instance recycle. For
  v1 this is acceptable: same `(verse_id, lang, style, translation)` tuples
  re-cache fast. Persistent cache → v1.5 (likely GCS-backed).
- **Cold start ~3-5s.** Loading DuckDB into memory takes a moment. Set
  `min-instances=1` in `deploy.sh` if cold starts hurt UX (cost ~$5/month
  extra to keep one instance always warm).
- **Single-instance rate limiter.** `src/api/rate_limit.py` is in-memory;
  with `max-instances=3`, a determined attacker could get 3× the budget.
  Move to Redis/Memorystore if it ever matters.
