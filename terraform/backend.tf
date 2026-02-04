terraform {
  backend "s3" {
    # Simple S3 backend - no DynamoDB locking
    # Configure via command line:
    # terraform init -backend-config="bucket=your-bucket" \
    #                -backend-config="key=seamflow/terraform.tfstate" \
    #                -backend-config="region=us-east-1" \
    #                -backend-config="encrypt=true"
  }
}
