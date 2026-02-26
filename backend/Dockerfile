# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --production
RUN npx prisma generate

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["npm", "run", "start"]
