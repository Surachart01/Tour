# BACKEND_API_URL Secret - How It Works

## 🎯 Purpose

The `BACKEND_API_URL` secret tells your frontend application where to find your backend API server.

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: In Your Repository (Before Deployment)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  production/js/config.js                                 │  │
│  │                                                          │  │
│  │  const Endpoint = "http://127.0.0.1:8080";              │  │
│  │                                                          │  │
│  │  (This is just a placeholder for local development)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ GitHub Actions Workflow Triggered
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: During Deployment (GitHub Actions)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Workflow runs this command:                             │  │
│  │                                                          │  │
│  │  sed -i 's|const Endpoint = ".*";|                       │  │
│  │         const Endpoint = "${{ secrets.BACKEND_API_URL }}";|g' │  │
│  │         production/js/config.js                          │  │
│  │                                                          │  │
│  │  This REPLACES the URL with your secret value           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Example: If BACKEND_API_URL = "http://192.168.1.100:8080"     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  production/js/config.js (modified)                      │  │
│  │                                                          │  │
│  │  const Endpoint = "http://192.168.1.100:8080";          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Files deployed to VM
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: On Your VM (After Deployment)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /var/www/core-frontend/production/js/config.js          │  │
│  │                                                          │  │
│  │  const Endpoint = "http://192.168.1.100:8080";          │  │
│  │                                                          │  │
│  │  (Now has the correct backend URL)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ User accesses the website
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: In User's Browser                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User opens: http://vm-ip/production/trip.html          │  │
│  │                                                          │  │
│  │  Browser loads config.js and reads:                     │  │
│  │  const Endpoint = "http://192.168.1.100:8080";          │  │
│  │                                                          │  │
│  │  JavaScript makes API calls using this URL:             │  │
│  │  - fetch(`${Endpoint}/api/v1/quotations`)               │  │
│  │  - fetch(`${Endpoint}/api/v1/bookings`)                 │  │
│  │  - fetch(`${Endpoint}/api/v1/login`)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Where `Endpoint` is Used in Your Code

The `Endpoint` variable from `config.js` is used in **all your HTML files** for API calls.

### Examples from your code:

#### 1. **trip.html** (Quotations page)
```javascript
// Line 685 - Load all quotations
url = `${Endpoint}/api/v1/quotations`;

// Line 697 - Load quotations by date range
url = `${Endpoint}/api/v1/quotations/date-range?start_date=${fromDate}&end_date=${toDate}`;

// Line 1083 - Cancel a quotation
fetch(`${Endpoint}/api/v1/quotations/${tripId}/cancel`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  }
})

// Line 1165 - Delete a quotation
fetch(`${Endpoint}/api/v1/quotations/${tripId}`, {
  method: "DELETE",
})

// Line 1218 - Generate PDF
fetch(`${Endpoint}/api/v1/quotations/${tripId}/generate-pdf`, {
  method: "GET",
})

// Line 1266 - Send email
fetch(`${Endpoint}/api/v1/quotations/${tripId}/send-email`, {
  method: "POST",
})
```

#### 2. **booking.html** (Bookings page)
```javascript
// Line 719 - Load all bookings
url = `${Endpoint}/api/v1/bookings`;

// Line 731 - Load bookings by date range
url = `${Endpoint}/api/v1/bookings/date-range?start_date=${fromDate}&end_date=${toDate}`;

// Line 675 - Generate invoice PDF
fetch(`${Endpoint}/api/v1/bookings/${tripId}/generate-pdf`, {
  method: "GET",
})
```

#### 3. **login.html** (Login page)
```javascript
fetch(`${Endpoint}/api/v1/login`, {
  method: "POST",
  body: JSON.stringify({ username, password })
})
```

#### 4. **Other pages** use it similarly:
- `add_trip.html` - Create quotations
- `edit_trip.html` - Update quotations
- `hotels.html` - Manage hotels
- `users.html` - User management
- `activities.html` - Activities
- And many more...

