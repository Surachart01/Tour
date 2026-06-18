# Deployment Checklist

Use this checklist to ensure everything is set up correctly for automated deployment.

## 🖥️ VM Setup

### Web Server
- [ ] Nginx or Apache installed
- [ ] Web server is running: `systemctl status nginx`
- [ ] Web server starts on boot: `systemctl is-enabled nginx`
- [ ] Firewall allows HTTP (port 80): `sudo ufw status` or `sudo firewall-cmd --list-all`
- [ ] Firewall allows HTTPS (port 443)
- [ ] Firewall allows SSH (port 22)

### Deployment User
- [ ] User `deploy` created: `id deploy`
- [ ] User added to web server group: `groups deploy`
- [ ] User has home directory: `ls -la /home/deploy`
- [ ] SSH directory exists: `ls -la /home/deploy/.ssh`
- [ ] Authorized keys file exists: `ls -la /home/deploy/.ssh/authorized_keys`
- [ ] Correct permissions on .ssh (700): `stat -c %a /home/deploy/.ssh`
- [ ] Correct permissions on authorized_keys (600): `stat -c %a /home/deploy/.ssh/authorized_keys`

### Sudo Configuration
- [ ] Deploy user has sudo permissions for required commands
- [ ] Test: `sudo -u deploy sudo systemctl reload nginx` (should not ask for password)
- [ ] Test: `sudo -u deploy sudo mkdir -p /tmp/test` (should work)
- [ ] Test: `sudo -u deploy sudo chown deploy:deploy /tmp/test` (should work)

### Directories
- [ ] Deployment directory exists: `/var/www/core-frontend`
- [ ] Deploy user can write to it: `sudo -u deploy touch /var/www/core-frontend/test.txt`
- [ ] Backup directory exists: `/var/backups`
- [ ] Deploy user can write to backup dir: `sudo -u deploy touch /var/backups/test.txt`
- [ ] Correct ownership: `ls -la /var/www/core-frontend`
- [ ] Correct permissions (755): `stat -c %a /var/www/core-frontend`

### Web Server Configuration
- [ ] Site configuration file created
- [ ] Configuration points to `/var/www/core-frontend`
- [ ] Site enabled (symlink created)
- [ ] Configuration is valid: `sudo nginx -t` or `sudo apachectl configtest`
- [ ] Web server reloaded: `sudo systemctl reload nginx`

## 🔐 SSH Key Setup

### Local Machine
- [ ] SSH key pair generated: `ls -la ~/.ssh/github_deploy_key*`
- [ ] Private key is secure (600): `stat -c %a ~/.ssh/github_deploy_key`
- [ ] Can display private key: `cat ~/.ssh/github_deploy_key`
- [ ] Can display public key: `cat ~/.ssh/github_deploy_key.pub`

### VM
- [ ] Public key added to authorized_keys on VM
- [ ] Can SSH without password: `ssh -i ~/.ssh/github_deploy_key deploy@vm-ip`
- [ ] SSH connection works: `ssh -i ~/.ssh/github_deploy_key deploy@vm-ip 'echo "Connection successful"'`

## 🔒 GitHub Secrets

Go to: Repository → Settings → Secrets and variables → Actions

- [ ] `SSH_PRIVATE_KEY` added (entire private key including BEGIN/END lines)
- [ ] `VM_HOST` added (IP address or domain)
- [ ] `VM_USER` added (usually `deploy`)
- [ ] `DEPLOY_PATH` added (usually `/var/www/core-frontend`)
- [ ] `BACKEND_API_URL` added (backend API endpoint)

### Verify Secrets
- [ ] All 5 secrets are listed in GitHub
- [ ] No typos in secret names (case-sensitive)
- [ ] Values are correct (no extra spaces or newlines)

## 🧪 Testing

### Manual Tests on VM
```bash
# Test 1: SSH connection
ssh -i ~/.ssh/github_deploy_key deploy@vm-ip

# Test 2: Sudo permissions
sudo systemctl reload nginx

# Test 3: Write to deployment directory
sudo touch /var/www/core-frontend/test.txt
ls -la /var/www/core-frontend/test.txt

# Test 4: Web server serves files
echo "test" | sudo tee /var/www/core-frontend/test.html
curl http://localhost/test.html

# Test 5: Backend connectivity (if backend is running)
curl http://backend-ip:8080/api/v1/health
```

### Browser Tests
- [ ] Can access VM in browser: `http://vm-ip/`
- [ ] No certificate errors (or expected for HTTP)
- [ ] Can access test file: `http://vm-ip/test.html`

### GitHub Actions Test
- [ ] Workflow file exists: `.github/workflows/deploy.yml`
- [ ] Workflow is valid (no syntax errors)
- [ ] Can trigger manual workflow: Actions → Deploy Frontend to VM → Run workflow
- [ ] Workflow runs without errors
- [ ] All steps show green checkmarks
- [ ] Deployment summary shows success message

