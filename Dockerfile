FROM node:22-slim

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY packages/bot/package*.json ./packages/bot/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (tsx needed at runtime)
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/bot ./packages/bot
COPY tsconfig.json ./

# Set production environment
ENV NODE_ENV=production

# Run the bot via tsx (TypeScript execution)
CMD ["npm", "run", "start", "--workspace=@mockingboard/bot"]
