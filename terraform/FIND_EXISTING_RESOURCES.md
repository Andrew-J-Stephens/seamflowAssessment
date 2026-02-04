# Finding Existing Resource Names

If Terraform can't find your existing resources, you need to find their actual names/IDs.

## Find Load Balancer Name

```bash
# List all load balancers
aws elbv2 describe-load-balancers --region us-east-1 --query 'LoadBalancers[*].[LoadBalancerName,LoadBalancerArn]' --output table

# Or get just the names
aws elbv2 describe-load-balancers --region us-east-1 --query 'LoadBalancers[*].LoadBalancerName' --output text
```

## Find Target Group Name

```bash
# List all target groups
aws elbv2 describe-target-groups --region us-east-1 --query 'TargetGroups[*].[TargetGroupName,TargetGroupArn]' --output table

# Or get just the names
aws elbv2 describe-target-groups --region us-east-1 --query 'TargetGroups[*].TargetGroupName' --output text
```

## Find IAM Roles

```bash
# List IAM roles
aws iam list-roles --query 'Roles[*].RoleName' --output text | grep seamflow
```

## Find CloudWatch Log Group

```bash
# List log groups
aws logs describe-log-groups --region us-east-1 --query 'logGroups[*].logGroupName' --output text | grep seamflow
```

## Find ECR Repository

```bash
# List ECR repositories
aws ecr describe-repositories --region us-east-1 --query 'repositories[*].repositoryName' --output text
```

## Update Terraform Variables

Once you find the actual names, you can either:

1. **Update `project_name` variable** to match your existing resources
2. **Add specific variables** for each resource name
3. **Use ARN/ID instead of name** for data sources (if supported)

## Alternative: Use ARN or Tags

Some data sources support looking up by ARN or tags instead of name. Check the Terraform AWS provider documentation for alternatives.
