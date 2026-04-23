# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies deterministically
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Prepare writable upload directory and drop privileges
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 5000

CMD ["npm", "run", "start"]
