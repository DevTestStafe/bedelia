# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json files
COPY package.json ./
COPY api/package.json api/package.json
COPY api/package-lock.json api/package-lock.json 2>/dev/null || true

# Copy api source code
COPY api/src api/src
COPY api/tsconfig.json api/tsconfig.json

# Install and build api
RUN cd api && npm install && npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json files
COPY package.json ./
COPY api/package.json api/package.json
COPY api/package-lock.json api/package-lock.json 2>/dev/null || true

# Copy compiled code from builder
COPY --from=builder /app/api/dist api/dist

# Install only production dependencies
RUN cd api && npm install --omit=dev --legacy-peer-deps

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

# Start command
CMD ["npm", "start"]
