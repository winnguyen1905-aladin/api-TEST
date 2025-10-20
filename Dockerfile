# ================================
# Stage 1: Build
# ================================
FROM node:18 AS builder

# Set working directory
WORKDIR /app

# Install Python and build dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:18-slim AS production

# Set working directory
WORKDIR /app

# Install Python and minimal dependencies for mediasoup runtime
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files if any
COPY room-config.json ./
COPY redis.conf ./

# Expose port (adjust based on your server configuration)
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8090/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server.js"]
