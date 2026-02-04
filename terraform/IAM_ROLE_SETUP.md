# IAM Role Setup for GitHub Actions

This document explains how to set up an IAM role for GitHub Actions using OIDC (OpenID Connect) instead of access keys.

## Overview

Instead of using AWS access keys stored as GitHub secrets, we use OIDC to allow GitHub Actions to assume an IAM role. This is more secure because:
- No long-lived credentials stored in GitHub
- Role assumption is temporary and scoped to specific repositories
- Better audit trail in CloudTrail

## Trust Policy

The trust policy for the IAM role is defined in `terraform/iam-github-role.tf`. Here's the trust policy that allows GitHub Actions to assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:*"
        }
      }
    }
  ]
}
```

### Key Components:

1. **Principal**: The GitHub OIDC provider (must be created in your AWS account)
2. **Action**: `sts:AssumeRoleWithWebIdentity` - allows assuming the role using OIDC tokens
3. **Condition**: 
   - `aud` (audience) must be `sts.amazonaws.com`
   - `sub` (subject) must match your repository pattern `repo:OWNER/REPO:*`

## Setup Steps

### 1. Deploy the IAM Role with Terraform

1. Set the `github_repo` variable in `terraform.tfvars`:
   ```hcl
   github_repo = "your-username/seamflow"
   ```

2. If this is the first time setting up OIDC in your AWS account, set:
   ```hcl
   create_github_oidc_provider = true
   ```
   (If the OIDC provider already exists, set this to `false`)

3. Apply the Terraform configuration:
   ```bash
   cd terraform
   terraform apply
   ```

4. Get the role ARN:
   ```bash
   terraform output -raw github_actions_role_arn
   ```
   Or find it in the AWS Console under IAM > Roles > `seamflow-github-actions-role`

### 2. Configure GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Add a new secret:
   - **Name**: `AWS_ROLE_ARN`
   - **Value**: The ARN from step 1 (e.g., `arn:aws:iam::123456789012:role/seamflow-github-actions-role`)

### 3. Update GitHub Actions Workflow

The workflow file (`.github/workflows/deploy.yml`) has already been updated to use OIDC. It now:
- Requests `id-token: write` permission (required for OIDC)
- Uses `role-to-assume` instead of access keys

### 4. Remove Old Secrets (Optional)

If you previously used `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, you can remove them from GitHub secrets as they're no longer needed.

## Permissions Granted

The IAM role policy grants the following permissions:

- **ECR**: Full access to push/pull images (scoped to your ECR repository)
- **ECS**: Ability to update services and describe task definitions
- **IAM**: Ability to pass the ECS task execution and task roles

## Troubleshooting

### "Not authorized to perform sts:AssumeRoleWithWebIdentity"

- Verify the OIDC provider exists in your AWS account
- Check that the trust policy matches your repository name exactly
- Ensure the GitHub Actions workflow has `id-token: write` permission

### "The request signature we calculated does not match"

- Verify the OIDC provider thumbprints are correct
- The thumbprints may need to be updated if GitHub changes their certificates

### Role assumption fails

- Check CloudTrail logs for detailed error messages
- Verify the repository name in the trust policy matches exactly (case-sensitive)
- Ensure the workflow is running from the correct repository and branch

## Manual Role Creation (Alternative)

If you prefer to create the role manually in the AWS Console:

1. **Create OIDC Provider** (if it doesn't exist):
   - Go to IAM > Identity providers
   - Add provider > OpenID Connect
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - Thumbprints: `6938fd4d98bab03faadb97b34396831e3780aea1`, `1c58a3a8518e8759bf075b76b750d4f2df264fcd`

2. **Create IAM Role**:
   - Use the trust policy shown above
   - Replace `ACCOUNT_ID` with your AWS account ID
   - Replace `OWNER/REPO` with your GitHub repository

3. **Attach Permissions**:
   - Use the policy from `iam-github-role.tf` or create a custom policy with ECR and ECS permissions

## Security Best Practices

- The trust policy restricts role assumption to your specific repository
- You can further restrict by branch or environment using additional conditions
- The role has least-privilege permissions (only what's needed for deployment)
- All role assumptions are logged in CloudTrail
