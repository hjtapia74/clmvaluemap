# EC2 Deployment Guide for CLM Survey Application

## 🚀 Quick Deployment Steps

### 1. Launch EC2 Instance

1. **Go to AWS EC2 Console** → Launch Instance
2. **Configure:**
   - **Name:** `clm-survey-server`
   - **OS:** Ubuntu Server 22.04 LTS **OR** Amazon Linux 2023
   - **Instance Type:** t2.micro (free) or t3.small (recommended)
   - **Key Pair:** Create/select key pair (save .pem file!)
   - **Security Group:** Allow ports 22, 80, 443, 3000
   - **Storage:** 8-20 GB

### 2. Connect to Instance

```bash
# Set key permissions
chmod 400 your-key.pem

# For Ubuntu
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# For Amazon Linux
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

### 3. Run Setup Script

#### For Ubuntu:
```bash
curl -fsSL https://raw.githubusercontent.com/hjtapia74/clmvaluemap/main/deploy/ec2-setup.sh | bash
```

#### For Amazon Linux:
```bash
curl -fsSL https://raw.githubusercontent.com/hjtapia74/clmvaluemap/main/deploy/ec2-setup-amazon-linux.sh | bash
```

**OR manually:**

```bash
# Clone this repo first
git clone https://github.com/hjtapia74/clmvaluemap.git
cd clmvaluemap/deploy

# For Ubuntu
chmod +x ec2-setup.sh && ./ec2-setup.sh

# For Amazon Linux
chmod +x ec2-setup-amazon-linux.sh && ./ec2-setup-amazon-linux.sh
```

### 4. Access Your Application

After setup completes, visit: `http://YOUR_EC2_IP`

## 📁 File Structure on EC2

```
/var/www/clm-survey/          # Application files
├── survey.db                 # SQLite database (persistent)
├── logs/                     # Application logs
└── ...

/home/ubuntu/
├── db-backups/               # Daily database backups
└── update-backups/           # Pre-update backups
```

## 🔧 Management Commands

### Application Management
```bash
# For Ubuntu
pm2 status                    # Check app status
pm2 logs clm-survey          # View logs
pm2 restart clm-survey       # Restart app
pm2 stop clm-survey          # Stop app
pm2 start clm-survey         # Start app

# For Amazon Linux (run as ec2-user)
sudo -u ec2-user pm2 status                    # Check app status
sudo -u ec2-user pm2 logs clm-survey          # View logs
sudo -u ec2-user pm2 restart clm-survey       # Restart app
sudo -u ec2-user pm2 stop clm-survey          # Stop app
sudo -u ec2-user pm2 start clm-survey         # Start app
```

### Nginx Management
```bash
sudo nginx -s reload          # Reload config
sudo systemctl status nginx   # Check nginx status
sudo systemctl restart nginx  # Restart nginx
```

### Updates
```bash
cd /var/www/clm-survey

# For Ubuntu
./deploy/update-app.sh        # Update to latest version

# For Amazon Linux
./deploy/update-app-amazon-linux.sh
```

## 🔒 Security Considerations

### 1. Restrict Security Group
Update EC2 security group to only allow:
- **SSH (22):** Your IP only
- **HTTP (80):** 0.0.0.0/0 (public)
- **HTTPS (443):** 0.0.0.0/0 (public)
- **Remove port 3000** after nginx setup

### 2. Set up SSL/HTTPS (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already set up)
sudo systemctl status certbot.timer
```

### 3. Database Security
```bash
# Set proper permissions
sudo chown ubuntu:ubuntu /var/www/clm-survey/survey.db
chmod 600 /var/www/clm-survey/survey.db
```

## 💾 Backup & Recovery

### Manual Backup
```bash
# Backup database
cp /var/www/clm-survey/survey.db ~/survey_backup_$(date +%Y%m%d).db

# Backup entire application
tar -czf ~/clm-survey-backup-$(date +%Y%m%d).tar.gz /var/www/clm-survey
```

### Restore Database
```bash
# Stop app
pm2 stop clm-survey

# Restore database
cp ~/survey_backup_YYYYMMDD.db /var/www/clm-survey/survey.db

# Start app
pm2 start clm-survey
```

## 📊 Monitoring

### View Logs
```bash
# Application logs
pm2 logs clm-survey

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### System Resources
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
htop
```

## 🔧 Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs clm-survey

# Restart everything
pm2 restart clm-survey
sudo systemctl restart nginx
```

### Database Issues
```bash
# Check database file
ls -la /var/www/clm-survey/survey.db

# Test database connectivity
sqlite3 /var/www/clm-survey/survey.db "SELECT COUNT(*) FROM sqlite_master;"
```

### Port Issues
```bash
# Check what's running on port 3000
sudo netstat -tlnp | grep 3000

# Check nginx config
sudo nginx -t
```

## 💰 Cost Optimization

### For Production
- Use **t3.small** or **t3.medium** for better performance
- Set up **CloudWatch monitoring**
- Use **Elastic IP** for static IP
- Consider **Load Balancer** for high availability

### For Development/Testing
- **t2.micro** (free tier eligible)
- Stop instance when not in use
- Use **spot instances** for cost savings

## 🔄 CI/CD Integration (Optional)

To set up automatic deployments:

1. Create GitHub webhook
2. Set up webhook endpoint on EC2
3. Use the `update-app.sh` script on webhook trigger

## 📞 Support

If you encounter issues:
1. Check application logs: `pm2 logs clm-survey`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify all services are running: `pm2 status` and `sudo systemctl status nginx`