## 🌐 Backend Configuration

- [ ] Backend is running and accessible
- [ ] Backend API URL is correct in `BACKEND_API_URL` secret
- [ ] Backend allows CORS from frontend domain
- [ ] Can access backend from browser: `http://backend-url:8080/api/v1/health`
- [ ] Backend API documentation is available

## 📊 Post-Deployment Verification

After first successful deployment:

- [ ] Files deployed to VM: `ssh deploy@vm-ip "ls -la /var/www/core-frontend/production/"`
- [ ] config.js has correct backend URL: `ssh deploy@vm-ip "cat /var/www/core-frontend/production/js/config.js"`
- [ ] Login page accessible: `http://vm-ip/production/login.html`
- [ ] No 404 errors in browser console (F12)
- [ ] CSS/JS files loading correctly
- [ ] Can see login form
- [ ] Backend connectivity works (try logging in)
- [ ] Backup created: `ssh deploy@vm-ip "ls -la /var/backups/"`

## 🔧 Troubleshooting Commands

If something fails, use these commands:

```bash
# Check GitHub Actions logs
# Go to: Repository → Actions → Click on failed workflow

# Check SSH connection
ssh -vvv -i ~/.ssh/github_deploy_key deploy@vm-ip

# Check web server status
ssh deploy@vm-ip "sudo systemctl status nginx"

# Check web server logs
ssh deploy@vm-ip "sudo tail -100 /var/log/nginx/error.log"

# Check file permissions
ssh deploy@vm-ip "ls -la /var/www/core-frontend/"

# Check deployed files
ssh deploy@vm-ip "ls -la /var/www/core-frontend/production/"

# Test web server locally on VM
ssh deploy@vm-ip "curl -I http://localhost/production/login.html"

# Check disk space
ssh deploy@vm-ip "df -h"

# Check backend connectivity from VM
ssh deploy@vm-ip "curl -I http://backend-ip:8080"
```

## 📝 Common Issues

### ❌ SSH Connection Failed
**Symptoms:** "Permission denied" or "Connection refused"
**Check:**
- [ ] SSH service running on VM: `sudo systemctl status sshd`
- [ ] Firewall allows SSH: `sudo ufw status | grep 22`
- [ ] Correct private key used
- [ ] Public key in authorized_keys
- [ ] Correct permissions on SSH files

### ❌ Permission Denied During Deployment
**Symptoms:** "Permission denied" when creating directories or files
**Check:**
- [ ] Deploy user owns deployment directory
- [ ] Sudo configuration is correct
- [ ] Deploy user in correct group

### ❌ Web Server Not Serving Files
**Symptoms:** 404 or 403 errors in browser
**Check:**
- [ ] Web server running: `sudo systemctl status nginx`
- [ ] Configuration valid: `sudo nginx -t`
- [ ] Files exist in correct location
- [ ] Correct permissions (755 for directories, 644 for files)
- [ ] SELinux not blocking (if applicable)

### ❌ Backend Connection Failed
**Symptoms:** API calls fail in browser console
**Check:**
- [ ] Backend is running
- [ ] Backend URL is correct in config.js
- [ ] Backend accessible from browser (not just from VM)
- [ ] CORS configured on backend
- [ ] No firewall blocking backend port

### ❌ Workflow Fails
**Symptoms:** Red X in GitHub Actions
**Check:**
- [ ] All secrets are set correctly
- [ ] No typos in secret names
- [ ] SSH key is complete (including BEGIN/END lines)
- [ ] VM is accessible from internet
- [ ] Workflow syntax is valid

## ✅ Success Criteria

Deployment is successful when:
- ✅ GitHub Actions workflow completes with all green checkmarks
- ✅ Can access login page at `http://vm-ip/production/login.html`
- ✅ No errors in browser console (F12)
- ✅ All CSS/JS files load correctly
- ✅ Can see the login form
- ✅ Backend API calls work (can log in successfully)
- ✅ Backup created in `/var/backups/`

## 🎯 Final Steps

Once everything is working:
- [ ] Document any custom configurations
- [ ] Set up HTTPS with Let's Encrypt
- [ ] Configure monitoring/alerting
- [ ] Set up log rotation
- [ ] Schedule regular backups
- [ ] Update team documentation
- [ ] Test rollback procedure

---

## 📞 Quick Help

**View this checklist:**
```bash
cat .github/DEPLOYMENT_CHECKLIST.md
```

**View detailed setup guide:**
```bash
cat .github/DEPLOYMENT_SETUP.md
```

**Test deployment manually:**
```bash
# Make a small change
echo "// test" >> production/js/config.js

# Commit and push
git add .
git commit -m "test: trigger deployment"
git push origin main

# Watch in GitHub Actions tab
```

