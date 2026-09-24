#!/bin/bash
# infra/apply-gcs-security.sh
# Script to apply GCS Lifecycle and CORS policies to the PDF Toolbox Pro bucket
set -e

BUCKET_NAME="${1:-pdf-toolbox-pro-storage}"

echo "=========================================================="
echo "Applying Security Policies to GCS Bucket: gs://$BUCKET_NAME"
echo "=========================================================="

# 1. Apply CORS Policy
echo "[1/2] Applying CORS Configuration..."
if command -v gcloud &> /dev/null; then
    gcloud storage buckets update "gs://$BUCKET_NAME" --cors-file="infra/gcs-cors.json" || gsutil cors set "infra/gcs-cors.json" "gs://$BUCKET_NAME"
else
    gsutil cors set "infra/gcs-cors.json" "gs://$BUCKET_NAME"
fi

# 2. Apply Lifecycle Policy (Auto-Delete after 24 hours / 1 day)
echo "[2/2] Applying 24-hour Auto-Deletion Lifecycle Policy..."
if command -v gcloud &> /dev/null; then
    gcloud storage buckets update "gs://$BUCKET_NAME" --lifecycle-file="infra/gcs-lifecycle.json" || gsutil lifecycle set "infra/gcs-lifecycle.json" "gs://$BUCKET_NAME"
else
    gsutil lifecycle set "infra/gcs-lifecycle.json" "gs://$BUCKET_NAME"
fi

echo "=========================================================="
echo "Done! Bucket gs://$BUCKET_NAME is hardened with 24h retention and restricted CORS."
echo "=========================================================="
