# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Copy api directory (includes package.json, package-lock.json, src, tsconfig.json)
COPY api/ api/

# Copy web directory
COPY web/ web/

# Build frontend against same origin (/api)
ENV VITE_API_URL=

# Install and build api + web
RUN cd api && npm install && npm run build
RUN cd web && npm install && npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Copy api directory
COPY api/ api/

# Copy compiled code from builder
COPY --from=builder /app/api/dist api/dist
COPY --from=builder /app/web/dist api/public

# Install only production dependencies
RUN cd api && npm install --omit=dev

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

# Start command
CMD ["npm", "start"]
