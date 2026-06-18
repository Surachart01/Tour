# GitHub Actions Deployment Setup Guide

## Overview

This guide explains how to set up automated deployment of the frontend to your VM using GitHub Actions.

---

## 📋 Prerequisites on VM

### 1. Web Server (Nginx or Apache)

**Install Nginx (Recommended):**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# CentOS/RHEL
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

**OR Install Apache:**
```bash
# Ubuntu/Debian
sudo apt install apache2 -y
sudo systemctl start apache2
sudo systemctl enable apache2

# CentOS/RHEL
sudo yum install httpd -y
sudo systemctl start httpd
sudo systemctl enable httpd
```

### 2. Create Deployment User

```bash
# Create a deployment user
sudo useradd -m -s /bin/bash deploy

# Add to web server group
sudo usermod -aG www-data deploy  # For Nginx on Ubuntu
# OR
sudo usermod -aG nginx deploy     # For Nginx on CentOS
# OR
sudo usermod -aG apache deploy    # For Apache
```

### 3. Set Up SSH Key for Deployment

```bash
# On your LOCAL machine, generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# This creates:
# - ~/.ssh/github_deploy_key (private key - add to GitHub Secrets)
# - ~/.ssh/github_deploy_key.pub (public key - add to VM)

# Copy the public key to your VM
ssh-copy-id -i ~/.ssh/github_deploy_key.pub deploy@your-vm-ip

# OR manually:
# On VM, as deploy user:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key content, save and exit
chmod 600 ~/.ssh/authorized_keys
```

### 4. Configure Sudo Permissions for Deploy User

```bash
# On VM, as root or with sudo:
sudo visudo

# Add this line at the end:
deploy ALL=(ALL) NOPASSWD: /bin/tar, /bin/mkdir, /bin/chown, /bin/chmod, /usr/bin/systemctl reload nginx, /usr/bin/systemctl reload apache2, /usr/bin/systemctl reload httpd

# This allows the deploy user to run only necessary commands without password
```

### 5. Create Deployment Directory

```bash
# On VM:
sudo mkdir -p /var/www/core-frontend
sudo chown -R deploy:www-data /var/www/core-frontend  # or nginx:nginx
sudo chmod -R 755 /var/www/core-frontend

# Create backup directory
sudo mkdir -p /var/backups
sudo chown deploy:deploy /var/backups
```

### 6. Configure Web Server

**For Nginx:**

**⚠️ IMPORTANT:** See [NGINX_PRODUCTION_CONFIG.md](NGINX_PRODUCTION_CONFIG.md) for the **recommended production configuration** with:
- Gzip compression
- Optimized caching (vendors, build, images)
- API proxy support
- Security headers
- HTTP/2 support

**Quick setup:**
```bash
sudo nano /etc/nginx/sites-available/verathailand
```

**Copy the full production config from [NGINX_PRODUCTION_CONFIG.md](NGINX_PRODUCTION_CONFIG.md)**

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/verathailand /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**For Apache:**
```bash
sudo nano /etc/apache2/sites-available/core-frontend.conf
```

Add:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/core-frontend

    <Directory /var/www/core-frontend>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/core-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/core-frontend-access.log combined
</VirtualHost>
```

Enable:
```bash
sudo a2ensite core-frontend
sudo systemctl reload apache2
```

### 7. Configure Firewall

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🔐 GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

### Required Secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SSH_PRIVATE_KEY` | Private SSH key for deployment | Content of `~/.ssh/github_deploy_key` |
| `VM_HOST` | VM hostname or IP address | `192.168.1.100` or `vm.example.com` |
| `VM_USER` | SSH user for deployment | `deploy` |
| `DEPLOY_PATH` | Path where frontend will be deployed | `/var/www/core-frontend` |
| `BACKEND_API_URL` | Backend API endpoint URL | `http://backend-ip:8080` or `https://api.example.com` |

### How to Add Each Secret:

#### 1. SSH_PRIVATE_KEY
```bash
# On your local machine, display the private key:
cat ~/.ssh/github_deploy_key

# Copy the ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... key content ...
# -----END OPENSSH PRIVATE KEY-----

# Paste this into GitHub Secret: SSH_PRIVATE_KEY
```

#### 2. VM_HOST
```
# Your VM's IP address or domain name
Example: 192.168.1.100
Example: vm.yourdomain.com
```

#### 3. VM_USER
```
# The deployment user you created
Example: deploy
```

#### 4. DEPLOY_PATH
```
# Full path to deployment directory
Example: /var/www/core-frontend
```

#### 5. BACKEND_API_URL
```
# Your backend API URL (must be accessible from user's browser)
Example: http://192.168.1.100:8080
Example: https://api.yourdomain.com
```

---

## 🚀 How the Workflow Works

### Trigger Events:
1. **Push to main branch** - Automatically deploys
2. **Manual trigger** - Go to Actions tab → Deploy Frontend to VM → Run workflow

