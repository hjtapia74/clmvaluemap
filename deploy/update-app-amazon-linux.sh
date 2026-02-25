#!/bin/bash

# Deploy script for CLM Survey Application on Amazon Linux EC2
# Run this from your LOCAL machine (Mac) - it handles EICE tunnel + instance resize
#
# Usage: ./deploy/update-app-amazon-linux.sh
#
# What it does:
#   1. Stops the instance
#   2. Resizes to t3.medium (Next.js 15.5.9+ needs >2GB RAM to build)
#   3. Starts the instance and runs: git pull, npm install, build, pm2 restart
#   4. Stops the instance
#   5. Resizes back to t3.small (sufficient for runtime)
#   6. Starts the instance and verifies health

set -e

# ── Configuration ──────────────────────────────────────────────
INSTANCE_ID="i-0e57b74720e155251"
AZ="us-east-1b"
SSH_KEY="$HOME/.ssh/id_ed25519"
BUILD_INSTANCE_TYPE="t3.medium"
RUNTIME_INSTANCE_TYPE="t3.small"
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:540971695762:targetgroup/clm-valuemap-targets/48d0c2487599bec4"
APP_DIR="/var/www/clm-survey"

# ── Helper functions ───────────────────────────────────────────

push_key() {
  aws ec2-instance-connect send-ssh-public-key \
    --instance-id "$INSTANCE_ID" \
    --instance-os-user ec2-user \
    --ssh-public-key "file://$SSH_KEY.pub" \
    --availability-zone "$AZ" > /dev/null
}

remote() {
  # Push ephemeral key and run command on EC2 via EICE tunnel
  push_key
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -i "$SSH_KEY" \
    -o ProxyCommand="aws ec2-instance-connect open-tunnel --instance-id $INSTANCE_ID" \
    "ec2-user@$INSTANCE_ID" \
    "$1" 2>&1 | grep -v "^Warning:" | grep -v "^\*\*"
}

resize_instance() {
  local target_type="$1"
  local current_type
  current_type=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].InstanceType' --output text)

  if [ "$current_type" = "$target_type" ]; then
    echo "   Already $target_type, skipping resize"
    return 0
  fi

  echo "   Stopping instance..."
  aws ec2 stop-instances --instance-ids "$INSTANCE_ID" > /dev/null
  aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID"

  echo "   Resizing $current_type -> $target_type..."
  aws ec2 modify-instance-attribute --instance-id "$INSTANCE_ID" \
    --instance-type "{\"Value\":\"$target_type\"}"

  echo "   Starting instance..."
  aws ec2 start-instances --instance-ids "$INSTANCE_ID" > /dev/null
  aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

  # Wait for SSH to be ready
  echo "   Waiting for SSH..."
  for i in $(seq 1 30); do
    if push_key 2>/dev/null && ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      -o ConnectTimeout=5 -i "$SSH_KEY" \
      -o ProxyCommand="aws ec2-instance-connect open-tunnel --instance-id $INSTANCE_ID" \
      "ec2-user@$INSTANCE_ID" "echo ready" 2>/dev/null | grep -q ready; then
      break
    fi
    sleep 5
  done
}

wait_for_healthy() {
  echo "   Waiting for ALB health check..."
  for i in $(seq 1 20); do
    local health
    health=$(aws elbv2 describe-target-health \
      --target-group-arn "$TARGET_GROUP_ARN" \
      --query 'TargetHealthDescriptions[?Target.Id==`'"$INSTANCE_ID"'`].TargetHealth.State' \
      --output text 2>/dev/null)
    if [ "$health" = "healthy" ]; then
      echo "   Target is healthy"
      return 0
    fi
    sleep 15
  done
  echo "   WARNING: Target still not healthy after 5 minutes"
  return 1
}

# ── Main deploy flow ───────────────────────────────────────────

echo "================================================"
echo "Deploying CLM Survey Application"
echo "================================================"
echo ""

# Step 1: Resize to build instance type
echo "[1/6] Resizing to $BUILD_INSTANCE_TYPE for build..."
resize_instance "$BUILD_INSTANCE_TYPE"

# Step 2: Backup database
echo "[2/6] Backing up database..."
remote "
  cd $APP_DIR
  mkdir -p /home/ec2-user/update-backups
  TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
  if [ -f survey.db ]; then
    cp survey.db /home/ec2-user/update-backups/survey_pre_update_\$TIMESTAMP.db
    echo '   Backup saved'
  else
    echo '   No database file to backup'
  fi
"

# Step 3: Pull and install
echo "[3/6] Pulling latest code and installing dependencies..."
remote "
  cd $APP_DIR
  git pull origin main
  npm install --ignore-scripts
  npm rebuild better-sqlite3 bcrypt
"

# Step 4: Build
echo "[4/6] Building application..."
remote "cd $APP_DIR && npm run build"

# Step 5: Resize back to runtime instance type
echo "[5/6] Resizing back to $RUNTIME_INSTANCE_TYPE..."
resize_instance "$RUNTIME_INSTANCE_TYPE"

# Step 6: Start app and verify
echo "[6/6] Starting application and verifying..."
remote "pm2 restart clm-survey && sleep 3 && pm2 status"

wait_for_healthy

echo ""
echo "================================================"
echo "Deploy complete!"
echo "  Instance: $INSTANCE_ID ($RUNTIME_INSTANCE_TYPE)"
echo "  Site:     https://clmvaluemap.com"
echo "================================================"
