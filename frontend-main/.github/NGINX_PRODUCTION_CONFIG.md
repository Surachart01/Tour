# Production Nginx Configuration

## 🔍 Analysis of Your Current Config

Your current production config has several **important features** that should be preserved:

1. ✅ **Gzip compression** - Reduces bandwidth and improves speed
2. ✅ **Static file caching** - Vendors (30 days), Build (3 days), Images (7 days)
3. ✅ **HTML cache prevention** - Ensures users get latest version
4. ✅ **CSS/JS cache with revalidation** - Balance between caching and updates
5. ✅ **API proxy** - `/api/` routes to backend (localhost:8080)
6. ✅ **HTTPS with Let's Encrypt** - SSL certificates
7. ✅ **HTTP to HTTPS redirect** - Forces secure connections
8. ⚠️ **Gulp proxy (port 3000)** - This should be removed for production deployment

---

## 📝 Recommended Production Config for New VM

### Option 1: Simple Static Serving (No Backend Proxy)

Use this if your backend is on a **different server** or you want the browser to connect directly to backend.

```nginx
server {
    listen 80;
    server_name verathailand.online www.verathailand.online;

    # Root directory (will be updated by deployment)
    root /var/www/core-frontend;
    index production/login.html production/index.html;

    # Logging
    access_log /var/log/nginx/verathailand-access.log;
    error_log /var/log/nginx/verathailand-error.log;

    # Gzip compression (IMPORTANT for performance)
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Vendors directory - Long cache (30 days)
    location /vendors/ {
        alias /var/www/core-frontend/vendors/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Build directory - Medium cache (3 days)
    location /build/ {
        alias /var/www/core-frontend/build/;
        access_log off;
        expires 3d;
        add_header Cache-Control "public, max-age=259200";
    }

    # Images and fonts - Week cache
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800";
    }

    # HTML files - No cache (always get latest)
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
    }

    # CSS and JS - Cache with revalidation
    location ~* \.(css|js)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800, must-revalidate";
    }

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }

    # HTTP to HTTPS redirect (will be added by Certbot)
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name verathailand.online www.verathailand.online;
    
    return 301 https://$host$request_uri;
}
```

---

### Option 2: With Backend API Proxy (Recommended)

Use this if your backend is on the **same server** and you want Nginx to proxy API requests.

**Benefits:**
- ✅ No CORS issues (same origin)
- ✅ Backend can stay on localhost (more secure)
- ✅ Single domain for frontend and backend
- ✅ Can add rate limiting, caching, etc.

```nginx
server {
    listen 80;
    server_name verathailand.online www.verathailand.online;

    # Root directory
    root /var/www/core-frontend;
    index production/login.html production/index.html;

    # Logging
    access_log /var/log/nginx/verathailand-access.log;
    error_log /var/log/nginx/verathailand-error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API proxy - IMPORTANT: This must come BEFORE other locations
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Vendors directory - Long cache (30 days)
    location /vendors/ {
        alias /var/www/core-frontend/vendors/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Build directory - Medium cache (3 days)
    location /build/ {
        alias /var/www/core-frontend/build/;
        access_log off;
        expires 3d;
        add_header Cache-Control "public, max-age=259200";
    }

    # Images and fonts - Week cache
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800";
    }

    # HTML files - No cache
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
    }

    # CSS and JS - Cache with revalidation
    location ~* \.(css|js)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800, must-revalidate";
    }

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name verathailand.online www.verathailand.online;
    
    return 301 https://$host$request_uri;
}
```

---

## 🔴 What to Remove from Your Current Config

### 1. **Gulp Proxy (Port 3000)** - ❌ Remove this
```nginx
# ❌ REMOVE THIS - Only for development
location / {
    proxy_pass http://localhost:3000;  # Gulp server
    ...
}
```

**Why?** 
- Gulp is a development tool
- In production, you serve static files directly
- No need for browser-sync or live reload

### 2. **Update Root Path** - Change this
```nginx
# OLD (current)
root /var/www/html/VeraThailandia/production;

# NEW (for deployment)
root /var/www/core-frontend;
```

---

## 🎯 Recommended Configuration for Your New VM

Based on your current setup, here's what I recommend:

### Full Production Config with HTTPS:

