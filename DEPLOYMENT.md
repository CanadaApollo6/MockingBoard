# MockingBoard Deployment Guide

Deploy the Discord bot to Google Cloud Run with automatic CI/CD.

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- GitHub repository connected to Cloud Build

## One-Time Setup

### 1. Set your project

```bash
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID
```

### 2. Enable required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 3. Create Artifact Registry repository

```bash
gcloud artifacts repositories create mockingboard \
  --repository-format=docker \
  --location=us-central1 \
  --description="MockingBoard Docker images"
```

### 4. Create secrets in Secret Manager

**Discord Token:**

```bash
echo -n "your-discord-bot-token" | \
  gcloud secrets create discord-token --data-file=-
```

**Firebase Service Account Key:**

```bash
# Your firebase-key.json file (the actual JSON, not base64)
gcloud secrets create firebase-key \
  --data-file=firebase-key.json
```

### 5. Grant Cloud Build permissions

Get the Cloud Build service account:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
```

Grant required roles:

```bash
# Deploy to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

# Act as the Cloud Run service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

# Access secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"

# Push to Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"
```

### 6. Grant Cloud Run access to secrets

Get the default Compute service account (used by Cloud Run):

```bash
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding discord-token \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding firebase-key \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### 7. Connect GitHub repo to Cloud Build

Option A - Via Console (easier):

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Connect Repository"
3. Select GitHub, authenticate, select MockingBoard repo
4. Create trigger:
   - Name: `deploy-main`
   - Event: Push to branch
   - Branch: `^main$`
   - Config: Cloud Build configuration file
   - Location: `cloudbuild.yaml`

Option B - Via CLI:

```bash
gcloud builds triggers create github \
  --repo-name=MockingBoard \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --name=deploy-main
```

## Deploy

### Automatic (after setup)

Just push to `main`:

```bash
git push origin main
```

### Manual

```bash
gcloud builds submit --config=cloudbuild.yaml
```

## Verify Deployment

Check the service is running:

```bash
gcloud run services describe mockingboard-bot --region=us-central1
```

View logs:

```bash
gcloud run logs read mockingboard-bot --region=us-central1 --limit=50
```

Stream logs:

```bash
gcloud run logs tail mockingboard-bot --region=us-central1
```

## Rollback

List revisions:

```bash
gcloud run revisions list --service=mockingboard-bot --region=us-central1
```

Rollback to previous revision:

```bash
gcloud run services update-traffic mockingboard-bot \
  --region=us-central1 \
  --to-revisions=REVISION_NAME=100
```

## Cost Estimate

With `min-instances=1` and `max-instances=1`:

- **Cloud Run**: ~$5-10/month (always-on 512MB, 1 vCPU)
- **Artifact Registry**: ~$0.10/GB storage
- **Secret Manager**: Free tier covers this usage
- **Cloud Build**: 120 free minutes/day

Total: **~$5-10/month**

## Troubleshooting

### Bot not responding

Check if the container is running:

```bash
gcloud run services describe mockingboard-bot --region=us-central1 --format='value(status.conditions)'
```

Check for errors in logs:

```bash
gcloud run logs read mockingboard-bot --region=us-central1 --limit=100 | grep -i error
```

### Secret access errors

Verify secrets exist:

```bash
gcloud secrets list
```

Verify Cloud Run service account has access:

```bash
gcloud secrets get-iam-policy discord-token
```

### Build failures

View build logs:

```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```
