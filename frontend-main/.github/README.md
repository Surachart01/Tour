# GitHub Actions Deployment Documentation

This directory contains the automated deployment configuration for the core-frontend application.

## 📚 Documentation Files

1. **[DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md)** - Complete setup guide
   - VM prerequisites and configuration
   - GitHub Secrets setup
   - Web server configuration
   - Troubleshooting guide

2. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
   - VM setup verification
   - SSH configuration checks
   - Testing procedures
   - Common issues and fixes

3. **[workflows/deploy.yml](workflows/deploy.yml)** - GitHub Actions workflow
   - Automated deployment pipeline
   - Triggered on push to main branch
   - Can be manually triggered

## 🚀 Quick Start

### For First-Time Setup:

1. **Read the setup guide:**
   ```bash
   cat .github/DEPLOYMENT_SETUP.md
   ```

2. **Follow the checklist:**
   ```bash
   cat .github/DEPLOYMENT_CHECKLIST.md
   ```

3. **Add GitHub Secrets** (Repository → Settings → Secrets):
   - `SSH_PRIVATE_KEY` - Your deployment SSH private key
   - `VM_HOST` - Your VM IP or domain
   - `VM_USER` - Deployment user (usually `deploy`)
   - `DEPLOY_PATH` - Deployment directory (e.g., `/var/www/core-frontend`)
   - `BACKEND_API_URL` - Backend API endpoint

4. **Trigger deployment:**
   - Push to main branch, OR
   - Go to Actions → Deploy Frontend to VM → Run workflow

## 🔐 Required GitHub Secrets

| Secret | Example | Description |
|--------|---------|-------------|
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | Private SSH key for deployment |
| `VM_HOST` | `192.168.1.100` | VM hostname or IP |
| `VM_USER` | `deploy` | SSH user for deployment |
| `DEPLOY_PATH` | `/var/www/core-frontend` | Deployment directory path |
| `BACKEND_API_URL` | `http://backend-ip:8080` | Backend API endpoint |

## 🖥️ VM Requirements

### Software:
- ✅ Nginx or Apache web server
- ✅ SSH server (openssh-server)
- ✅ curl (for verification)
- ✅ tar (for extracting files)

### Configuration:
- ✅ Deployment user with SSH access
- ✅ Sudo permissions for specific commands
- ✅ Web server configured to serve from deployment directory
- ✅ Firewall allows HTTP (80), HTTPS (443), SSH (22)

## 📋 Deployment Process

The workflow performs these steps:

1. **Checkout** - Gets latest code from repository
2. **Configure** - Updates backend endpoint in config.js
3. **Package** - Creates tarball with production files
4. **Upload** - Transfers package to VM via SCP
5. **Deploy** - Extracts files and sets permissions
6. **Verify** - Checks deployment success
7. **Cleanup** - Removes temporary files

## 🔍 Monitoring Deployment

### View Workflow Logs:
1. Go to repository → **Actions** tab
2. Click on latest workflow run
3. Expand steps to see detailed logs

### Check Deployed Files:
```bash
ssh deploy@vm-ip "ls -la /var/www/core-frontend/production/"
```

### View Web Server Logs:
```bash
ssh deploy@vm-ip "sudo tail -f /var/log/nginx/access.log"
ssh deploy@vm-ip "sudo tail -f /var/log/nginx/error.log"
```

## 🔄 Rollback Procedure

If deployment fails:

```bash
# SSH into VM
ssh deploy@vm-ip

# List backups
ls -lh /var/backups/frontend-backup-*

# Restore from backup
sudo tar -xzf /var/backups/frontend-backup-YYYYMMDD-HHMMSS.tar.gz -C /var/www/

# Reload web server
sudo systemctl reload nginx
```

## 🐛 Troubleshooting

### Deployment Fails?
1. Check GitHub Actions logs for error messages
2. Verify all secrets are set correctly
3. Test SSH connection manually: `ssh -i ~/.ssh/deploy_key deploy@vm-ip`
4. Check VM logs: `sudo tail -100 /var/log/nginx/error.log`

### Application Not Loading?
1. Check if files deployed: `ssh deploy@vm-ip "ls -la /var/www/core-frontend/"`
2. Test web server: `curl http://vm-ip/production/login.html`
3. Check browser console (F12) for errors
4. Verify backend URL in config.js

### Backend Connection Issues?
1. Check backend is running: `curl http://backend-ip:8080/api/v1/health`
2. Verify `BACKEND_API_URL` secret is correct
3. Check CORS configuration on backend
4. Test from browser (not just from VM)

## 📞 Support Commands

```bash
# Test SSH connection
ssh -i ~/.ssh/github_deploy_key deploy@vm-ip

# Check web server status
ssh deploy@vm-ip "sudo systemctl status nginx"

# View recent logs
ssh deploy@vm-ip "sudo tail -100 /var/log/nginx/error.log"

# Check deployed config
ssh deploy@vm-ip "cat /var/www/core-frontend/production/js/config.js"

# Test web server response
ssh deploy@vm-ip "curl -I http://localhost/production/login.html"

# Check disk space
ssh deploy@vm-ip "df -h"
```

## 🔒 Security Notes

- ✅ SSH key authentication (no passwords)
- ✅ Limited sudo permissions (only required commands)
- ✅ Secrets stored in GitHub (encrypted)
- ✅ Automatic backups before deployment
- ⚠️ Use HTTPS in production (set up Let's Encrypt)

## 📈 Best Practices

1. **Test in staging first** - Set up a staging environment
2. **Monitor deployments** - Check logs after each deployment
3. **Keep backups** - Backups are created automatically in `/var/backups/`
4. **Use HTTPS** - Set up SSL certificates for production
5. **Regular updates** - Keep VM and packages updated

## 🎯 Next Steps

After successful deployment:

1. ✅ Verify application is accessible
2. ✅ Test all features work correctly
3. 🔄 Set up HTTPS with Let's Encrypt
4. 📊 Configure monitoring and alerting
5. 📝 Document any custom configurations
6. 🔄 Test rollback procedure

## 📖 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

## 🆘 Need Help?

1. **Check the setup guide:** [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md)
2. **Follow the checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. **Review workflow logs:** GitHub → Actions tab
4. **Check VM logs:** `sudo tail -f /var/log/nginx/error.log`

---

**Last Updated:** 2025-10-25
**Workflow Version:** 1.0

