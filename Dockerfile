# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY packages/bot/package*.json ./packages/bot/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/bot ./packages/bot
COPY tsconfig.json ./

# Build both packages
RUN npm run build --workspace=@mockingboard/shared
RUN npm run build --workspace=@mockingboard/bot

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/bot/package*.json ./packages/bot/
COPY packages/shared/package*.json ./packages/shared/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist

# Copy shared package.json for module resolution
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# The Firebase service account key should be mounted as a secret
# In Cloud Run: --set-secrets=/app/firebase-key.json=firebase-key:latest

# Set production environment
ENV NODE_ENV=production

# Run the bot
CMD ["node", "packages/bot/dist/index.js"]
