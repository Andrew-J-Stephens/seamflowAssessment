# IAM Trust Policy for GitHub Actions

## Trust Policy JSON

Here is the trust policy that allows GitHub Actions to assume your IAM role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_USERNAME/YOUR_REPO:*"
        }
      }
    }
  ]
}
```

## Key Components Explained

### Principal
- **Federated**: Points to the GitHub OIDC provider in your AWS account
- The OIDC provider must be created first (Terraform handles this automatically)

### Action
- **sts:AssumeRoleWithWebIdentity**: Allows GitHub Actions to assume the role using OIDC tokens instead of access keys

### Conditions

1. **StringEquals - aud (Audience)**
   - Must be exactly `sts.amazonaws.com`
   - This ensures the token is intended for AWS STS

2. **StringLike - sub (Subject)**
   - Pattern: `repo:OWNER/REPO:*`
   - Restricts role assumption to workflows from your specific repository
   - The `:*` allows any branch, tag, or environment
   - Example: `repo:andrewstephens/seamflow:*`

## Additional Condition Examples

You can add more restrictive conditions if needed:

### Restrict to specific branch:
```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
}
```

### Restrict to specific environment:
```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:environment:production"
}
```

### Multiple repositories:
```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": [
    "repo:OWNER/REPO1:*",
    "repo:OWNER/REPO2:*"
  ]
}
```

## Setup Instructions

1. **Deploy with Terraform** (recommended):
   ```bash
   cd terraform
   # Set github_repo in terraform.tfvars
   terraform apply
   terraform output github_actions_role_arn
   ```

2. **Add to GitHub Secrets**:
   - Go to your repository Settings > Secrets and variables > Actions
   - Add secret: `AWS_ROLE_ARN` with the role ARN from step 1

3. **The GitHub Actions workflow is already configured** to use OIDC!

## Security Notes

- The trust policy ensures only your specific repository can assume the role
- No long-lived credentials are stored in GitHub
- All role assumptions are logged in AWS CloudTrail
- The role has least-privilege permissions (only ECR and ECS operations)
