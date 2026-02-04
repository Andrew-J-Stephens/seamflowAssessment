# Terraform S3 Backend Setup

## Overview

Terraform state is now configured to use an S3 backend for remote state storage. This allows:
- Shared state across team members
- State locking to prevent concurrent modifications
- State versioning and backup

## Prerequisites

1. **S3 Bucket** for storing Terraform state

## Step 1: Create S3 Bucket

```bash
aws s3 mb s3://your-terraform-state-bucket --region us-east-1

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket your-terraform-state-bucket \
  --versioning-configuration Status=Enabled

# Enable encryption (recommended)
aws s3api put-bucket-encryption \
  --bucket your-terraform-state-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## Step 2: Configure Backend

### Option 1: Using Command Line (Recommended)

```bash
cd terraform
terraform init \
  -backend-config="bucket=your-terraform-state-bucket" \
  -backend-config="key=seamflow/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true"
```

### Option 2: Using backend.hcl file

Create `terraform/backend.hcl`:

```hcl
bucket = "your-terraform-state-bucket"
key    = "seamflow/terraform.tfstate"
region = "us-east-1"
encrypt = true
```

Then initialize:

```bash
cd terraform
terraform init -backend-config=backend.hcl
```

**Important**: Add `backend.hcl` to `.gitignore` to avoid committing it.

## Step 3: Add backend.hcl to .gitignore (if using Option 2)

Add to `.gitignore`:

```
terraform/backend.hcl
terraform/.terraform/
terraform/.terraform.lock.hcl
```

## Important Notes

- **Never commit** `backend.hcl` or state files to version control
- The S3 bucket should have versioning enabled for state recovery
- **Note**: Without DynamoDB locking, avoid running Terraform concurrently from multiple locations
- Each environment (dev, staging, prod) should use a different `key` path

## Backend Configuration in GitHub Actions

For GitHub Actions, you can set backend configuration via environment variables or use a backend config file stored as a GitHub secret.

### Using GitHub Secrets

Add these secrets to your GitHub repository:
- `TF_BACKEND_BUCKET`: Your S3 bucket name
- `TF_BACKEND_KEY`: State file path (e.g., `seamflow/terraform.tfstate`)
- `TF_BACKEND_REGION`: AWS region (e.g., `us-east-1`)

The GitHub Actions workflow is already configured to use these secrets.

## Troubleshooting

### "Error: Failed to get existing workspaces"

- Check that the S3 bucket exists and is accessible
- Verify IAM permissions for the role/user accessing S3

### "State file is locked" (if using DynamoDB)

- Another Terraform operation is running
- Or a previous operation crashed and left a lock
- Check DynamoDB table for stale locks
- Force unlock: `terraform force-unlock <LOCK_ID>`

**Note**: Without DynamoDB, there's no automatic locking. Be careful not to run Terraform concurrently.

### "Access Denied" errors

- Ensure the IAM role/user has permissions:
  - `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on the state bucket