### Deployment Steps:

1. **Checkout code** - Gets latest code from repository
2. **Update backend endpoint** - Replaces endpoint in `config.js` with `BACKEND_API_URL`
3. **Create package** - Creates tarball with `production/`, `build/`, and `vendors/` directories
4. **Setup SSH** - Configures SSH key for secure connection
5. **Upload to server** - Transfers tarball to VM's `/tmp/` directory
6. **Deploy on server** - Extracts files, sets permissions, reloads web server
7. **Verify deployment** - Checks if files exist and web server responds
8. **Summary** - Shows deployment success message

---

## ✅ Testing the Setup

### 1. Test SSH Connection

From your local machine:
```bash
ssh -i ~/.ssh/github_deploy_key deploy@your-vm-ip
# Should connect without password
```

### 2. Test Sudo Permissions

On VM as deploy user:
```bash
sudo systemctl reload nginx
# Should work without asking for password
```

### 3. Test Manual Deployment

Create a test file:
```bash
# On VM as deploy user:
echo "test" | sudo tee /var/www/core-frontend/test.txt
```

Access in browser:
```
http://your-vm-ip/test.txt
# Should show "test"
```

### 4. Trigger GitHub Actions

1. Make a small change to your repository
2. Push to main branch
3. Go to GitHub → Actions tab
4. Watch the deployment workflow run
5. Check logs for any errors

---

## 🔍 Troubleshooting

### Issue: SSH Connection Failed

**Check:**
```bash
# On VM, check SSH service
sudo systemctl status sshd

# Check authorized_keys
cat /home/deploy/.ssh/authorized_keys

# Check SSH logs
sudo tail -f /var/log/auth.log  # Ubuntu
sudo tail -f /var/log/secure     # CentOS
```

**Fix:**
```bash
# Ensure correct permissions
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### Issue: Permission Denied on Deployment

**Check:**
```bash
# Verify deploy user can write to deployment directory
sudo -u deploy touch /var/www/core-frontend/test.txt

# Check sudo configuration
sudo -l -U deploy
```

**Fix:**
```bash
# Adjust ownership
sudo chown -R deploy:www-data /var/www/core-frontend
sudo chmod -R 755 /var/www/core-frontend
```

### Issue: Web Server Not Serving Files

**Check:**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

**Fix:**
```bash
# Reload web server
sudo systemctl reload nginx

# Check file permissions
ls -la /var/www/core-frontend/production/login.html
```

### Issue: Backend Connection Failed

**Check:**
- Verify `BACKEND_API_URL` secret is correct
- Backend must be accessible from user's browser (not just from VM)
- Check browser console (F12) for CORS errors
- Test backend directly: `curl http://backend-url:8080/api/v1/health`

---

## 📊 Monitoring Deployment

### View GitHub Actions Logs
1. Go to repository → Actions tab
2. Click on the latest workflow run
3. Expand each step to see detailed logs

### View VM Logs
```bash
# SSH into VM
ssh deploy@your-vm-ip

# Check web server logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check deployment backups
ls -lh /var/backups/frontend-backup-*
```

### Check Deployed Version
```bash
# On VM
ls -la /var/www/core-frontend/production/

# Check config.js for backend URL
cat /var/www/core-frontend/production/js/config.js
```

---

## 🔒 Security Best Practices

1. **Use SSH keys, not passwords** ✅ (Already configured)
2. **Limit sudo permissions** ✅ (Only specific commands)
3. **Use HTTPS in production** - Set up Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com
   ```
4. **Keep secrets secure** - Never commit secrets to repository
5. **Regular updates** - Keep VM and packages updated:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 📝 Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# SSH into VM
ssh deploy@your-vm-ip

# List backups
ls -lh /var/backups/frontend-backup-*

# Restore from backup
sudo tar -xzf /var/backups/frontend-backup-YYYYMMDD-HHMMSS.tar.gz -C /var/www/

# Reload web server
sudo systemctl reload nginx
```

---

## 🎯 Next Steps

1. ✅ Complete VM setup (web server, user, SSH)
2. ✅ Add all secrets to GitHub
3. ✅ Test SSH connection manually
4. ✅ Push to main branch to trigger deployment
5. ✅ Verify application is accessible
6. 🔄 Set up HTTPS with Let's Encrypt
7. 📊 Set up monitoring/alerting
8. 📝 Document any custom configurations

---

## 📞 Quick Reference Commands

```bash
# Check deployment status
ssh deploy@vm-ip "ls -la /var/www/core-frontend/production/"

# View recent logs
ssh deploy@vm-ip "sudo tail -100 /var/log/nginx/access.log"

# Restart web server
ssh deploy@vm-ip "sudo systemctl restart nginx"

# Check disk space
ssh deploy@vm-ip "df -h"

# Test backend connectivity
curl http://backend-url:8080/api/v1/health
```

