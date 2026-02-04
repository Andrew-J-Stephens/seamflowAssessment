# Hot Dog or Not

<div align="center">
  <img src="src/assets/logo.png" alt="Hot Dog or Not Logo" width="200" />
</div>

A production-ready web application that uses AI to classify images as either "Hot Dog" or "Not Hot Dog". Built with React, TypeScript, Express, and OpenAI's Vision API.

## What It Does

This application allows users to upload an image, which is then analyzed by OpenAI's GPT-4 Vision model to determine whether the image contains a hot dog. The result is displayed as either **"Hot Dog"** or **"Not Hot Dog"**.

## How It Works

### OpenAI Vision API Integration

The application uses OpenAI's GPT-4 Vision model (`gpt-4o`) to analyze uploaded images. Here's how the classification process works:

1. **Image Upload**: Users upload an image through a clean, modern web interface
2. **Image Processing**: The server converts the uploaded image to base64 format
3. **AI Analysis**: The image is sent to OpenAI's Vision API with a specific prompt:
   - The model is instructed to look at the image and determine if it contains a hot dog
   - It's asked to respond with ONLY "Hot Dog" or "Not Hot Dog" (no explanations)
4. **Result Normalization**: The response is normalized to ensure it's exactly one of the two expected values
5. **Display**: The result is shown to the user with a timestamp

The OpenAI Vision API is capable of understanding image content and can accurately identify hot dogs in various contexts, lighting conditions, and image qualities.

### Technology Stack

- **Frontend**: React with TypeScript, clean ChatGPT-inspired UI
- **Backend**: Express.js with TypeScript
- **AI**: OpenAI GPT-4 Vision API
- **File Handling**: Multer for image uploads
- **Deployment**: Docker, AWS ECS, Application Load Balancer

## Project Structure

```
.
├── src/
│   ├── server.ts          # Express server with OpenAI Vision API integration
│   └── client/            # React application
│       ├── App.tsx        # Main React component (image upload UI)
│       ├── index.tsx      # React entry point
│       ├── index.html     # HTML template
│       └── styles.css     # Styles (ChatGPT-inspired design)
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
- OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))
- Docker (for containerized deployment)
- Terraform >= 1.0 (for AWS deployment)
- AWS CLI configured with your credentials (for AWS deployment)
- AWS account with appropriate permissions (for AWS deployment)

## Local Development

### Install Dependencies

```bash
npm install
```

### Set Up Environment Variables

Create a `.env` file in the project root:

```bash
OPENAI_KEY=your_openai_api_key_here
```

**Note**: The database connection is optional. If you want to use a database, also add:
```bash
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### Run Development Server

```bash
npm run dev
```

This will start both the Express server and React development server with hot reloading.

Visit `http://localhost:3000` to see the application.

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
docker run -p 3000:3000 -e OPENAI_KEY=your_openai_api_key_here seamflow-app
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
   - `OPENAI_KEY` (for the application to work)

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
