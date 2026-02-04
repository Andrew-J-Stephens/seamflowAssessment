# Deployment Guide

## Overview

The deployment process is now handled entirely through Terraform. GitHub Actions builds and pushes Docker images to ECR, and Terraform manages the ECS deployment.

## Deployment Flow

1. **GitHub Actions** builds and pushes Docker image to ECR
2. **Terraform** deploys the image to ECS by updating the task definition

## How It Works

### 1. Build and Push (GitHub Actions)

When you push to the `main` branch, GitHub Actions will:
- Build the Docker image
- Push it to ECR with the `latest` tag

### 2. Deploy to ECS (Terraform)

After the image is pushed, deploy using Terraform:

```bash
cd terraform
terraform apply
```

Terraform will:
- Update the ECS task definition with the new image
- Update the ECS service to use the new task definition
- ECS automatically deploys the new tasks

## Configuration

### Docker Image Tag

The Docker image tag is controlled by the `docker_image_tag` variable in Terraform:

**In `terraform.tfvars`:**
```hcl
docker_image_tag = "latest"
```

**Or via command line:**
```bash
terraform apply -var="docker_image_tag=latest"
```

### Using Specific Tags

If you want to deploy a specific version instead of `latest`:

1. Tag your image in GitHub Actions:
   ```yaml
   IMAGE_TAG: ${{ github.sha }}  # Use commit SHA as tag
   ```

2. Update Terraform variable:
   ```bash
   terraform apply -var="docker_image_tag=abc123def456"
   ```

## Deployment Process

### Initial Deployment

1. **Deploy Infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Build and Push Image:**
   - Push to `main` branch (triggers GitHub Actions)
   - Or manually:
     ```bash
     aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ECR_URL>
     docker build -t <ECR_URL>:latest .
     docker push <ECR_URL>:latest
     ```

3. **Deploy to ECS:**
   ```bash
   cd terraform
   terraform apply
   ```

### Updating Application

1. **Push code changes** to `main` branch
   - GitHub Actions automatically builds and pushes new image

2. **Deploy with Terraform:**
   ```bash
   cd terraform
   terraform apply
   ```

   Terraform detects the image change and updates ECS automatically.

## How Terraform Detects Changes

When `docker_image_tag` changes (or when you run `terraform apply` after a new image is pushed):

1. Terraform updates the ECS task definition with the new image reference
2. The task definition gets a new revision
3. Terraform updates the ECS service to use the new task definition
4. ECS automatically starts a new deployment with the new image

## Benefits

- **Infrastructure as Code**: All deployment is managed through Terraform
- **Version Control**: Image tags and deployments are tracked in Terraform state
- **Rollback**: Easy to rollback by changing the `docker_image_tag` variable
- **Consistency**: Same process for all environments

## Troubleshooting

### Image not updating?

1. Check that the image was pushed to ECR:
   ```bash
   aws ecr describe-images --repository-name seamflow --region us-east-1
   ```

2. Verify the tag in Terraform:
   ```bash
   terraform show | grep docker_image_tag
   ```

3. Force Terraform to see the change:
   ```bash
   terraform apply -refresh=true
   ```

### Service not deploying?

1. Check ECS service status:
   ```bash
   aws ecs describe-services --cluster seamflow-cluster --services seamflow-service --region us-east-1
   ```

2. Check task definition:
   ```bash
   aws ecs describe-task-definition --task-definition seamflow-task --region us-east-1
   ```

3. View CloudWatch logs:
   ```bash
   aws logs tail /ecs/seamflow --follow --region us-east-1
   ```
