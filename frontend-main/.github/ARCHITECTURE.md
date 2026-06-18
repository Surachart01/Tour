# Deployment Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  http://vm-ip/production/login.html                      │  │
│  │  - HTML/CSS/JavaScript                                   │  │
│  │  - Static files served by Nginx                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTP Requests
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VM (Web Server)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Nginx (Port 80/443)                                     │  │
│  │  - Serves static files from /var/www/core-frontend      │  │
│  │  - No server-side processing                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  File System                                             │  │
│  │  /var/www/core-frontend/                                 │  │
│  │  ├── production/  (HTML pages)                           │  │
│  │  │   ├── login.html                                      │  │
│  │  │   ├── trip.html                                       │  │
│  │  │   ├── booking.html                                    │  │
│  │  │   └── js/config.js (Backend URL)                      │  │
│  │  ├── build/       (Compiled CSS/JS)                      │  │
│  │  └── vendors/     (Libraries)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ API Calls (from browser)
                     │ Using URL from config.js
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Server                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Go API (Port 8080)                                      │  │
│  │  - /api/v1/quotations                                    │  │
│  │  - /api/v1/bookings                                      │  │
│  │  - /api/v1/login                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEVELOPER                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Local Development                                       │  │
│  │  - Edit files in production/                             │  │
│  │  - Test locally with gulp                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ git push origin main
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        GITHUB                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Repository                                              │  │
│  │  - Source code                                           │  │
│  │  - .github/workflows/deploy.yml                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     │ Triggers                                   │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GitHub Actions Runner                                   │  │
│  │  1. Checkout code                                        │  │
│  │  2. Update config.js with BACKEND_API_URL                │  │
│  │  3. Create tarball (production/, build/, vendors/)       │  │
│  │  4. Setup SSH connection                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ SCP (Secure Copy)
                     │ frontend-deploy.tar.gz
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VM (Target Server)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /tmp/frontend-deploy.tar.gz                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     │ SSH Commands                               │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Deployment Script (via SSH)                             │  │
│  │  1. Backup existing files → /var/backups/                │  │
│  │  2. Extract tarball → /var/www/core-frontend/            │  │
│  │  3. Set permissions (755)                                │  │
│  │  4. Reload Nginx                                         │  │
│  │  5. Verify deployment                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /var/www/core-frontend/                                 │  │
│  │  - Files deployed and ready                              │  │
│  │  - Nginx serves to users                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB SECRETS                             │
│  (Encrypted at rest)                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SSH_PRIVATE_KEY      - Deployment SSH key               │  │
│  │  VM_HOST              - Server IP/domain                 │  │
│  │  VM_USER              - SSH username (deploy)            │  │
│  │  DEPLOY_PATH          - Deployment directory             │  │
│  │  BACKEND_API_URL      - Backend endpoint                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Injected at runtime
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GITHUB ACTIONS RUNNER                         │
│  (Temporary, destroyed after workflow)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ~/.ssh/deploy_key (600)                                 │  │
│  │  - Used only for this deployment                         │  │
│  │  - Never logged or exposed                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ SSH Connection (Port 22)
                     │ Key-based authentication
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                            VM                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  deploy user                                             │  │
│  │  - Limited sudo permissions                              │  │
│  │  - Can only run specific commands:                       │  │
│  │    • tar, mkdir, chown, chmod                            │  │
│  │    • systemctl reload nginx                              │  │
│  │  - Cannot: install packages, modify system, etc.         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Firewall (UFW/firewalld)                                │  │
│  │  - Port 22 (SSH) - Only for deployment                   │  │
│  │  - Port 80 (HTTP) - Public access                        │  │
│  │  - Port 443 (HTTPS) - Public access                      │  │
│  │  - All other ports blocked                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 File Structure

### Repository Structure:
```
core-frontend/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml              # Deployment workflow
│   ├── DEPLOYMENT_SETUP.md         # Setup guide
│   ├── DEPLOYMENT_CHECKLIST.md     # Checklist
│   ├── ARCHITECTURE.md             # This file
│   └── README.md                   # Quick reference
│
├── production/                     # ✅ Deployed
│   ├── *.html                      # All HTML pages
│   └── js/
│       └── config.js               # Backend URL (updated during deploy)
│
├── build/                          # ✅ Deployed
│   ├── css/
│   │   └── custom.min.css          # Compiled CSS
│   └── js/
│       └── custom.min.js           # Compiled JS
│
├── vendors/                        # ✅ Deployed
│   ├── bootstrap/
│   ├── jquery/
│   └── ...                         # All libraries
│
├── src/                            # ❌ Not deployed (source files)
├── node_modules/                   # ❌ Not deployed (dev dependencies)
├── tests/                          # ❌ Not deployed (test files)
└── .git/                           # ❌ Not deployed (git history)
```

### Deployed Structure on VM:
```
/var/www/core-frontend/
├── production/
│   ├── login.html                  # Entry point
│   ├── trip.html
│   ├── booking.html
│   ├── index.html
│   └── js/
│       └── config.js               # Backend URL configured
│
├── build/
│   ├── css/
│   │   └── custom.min.css
│   └── js/
│       └── custom.min.js
│
└── vendors/
    ├── bootstrap/
    ├── jquery/
    └── ...
```

