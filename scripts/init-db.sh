#!/bin/bash
# Database initialization script
# This script runs the SQL initialization script against the RDS database
#
# NOTE: This script requires network access to the RDS instance.
# If RDS is in private subnets, you may need to:
# 1. Run this from within the VPC (e.g., via a bastion host or ECS task)
# 2. Temporarily make RDS publicly accessible (not recommended for production)
# 3. Use AWS Systems Manager Session Manager
#
# Alternatively, the application will auto-initialize the database on startup
# if the tables don't exist.

set -e

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "Error: Required database environment variables are not set"
    echo "Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

# Set default port if not provided
DB_PORT=${DB_PORT:-5432}

echo "Initializing database..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"

# Run the SQL script using psql
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/init-db.sql"

echo "Database initialization completed successfully!"
