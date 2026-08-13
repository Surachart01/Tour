FROM node:20-slim

# Install OpenSSL for Prisma engine compatibility
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8081

# Database migrations/imports are deliberate one-time operations. Running db push
# during every boot can block a healthy deployment or risk production data.
CMD ["node", "src/main.js"]
