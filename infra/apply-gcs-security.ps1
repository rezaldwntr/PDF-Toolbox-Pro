# infra/apply-gcs-security.ps1
# Script to apply GCS Lifecycle and CORS policies to the PDF Toolbox Pro bucket
param(
    [string]$BucketName = "pdf-toolbox-pro-storage"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Applying Security Policies to GCS Bucket: gs://$BucketName" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Apply CORS Policy
Write-Host "[1/2] Applying CORS Configuration..." -ForegroundColor Yellow
gcloud storage buckets update "gs://$BucketName" --cors-file="infra/gcs-cors.json"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ GCS CORS policy successfully applied." -ForegroundColor Green
} else {
    Write-Host "Fallback to gsutil..." -ForegroundColor Yellow
    gsutil cors set "infra/gcs-cors.json" "gs://$BucketName"
}

# 2. Apply Lifecycle Policy (Auto-Delete after 24 hours / 1 day)
Write-Host "[2/2] Applying 24-hour Auto-Deletion Lifecycle Policy..." -ForegroundColor Yellow
gcloud storage buckets update "gs://$BucketName" --lifecycle-file="infra/gcs-lifecycle.json"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ GCS Lifecycle policy successfully applied." -ForegroundColor Green
} else {
    Write-Host "Fallback to gsutil..." -ForegroundColor Yellow
    gsutil lifecycle set "infra/gcs-lifecycle.json" "gs://$BucketName"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Done! Bucket gs://$BucketName is hardened with 24h retention and restricted CORS." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
