# ─────────────────────────────────────────────
# Dockerfile — frontend-main (Static HTML + Nginx)
# ─────────────────────────────────────────────
FROM nginx:1.25-alpine

# Install bash for entrypoint compatibility
RUN apk add --no-cache bash

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entire production directory to nginx html root
COPY production/ /usr/share/nginx/html/production/

# Copy vendors directory (CSS/JS libraries referenced by HTML)
COPY vendors/ /usr/share/nginx/html/vendors/

# Copy build assets (compiled CSS/JS)
COPY build/ /usr/share/nginx/html/build/

# Copy the runtime entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Railway assigns PORT dynamically — default Nginx listens on 80
EXPOSE 80

# Use entrypoint to inject BACKEND_URL into config.js before starting Nginx
ENTRYPOINT ["/entrypoint.sh"]
