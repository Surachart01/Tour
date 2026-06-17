# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Declare build arguments
ARG VITE_API_URL

# Expose them as environment variables during build time
ENV VITE_API_URL=$VITE_API_URL

# Run build
RUN npm run build

# Stage 2: Serve stage
FROM nginx:alpine

# Default port environment variable for local runs
ENV PORT=80

# Copy build artifacts to nginx root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration template for dynamic port injection
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
