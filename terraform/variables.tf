variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "seamflow"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "task_cpu" {
  description = "CPU units for ECS task (256, 512, 1024, etc.)"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Memory for ECS task in MB (512, 1024, 2048, etc.)"
  type        = number
  default     = 512
}

variable "desired_task_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "ec2_instance_type" {
  description = "EC2 instance type for ECS cluster (using EC2 instead of Fargate for cost savings)"
  type        = string
  default     = "t3.micro"  # Smallest, cheapest instance type
}

variable "ec2_instance_count" {
  description = "Number of EC2 instances in the ECS cluster"
  type        = number
  default     = 1  # Single instance for minimal cost
}

variable "use_spot_instances" {
  description = "Use Spot Instances for additional cost savings (up to 90% cheaper, but can be interrupted)"
  type        = bool
  default     = false  # Set to true for maximum savings if interruptions are acceptable
}

variable "github_repo" {
  description = "GitHub repository in format 'owner/repo' (e.g., 'username/seamflow')"
  type        = string
  default     = ""
}

variable "docker_image_tag" {
  description = "Docker image tag to deploy (default: latest)"
  type        = string
  default     = "latest"
}

variable "create_nat_gateway" {
  description = "Whether to create a NAT Gateway (set to true if you need internet access from private subnets and have available Elastic IPs)"
  type        = bool
  default     = false
}

variable "existing_nat_eip_allocation_id" {
  description = "Allocation ID of an existing Elastic IP to use for NAT Gateway (optional, leave empty to create new EIP)"
  type        = string
  default     = ""
}

# RDS Database Variables
variable "db_engine_version" {
  description = "PostgreSQL engine version (common available versions: 15.2, 15.3, 14.9, 14.10)"
  type        = string
  default     = "15.2"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"  # ARM-based, cheaper than t3.micro
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 10  # Reduced from 20GB to minimize storage costs
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "seamflow"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database master password (REQUIRED - set via GitHub Secret DB_PASSWORD for CI/CD, or terraform.tfvars/TF_VAR_db_password for local)"
  type        = string
  sensitive   = true
  # No default - must be provided
}

variable "openai_key" {
  description = "OpenAI API key (REQUIRED - set via GitHub Secret OPENAI_KEY for CI/CD, or terraform.tfvars/TF_VAR_openai_key for local)"
  type        = string
  sensitive   = true
  default     = ""
}