---

## 🎯 What Value Should You Use?

### Option 1: Backend on Same VM
```
BACKEND_API_URL = "http://localhost:8080"
```
or
```
BACKEND_API_URL = "http://127.0.0.1:8080"
```

### Option 2: Backend on Different Server
```
BACKEND_API_URL = "http://192.168.1.100:8080"
```
or
```
BACKEND_API_URL = "http://backend.yourdomain.com:8080"
```

### Option 3: Backend with HTTPS (Production)
```
BACKEND_API_URL = "https://api.yourdomain.com"
```

---

## ⚠️ Important Considerations

### 1. **Accessibility from Browser**
The backend URL must be accessible from the **user's browser**, not just from the VM.

```
❌ BAD: BACKEND_API_URL = "http://localhost:8080"
   (localhost refers to user's computer, not your server)

✅ GOOD: BACKEND_API_URL = "http://your-vm-ip:8080"
   (accessible from anywhere)

✅ GOOD: BACKEND_API_URL = "https://api.yourdomain.com"
   (accessible from anywhere with HTTPS)
```

### 2. **CORS Configuration**
Your backend must allow requests from your frontend domain.

Example backend CORS config:
```go
// Allow requests from frontend
AllowOrigins: []string{
    "http://your-vm-ip",
    "https://yourdomain.com",
}
```

### 3. **Port Accessibility**
If backend is on a different server, ensure:
- Firewall allows the backend port (e.g., 8080)
- Backend is listening on the correct interface (not just localhost)

---

## 🧪 Testing the Backend URL

### Test 1: From Your Computer
```bash
# Test if backend is accessible
curl http://your-backend-url:8080/api/v1/health

# Should return a response (not connection refused)
```

### Test 2: From Browser
```
# Open in browser:
http://your-backend-url:8080/api/v1/health

# Should see JSON response or some output
```

### Test 3: From VM
```bash
# SSH into VM
ssh deploy@vm-ip

# Test backend connectivity
curl http://your-backend-url:8080/api/v1/health
```

### Test 4: After Deployment
```bash
# Check deployed config.js
ssh deploy@vm-ip "cat /var/www/core-frontend/production/js/config.js"

# Should show:
# const Endpoint = "http://your-backend-url:8080";
```

---

## 🔄 How to Change Backend URL

### If you need to change it later:

1. **Update GitHub Secret:**
   - Go to Repository → Settings → Secrets
   - Edit `BACKEND_API_URL`
   - Save new value

2. **Redeploy:**
   - Push to main branch, OR
   - Manually trigger workflow in Actions tab

3. **Verify:**
   ```bash
   ssh deploy@vm-ip "cat /var/www/core-frontend/production/js/config.js"
   ```

---

## 📝 Summary

**What happens:**
1. You set `BACKEND_API_URL` in GitHub Secrets
2. During deployment, workflow replaces the URL in `config.js`
3. Deployed `config.js` has your backend URL
4. All JavaScript files use this URL for API calls
5. User's browser makes requests directly to your backend

**Key Point:** The URL must be accessible from the user's browser, not just from your VM!

---

## 🆘 Troubleshooting

### Issue: API calls fail with "Connection refused"
**Check:**
- Is `BACKEND_API_URL` correct?
- Is backend running?
- Is backend accessible from browser (not just from VM)?
- Check browser console (F12) for exact error

### Issue: CORS errors in browser
**Check:**
- Backend CORS configuration allows frontend domain
- Backend logs for CORS-related errors

### Issue: Wrong URL in deployed config.js
**Check:**
- GitHub Secret `BACKEND_API_URL` is correct
- No extra spaces or quotes in secret value
- Redeploy after fixing secret

---

**Quick Check Command:**
```bash
# See what URL is deployed
ssh deploy@vm-ip "cat /var/www/core-frontend/production/js/config.js"
```

