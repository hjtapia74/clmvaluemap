#!/bin/bash

# Update script for CLM Survey Application on EC2
# Run this script to update the application with latest changes

echo "================================================"
echo "Updating CLM Survey Application"
echo "================================================"

cd /var/www/clm-survey

# Backup current database
echo "📦 Backing up current database..."
mkdir -p /home/ubuntu/update-backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -f "survey.db" ]; then
    cp survey.db /home/ubuntu/update-backups/survey_pre_update_$TIMESTAMP.db
    echo "✅ Database backed up to: /home/ubuntu/update-backups/survey_pre_update_$TIMESTAMP.db"
fi

# Stop the application
echo "⏹️ Stopping application..."
pm2 stop clm-survey

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install/update dependencies
echo "📦 Installing/updating dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application
echo "🚀 Starting application..."
pm2 start clm-survey

# Show status
echo "📊 Application status:"
pm2 status

echo "================================================"
echo "✅ Update Complete!"
echo "================================================"
echo ""
echo "Your application is now running the latest version."
echo "Visit: http://$(curl -s ifconfig.me)"
echo ""