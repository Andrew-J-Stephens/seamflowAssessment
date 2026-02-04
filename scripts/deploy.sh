#!/bin/bash

# Deployment script for Seamflow application
# This script helps deploy the application to AWS ECS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Seamflow Deployment Script${NC}"
echo "================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS region (default to us-east-1)
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME=${PROJECT_NAME:-seamflow}

echo -e "${YELLOW}Step 1: Deploying infrastructure with Terraform...${NC}"
cd terraform

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}terraform.tfvars not found. Creating from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${YELLOW}Please edit terraform.tfvars with your values, then run this script again.${NC}"
    exit 1
fi

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
fi

# Plan and apply
echo "Planning Terraform deployment..."
terraform plan -out=tfplan

echo -e "${YELLOW}Review the plan above. Continue with deployment? (y/n)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo "Applying Terraform configuration..."
terraform apply tfplan
rm -f tfplan

# Get ECR repository URL
ECR_REPO=$(terraform output -raw ecr_repository_url)
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
SERVICE_NAME=$(terraform output -raw ecs_service_name)

cd ..

echo -e "${GREEN}Infrastructure deployed successfully!${NC}"
echo ""

echo -e "${YELLOW}Step 2: Building and pushing Docker image...${NC}"

# Get AWS account ID and region for ECR login
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

echo "Building Docker image..."
docker build -t $PROJECT_NAME:latest .

echo "Tagging image..."
docker tag $PROJECT_NAME:latest $ECR_REPO:latest

echo "Pushing image to ECR..."
docker push $ECR_REPO:latest

echo -e "${GREEN}Docker image pushed successfully!${NC}"
echo ""

echo -e "${YELLOW}Step 3: Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION \
    --query 'service.serviceName' \
    --output text

echo -e "${GREEN}ECS service update initiated!${NC}"
echo ""

# Get ALB DNS name
ALB_DNS=$(cd terraform && terraform output -raw alb_dns_name)
cd ..

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Your application will be available at:"
echo -e "${GREEN}http://$ALB_DNS${NC}"
echo ""
echo "Note: It may take a few minutes for the service to become healthy."
echo "You can check the status with:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
