#!/bin/bash

# EC2 Setup Script for CLM Survey Application
# Run this after connecting to your EC2 instance

echo "================================================"
echo "Starting EC2 Setup for CLM Survey Application"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials (needed for SQLite)
echo "📦 Installing build tools..."
sudo apt-get install -y build-essential python3

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install nginx for reverse proxy
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install SQLite3 tools (optional, for database management)
echo "📦 Installing SQLite3 tools..."
sudo apt-get install -y sqlite3

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/clm-survey
sudo chown ubuntu:ubuntu /var/www/clm-survey

# Clone the repository
echo "📥 Cloning repository..."
cd /var/www
git clone https://github.com/hjtapia74/clmvaluemap.git clm-survey
cd clm-survey

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
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
mkdir -p /var/www/clm-survey/logs

# Configure Nginx
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/clm-survey > /dev/null << 'EOF'
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

# Enable the site
sudo ln -sf /etc/nginx/sites-available/clm-survey /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# Start the application with PM2
echo "🚀 Starting application with PM2..."
cd /var/www/clm-survey
pm2 start ecosystem.config.js

# Save PM2 process list and configure startup
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Set up SQLite database backup (optional)
echo "📅 Setting up daily database backup..."
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/db-backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /var/www/clm-survey/survey.db $BACKUP_DIR/survey_$TIMESTAMP.db
# Keep only last 7 days of backups
find $BACKUP_DIR -name "survey_*.db" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add cron job for daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh") | crontab -

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Your application should now be running at:"
echo "http://$(curl -s ifconfig.me)"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs            - View app logs"
echo "  pm2 restart clm-survey - Restart app"
echo "  sudo nginx -s reload - Reload Nginx"
echo ""
echo "Database location: /var/www/clm-survey/survey.db"
echo "Backups location: /home/ubuntu/db-backups/"
echo ""