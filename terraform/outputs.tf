# ALB outputs removed - ALB was removed for cost savings
# To get ECS task public IP, use AWS CLI:
#   aws ecs list-tasks --cluster <cluster-name> --service-name <service-name>
#   aws ecs describe-tasks --cluster <cluster-name> --tasks <task-id>
#   aws ec2 describe-network-interfaces --network-interface-ids <eni-id>

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = data.aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}

output "rds_endpoint" {
  description = "RDS instance endpoint (hostname)"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for images"
  value       = aws_s3_bucket.images.id
}

output "ec2_instance_public_ip" {
  description = "Public IP of EC2 instance (access app at http://<ip>:3000)"
  value       = "Run: aws ec2 describe-instances --filters 'Name=tag:Name,Values=${var.project_name}-ecs-instance' 'Name=instance-state-name,Values=running' --query 'Reservations[*].Instances[*].PublicIpAddress' --output text"
}

output "ecs_service_instructions" {
  description = "Instructions to access the application"
  value       = "Access the app at http://<ec2-public-ip>:3000. Get the IP using the ec2_instance_public_ip output command."
}
