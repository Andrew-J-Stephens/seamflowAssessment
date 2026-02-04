#!/bin/bash
# Script to remove old RDS resources from Terraform state
# This allows Terraform to create fresh resources without conflicts

set -e

cd "$(dirname "$0")/../terraform"

echo "Removing old RDS resources from Terraform state..."
echo ""

# Remove old RDS instance if it exists in state
if terraform state list | grep -q "aws_db_instance.main"; then
    echo "Removing old RDS instance from state..."
    terraform state rm aws_db_instance.main || echo "RDS instance not in state or already removed"
else
    echo "RDS instance not found in state"
fi

# Remove old DB subnet group if it exists in state
if terraform state list | grep -q "aws_db_subnet_group.main"; then
    echo "Removing old DB subnet group from state..."
    terraform state rm aws_db_subnet_group.main || echo "DB subnet group not in state or already removed"
else
    echo "DB subnet group not found in state"
fi

echo ""
echo "Cleanup complete! You can now run 'terraform apply' to create fresh resources."
echo ""
echo "The new RDS instance will be created with:"
echo "  - Identifier: seamflow-db-public"
echo "  - Subnet Group: seamflow-db-subnet-group-public (using public subnets)"
echo "  - Publicly accessible: true"
