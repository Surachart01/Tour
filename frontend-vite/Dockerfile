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

# Copy build artifacts to nginx root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
