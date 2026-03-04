# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy api subdirectory
COPY api/ api/

# Install root dependencies (actually just needed for the build script to work)
RUN npm install --omit=dev || true

# Install and build api
RUN npm --prefix api install && npm --prefix api run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy api subdirectory
COPY api/ api/

# Install only production dependencies
RUN npm --prefix api install --omit=dev

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

# Start command
CMD ["npm", "start"]
