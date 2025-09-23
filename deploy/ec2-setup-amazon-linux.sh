#!/bin/bash

# EC2 Setup Script for CLM Survey Application - Amazon Linux Version
# Run this after connecting to your Amazon Linux EC2 instance

echo "================================================"
echo "Starting EC2 Setup for CLM Survey Application"
echo "Amazon Linux Version"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install development tools (needed for SQLite and native modules)
echo "📦 Installing development tools..."
sudo yum groupinstall -y "Development Tools"
sudo yum install -y gcc-c++ make

# Install Node.js 20.x
echo "📦 Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install nginx for reverse proxy
echo "📦 Installing Nginx..."
# Try different methods for different Amazon Linux versions
if command -v dnf >/dev/null 2>&1; then
    # Amazon Linux 2023
    sudo dnf install -y nginx
elif command -v amazon-linux-extras >/dev/null 2>&1; then
    # Amazon Linux 2
    sudo amazon-linux-extras install -y nginx1
else
    # Fallback - install from EPEL
    sudo yum install -y epel-release
    sudo yum install -y nginx
fi

# Install git
echo "📦 Installing Git..."
sudo yum install -y git

# Install SQLite3 tools (optional, for database management)
echo "📦 Installing SQLite3 tools..."
sudo yum install -y sqlite

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/clm-survey
sudo chown ec2-user:ec2-user /var/www/clm-survey

# Clone the repository
echo "📥 Cloning repository..."
cd /var/www
sudo -u ec2-user git clone https://github.com/hjtapia74/clmvaluemap.git clm-survey
cd clm-survey

# Install dependencies
echo "📦 Installing Node.js dependencies..."
sudo -u ec2-user npm install

# Create swap file for build process (needed for t2.micro)
echo "💾 Creating swap space for build process..."
if [ ! -f /swapfile ]; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "✅ 1GB swap space created"
fi

# Build the application with memory limit
echo "🔨 Building application..."
sudo -u ec2-user bash -c "cd /var/www/clm-survey && NODE_OPTIONS='--max-old-space-size=768' npm run build"

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
sudo -u ec2-user tee ecosystem.config.js > /dev/null << 'EOF'
module.exports = {
  apps: [{
    name: 'clm-survey',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/clm-survey',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/clm-survey/logs/err.log',
    out_file: '/var/www/clm-survey/logs/out.log',
    log_file: '/var/www/clm-survey/logs/combined.log',
    time: true,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
EOF

# Create logs directory
sudo -u ec2-user mkdir -p /var/www/clm-survey/logs

# Configure Nginx
echo "⚙️ Configuring Nginx..."

# Create conf.d directory if it doesn't exist
sudo mkdir -p /etc/nginx/conf.d

# Create nginx configuration
sudo tee /etc/nginx/conf.d/clm-survey.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Remove default nginx config if it exists
sudo rm -f /etc/nginx/conf.d/default.conf

# Test and start Nginx
if command -v nginx >/dev/null 2>&1; then
    echo "✅ Nginx installed successfully"
    sudo nginx -t
    sudo systemctl enable nginx
    sudo systemctl start nginx

    # Check if nginx started successfully
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx started successfully"
    else
        echo "⚠️ Nginx installation completed but service failed to start"
        echo "You may need to configure it manually"
    fi
else
    echo "❌ Nginx installation failed"
    echo "You can install it manually later with: sudo dnf install -y nginx"
fi

# Start the application with PM2 as ec2-user
echo "🚀 Starting application with PM2..."
cd /var/www/clm-survey
sudo -u ec2-user pm2 start ecosystem.config.js

# Save PM2 process list and configure startup
sudo -u ec2-user pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Set up SQLite database backup (optional)
echo "📅 Setting up daily database backup..."
sudo -u ec2-user tee /home/ec2-user/backup-db.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ec2-user/db-backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /var/www/clm-survey/survey.db $BACKUP_DIR/survey_$TIMESTAMP.db 2>/dev/null || echo "No database file found yet"
# Keep only last 7 days of backups
find $BACKUP_DIR -name "survey_*.db" -mtime +7 -delete 2>/dev/null
EOF

chmod +x /home/ec2-user/backup-db.sh

# Add cron job for daily backup
(sudo -u ec2-user crontab -l 2>/dev/null; echo "0 2 * * * /home/ec2-user/backup-db.sh") | sudo -u ec2-user crontab -

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Your application should now be running at:"
echo "http://$PUBLIC_IP"
echo ""
echo "Useful commands:"
echo "  sudo -u ec2-user pm2 status          - Check app status"
echo "  sudo -u ec2-user pm2 logs            - View app logs"
echo "  sudo -u ec2-user pm2 restart clm-survey - Restart app"
echo "  sudo systemctl reload nginx          - Reload Nginx"
echo ""
echo "Database location: /var/www/clm-survey/survey.db"
echo "Backups location: /home/ec2-user/db-backups/"
echo ""
echo "Note: Default user on Amazon Linux is 'ec2-user' (not 'ubuntu')"
echo ""