# Quick Start Guide

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Test locally:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

## AWS Deployment

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform installed
- Docker installed

### Step 1: Configure Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your preferred values
```

### Step 2: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Step 3: Build and Push Docker Image

After infrastructure is deployed, get your ECR repository URL:

```bash
terraform output ecr_repository_url
```

Then authenticate and push:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ECR_REPO_URL>

# Build and push
docker build -t seamflow-app .
docker tag seamflow-app:latest <ECR_REPO_URL>:latest
docker push <ECR_REPO_URL>:latest
```

### Step 4: Update ECS Service

```bash
aws ecs update-service --cluster seamflow-cluster --service seamflow-service --force-new-deployment --region us-east-1
```

### Step 5: Get Your Application URL

```bash
terraform output alb_dns_name
```

Visit the URL in your browser!

## Using the Deployment Script

For automated deployment, use the provided script:

```bash
./scripts/deploy.sh
```

This script will:
1. Deploy infrastructure with Terraform
2. Build and push Docker image to ECR
3. Update the ECS service

## Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

Then create a new repository on GitHub and push:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```