```nginx
# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name verathailand.online www.verathailand.online;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/verathailand.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/verathailand.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Root directory
    root /var/www/core-frontend;
    index production/login.html production/index.html;

    # Logging
    access_log /var/log/nginx/verathailand-access.log;
    error_log /var/log/nginx/verathailand-error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_comp_level 6;
    gzip_proxied any;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API proxy (if backend is on same server)
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Vendors directory - Long cache (30 days)
    location /vendors/ {
        alias /var/www/core-frontend/vendors/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Build directory - Medium cache (3 days)
    location /build/ {
        alias /var/www/core-frontend/build/;
        access_log off;
        expires 3d;
        add_header Cache-Control "public, max-age=259200";
    }

    # Production directory for images
    location /production/images/ {
        alias /var/www/core-frontend/production/images/;
        access_log off;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # Images and fonts - Week cache
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800";
    }

    # HTML files - No cache (always get latest)
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
    }

    # CSS and JS - Cache with revalidation
    location ~* \.(css|js)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800, must-revalidate";
    }

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name verathailand.online www.verathailand.online;
    
    return 301 https://$host$request_uri;
}
```

---

## 📋 Step-by-Step Setup on New VM

### 1. Create the config file:
```bash
sudo nano /etc/nginx/sites-available/verathailand
```

### 2. Paste the configuration (choose Option 1 or 2 above)

### 3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/verathailand /etc/nginx/sites-enabled/
```

### 4. Test configuration:
```bash
sudo nginx -t
```

### 5. Remove default site (if needed):
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 6. Reload Nginx:
```bash
sudo systemctl reload nginx
```

### 7. Set up HTTPS with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d verathailand.online -d www.verathailand.online
```

Certbot will automatically:
- Add SSL certificates
- Update your config with HTTPS
- Set up auto-renewal

---

## 🔄 Configuration Comparison

| Feature | Your Current Config | Simple Config (I gave) | Recommended Config |
|---------|-------------------|----------------------|-------------------|
| Gzip compression | ✅ Yes | ❌ No | ✅ Yes |
| Static file caching | ✅ Yes | ✅ Basic | ✅ Advanced |
| HTML cache prevention | ✅ Yes | ❌ No | ✅ Yes |
| API proxy | ✅ Yes | ❌ No | ✅ Optional |
| HTTPS | ✅ Yes | ❌ No | ✅ Yes |
| Security headers | ⚠️ Partial | ✅ Yes | ✅ Enhanced |
| Gulp proxy | ⚠️ Yes (remove) | ❌ No | ❌ No |
| HTTP/2 | ❌ No | ❌ No | ✅ Yes |

---

## 🎯 My Recommendation

Use **Option 2 (With Backend API Proxy)** because:

1. ✅ **No CORS issues** - Frontend and API on same domain
2. ✅ **Better security** - Backend can stay on localhost
3. ✅ **Easier SSL** - One certificate for everything
4. ✅ **Better performance** - Gzip, caching, HTTP/2
5. ✅ **Production-ready** - All features from your current setup

---

## 🔧 If Backend is on Same Server

### Update your GitHub Secret:
```
BACKEND_API_URL = "https://verathailand.online/api"
```

**NOT:**
```
BACKEND_API_URL = "http://localhost:8080"  ❌
```

**Why?** Because the browser needs to access it, and the Nginx proxy will handle routing to localhost:8080.

---

## 🔧 If Backend is on Different Server

### Keep backend URL direct:
```
BACKEND_API_URL = "https://api.verathailand.online"
```

And **remove** the `/api/` proxy block from Nginx config.

---

## 📊 Performance Benefits

With the recommended config:

- **Gzip compression:** ~70% reduction in file sizes
- **Static caching:** Vendors load instantly after first visit
- **HTTP/2:** Faster parallel loading
- **Optimized headers:** Better browser caching

---

## ✅ Summary

**Use this config** (the full production one above) because it:
1. ✅ Keeps all your current production features
2. ✅ Removes the Gulp proxy (not needed in production)
3. ✅ Updates paths for new deployment structure
4. ✅ Adds HTTP/2 for better performance
5. ✅ Includes all security headers
6. ✅ Works with GitHub Actions deployment

The simple config I gave earlier was too basic - this production config is much better! 🚀

