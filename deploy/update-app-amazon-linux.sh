#!/bin/bash

# Update script for CLM Survey Application on Amazon Linux EC2
# Run this script to update the application with latest changes

echo "================================================"
echo "Updating CLM Survey Application (Amazon Linux)"
echo "================================================"

cd /var/www/clm-survey

# Backup current database
echo "📦 Backing up current database..."
mkdir -p /home/ec2-user/update-backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -f "survey.db" ]; then
    cp survey.db /home/ec2-user/update-backups/survey_pre_update_$TIMESTAMP.db
    echo "✅ Database backed up to: /home/ec2-user/update-backups/survey_pre_update_$TIMESTAMP.db"
fi

# Stop the application
echo "⏹️ Stopping application..."
sudo -u ec2-user pm2 stop clm-survey

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
sudo -u ec2-user git pull origin main

# Install/update dependencies
echo "📦 Installing/updating dependencies..."
sudo -u ec2-user npm install

# Build the application
echo "🔨 Building application..."
sudo -u ec2-user npm run build

# Start the application
echo "🚀 Starting application..."
sudo -u ec2-user pm2 start clm-survey

# Show status
echo "📊 Application status:"
sudo -u ec2-user pm2 status

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "================================================"
echo "✅ Update Complete!"
echo "================================================"
echo ""
echo "Your application is now running the latest version."
echo "Visit: http://$PUBLIC_IP"
echo ""