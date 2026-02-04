# Bootstrap Guide - Initial Infrastructure Setup

## Problem

There's a chicken-and-egg problem: Terraform needs to create the GitHub Actions IAM role, but GitHub Actions needs IAM permissions to create IAM roles. The initial infrastructure must be created with admin credentials first.

## Solution: Two-Phase Deployment

### Phase 1: Initial Setup (Run Locally with Admin Credentials)

You need to create the initial infrastructure **once** using your local AWS credentials with admin permissions.

#### Step 1: Configure AWS Credentials Locally

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

#### Step 2: Create Initial Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Apply (this creates everything including the GitHub Actions role)
terraform apply
```

This will create:
- VPC and networking
- ECR repository
- ECS cluster and service
- **GitHub Actions IAM role** (this is the key!)
- All other infrastructure

#### Step 3: Get the GitHub Actions Role ARN

```bash
terraform output github_actions_role_arn
```

#### Step 4: Add Role ARN to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add a new secret:
   - **Name**: `AWS_ROLE_ARN`
   - **Value**: The ARN from step 3 (e.g., `arn:aws:iam::123456789012:role/seamflow-github-actions-role`)

### Phase 2: Automated Deployments (GitHub Actions)

After Phase 1 is complete, all subsequent deployments will be handled automatically by GitHub Actions when you push to `main`.

## Alternative: Skip GitHub Actions Role Creation

If you want to use an existing IAM role or create it manually:

1. Set `create_github_oidc_provider = false` in `terraform.tfvars` if the OIDC provider already exists
2. Comment out or remove the `aws_iam_role.github_actions` resource in `iam-github-role.tf`
3. Use your existing role ARN in GitHub secrets

## Handling Existing Resources

### ECR Repository Already Exists

If the ECR repository already exists, you can import it:

```bash
terraform import aws_ecr_repository.app seamflow
```

Or let Terraform skip it (it will show an error but continue with other resources).

### OIDC Provider Already Exists

If the GitHub OIDC provider already exists in your AWS account:

1. Set in `terraform.tfvars`:
   ```hcl
   create_github_oidc_provider = false
   ```

2. Get the provider ARN:
   ```bash
   aws iam list-open-id-connect-providers
   ```

3. Update the trust policy in `iam-github-role.tf` to use the existing provider ARN

## Troubleshooting

### "AccessDenied" errors when running from GitHub Actions

This means the GitHub Actions role doesn't have the necessary permissions. Options:

1. **Run initial setup locally** (recommended) - See Phase 1 above
2. **Manually add permissions** to the existing role in AWS Console
3. **Use a different role** with admin permissions for initial setup

### "RepositoryAlreadyExistsException"

The ECR repository already exists. Options:

1. **Import it:**
   ```bash
   terraform import aws_ecr_repository.app seamflow
   ```

2. **Use a different name:**
   ```hcl
   project_name = "seamflow-new"
   ```

3. **Delete the existing repository** (if it's safe to do so)

### "Cluster not found" in GitHub Actions

This means the infrastructure hasn't been created yet. Run Phase 1 (initial setup) first.

## Quick Start Checklist

- [ ] AWS CLI configured locally with admin credentials
- [ ] Terraform installed locally
- [ ] `terraform.tfvars` created and configured
- [ ] Run `terraform apply` locally to create initial infrastructure
- [ ] Get GitHub Actions role ARN: `terraform output github_actions_role_arn`
- [ ] Add `AWS_ROLE_ARN` secret to GitHub repository
- [ ] Push to `main` branch - GitHub Actions will handle deployments

## After Bootstrap

Once the initial infrastructure is created:

1. **All future deployments** are automated via GitHub Actions
2. **No need for local admin credentials** - GitHub Actions uses the IAM role
3. **Terraform state** should be stored remotely (S3 backend) for team collaboration

## Remote State Setup (Optional but Recommended)

For production, configure remote state:

```hcl
# terraform/backend.tf
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "seamflow/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

Then run `terraform init -migrate-state` to migrate from local to remote state.
