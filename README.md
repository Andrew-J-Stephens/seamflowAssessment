# Seamflow Project

A Node.js/React TypeScript application deployed on AWS ECS with Application Load Balancer.

## Project Structure

```
.
├── src/
│   ├── server.ts          # Express server
│   └── client/            # React application
│       ├── App.tsx        # Main React component
│       ├── index.tsx      # React entry point
│       ├── index.html     # HTML template
│       └── styles.css     # Styles
├── terraform/             # Terraform infrastructure code
│   ├── main.tf           # Main infrastructure resources
│   ├── variables.tf      # Variable definitions
│   └── outputs.tf        # Output values
├── Dockerfile            # Docker configuration
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
└── webpack.config.js     # Webpack configuration

```

## Prerequisites

- Node.js 18+ and npm
- Docker
- Terraform >= 1.0
- AWS CLI configured with your credentials
- AWS account with appropriate permissions

## Local Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

This will start both the Express server and React development server with hot reloading.

### Build for Production

```bash
npm run build
```

### Run Production Build Locally

```bash
npm start
```

## Docker

### Build Docker Image

```bash
docker build -t seamflow-app .
```

### Run Docker Container

```bash
docker run -p 3000:3000 seamflow-app
```

Visit `http://localhost:3000` to see the application.

## AWS Deployment with Terraform

### Prerequisites

1. AWS CLI configured:
   ```bash
   aws configure
   ```

2. Create `terraform/terraform.tfvars` from the example:
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```

3. Edit `terraform/terraform.tfvars` with your desired values.

### Deploy Infrastructure

1. Navigate to the terraform directory:
   ```bash
   cd terraform
   ```

2. Initialize Terraform:
   ```bash
   terraform init
   ```

3. Review the deployment plan:
   ```bash
   terraform plan
   ```

4. Apply the infrastructure:
   ```bash
   terraform apply
   ```

This will create:
- VPC with public and private subnets
- Application Load Balancer
- ECS Cluster and Service
- ECR Repository
- All necessary security groups, IAM roles, and networking components

### Build and Push Docker Image to ECR

After the infrastructure is deployed, get your ECR repository URL:

```bash
terraform output ecr_repository_url
```

Then authenticate and push your image:

```bash
# Get ECR login command
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ECR_REPOSITORY_URL>

# Build and tag the image
docker build -t seamflow-app .
docker tag seamflow-app:latest <ECR_REPOSITORY_URL>:latest

# Push the image
docker push <ECR_REPOSITORY_URL>:latest
```

### Update ECS Service

After pushing the image, update the ECS service to use the new image:

```bash
aws ecs update-service --cluster seamflow-cluster --service seamflow-service --force-new-deployment --region us-east-1
```

### Get Application URL

After deployment, get the load balancer DNS name:

```bash
terraform output alb_dns_name
```

Visit the URL in your browser to see the application.

## GitHub Actions CI/CD (Optional)

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that can automatically build and deploy when you push to the main branch.

To use it:

1. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. Push to the main branch to trigger the deployment.

## Infrastructure Details

The Terraform configuration creates:

1. **VPC**: Virtual Private Cloud with CIDR 10.0.0.0/16
2. **Subnets**: 
   - 2 public subnets (for ALB)
   - 2 private subnets (for ECS tasks)
3. **Internet Gateway**: For public internet access
4. **NAT Gateways**: For private subnet internet access
5. **Application Load Balancer**: Distributes traffic to ECS tasks
6. **ECS Cluster**: Container orchestration
7. **ECS Service**: Manages the running tasks
8. **ECR Repository**: Stores Docker images
9. **Security Groups**: Controls network traffic
10. **IAM Roles**: Permissions for ECS tasks

## Cleanup

To destroy all AWS resources:

```bash
cd terraform
terraform destroy
```

**Warning**: This will delete all resources created by Terraform. Make sure you want to do this!

## License

ISC