---

## 🔄 Data Flow

### 1. User Loads Page:
```
Browser Request
    ↓
http://vm-ip/production/login.html
    ↓
Nginx serves static HTML
    ↓
Browser loads CSS/JS from build/ and vendors/
    ↓
JavaScript reads config.js for backend URL
```

### 2. User Logs In:
```
User enters credentials
    ↓
JavaScript makes API call to BACKEND_API_URL
    ↓
Request goes directly from browser to backend
    ↓
Backend validates and returns token
    ↓
Token stored in localStorage
    ↓
Redirect to dashboard
```

### 3. User Views Quotations:
```
Browser loads trip.html
    ↓
JavaScript makes GET request to BACKEND_API_URL/api/v1/quotations
    ↓
Backend returns data
    ↓
JavaScript renders table
```

**Important:** All API calls go directly from the user's browser to the backend. The VM only serves static files.

---

## 🌐 Network Architecture

```
                    Internet
                       │
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐      ┌─────────┐      ┌─────────┐
│ GitHub  │      │   VM    │      │ Backend │
│ Actions │      │ (Nginx) │      │   API   │
└─────────┘      └─────────┘      └─────────┘
    │                  │                  │
    │ SSH (Deploy)     │                  │
    └──────────────────┤                  │
                       │                  │
                       │ Serves HTML/CSS  │
                       │                  │
                       ▼                  │
                  ┌─────────┐             │
                  │ Browser │             │
                  └─────────┘             │
                       │                  │
                       │ API Calls        │
                       └──────────────────┘
```

### Ports:
- **GitHub Actions → VM:** Port 22 (SSH)
- **Browser → VM:** Port 80/443 (HTTP/HTTPS)
- **Browser → Backend:** Port 8080 (or configured port)

---

## 🔄 Backup Strategy

```
Before each deployment:
    │
    ▼
Create backup
    │
    ├─→ /var/backups/frontend-backup-20251025-143022.tar.gz
    │
    ▼
Deploy new version
    │
    ├─→ Success? Keep backup for 30 days
    │
    └─→ Failure? Restore from backup
```

### Backup Contents:
- All files from `/var/www/core-frontend/`
- Timestamped filename
- Compressed (tar.gz)
- Stored in `/var/backups/`

### Rollback:
```bash
# List backups
ls -lh /var/backups/frontend-backup-*

# Restore
sudo tar -xzf /var/backups/frontend-backup-YYYYMMDD-HHMMSS.tar.gz -C /var/www/

# Reload
sudo systemctl reload nginx
```

---

## 📊 Monitoring Points

### 1. GitHub Actions:
- Workflow execution status
- Step-by-step logs
- Deployment duration
- Success/failure notifications

### 2. VM Logs:
```bash
# Access logs
/var/log/nginx/core-frontend-access.log

# Error logs
/var/log/nginx/core-frontend-error.log

# System logs
/var/log/syslog or /var/log/messages
```

### 3. Application Monitoring:
- Browser console errors (F12)
- Network requests (F12 → Network tab)
- Backend API response times
- User login success rate

---

## 🔧 Configuration Points

### 1. Backend URL:
- **Configured in:** GitHub Secret `BACKEND_API_URL`
- **Applied to:** `production/js/config.js`
- **Used by:** All JavaScript files making API calls

### 2. Deployment Path:
- **Configured in:** GitHub Secret `DEPLOY_PATH`
- **Default:** `/var/www/core-frontend`
- **Must match:** Nginx configuration

### 3. Web Server:
- **Configured in:** `/etc/nginx/sites-available/core-frontend`
- **Document root:** Points to `DEPLOY_PATH`
- **Index file:** `production/login.html`

---

## 🎯 Critical Paths

### Must be accessible from browser:
1. `http://vm-ip/production/login.html` - Entry point
2. `http://vm-ip/build/css/custom.min.css` - Styles
3. `http://vm-ip/build/js/custom.min.js` - Scripts
4. `http://vm-ip/vendors/*` - Libraries
5. `http://backend-url:8080/api/*` - Backend API

### Must be accessible via SSH:
1. `deploy@vm-ip` - Deployment user
2. `/var/www/core-frontend/` - Deployment directory
3. `/var/backups/` - Backup directory

---

## 📈 Scalability Considerations

### Current Setup:
- Single VM
- Single deployment path
- No load balancing
- No CDN

### Future Enhancements:
1. **Multiple VMs:**
   - Deploy to multiple servers
   - Add load balancer
   - Update workflow to deploy to all servers

2. **CDN:**
   - Serve static assets from CDN
   - Reduce VM load
   - Faster global access

3. **Staging Environment:**
   - Add staging branch
   - Deploy to staging VM first
   - Test before production

4. **Blue-Green Deployment:**
   - Deploy to alternate directory
   - Test new version
   - Switch Nginx config
   - Zero downtime

---

This architecture provides a clear, secure, and maintainable deployment pipeline for your static frontend application.

