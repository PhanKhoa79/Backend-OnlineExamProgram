# Multi-stage build for production optimization
FROM oven/bun:1.1.27 AS builder

# Set working directory
WORKDIR /app

# Copy package files and lockfile
COPY package*.json bun.lock ./

# Install ALL dependencies (including devDependencies for build)
RUN bun install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.1.27 AS production

# Set working directory
WORKDIR /app

# Create app user and group for security (moved up)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files and lockfile
COPY package*.json bun.lock ./

# Install only production dependencies
RUN bun install --omit=dev --legacy-peer-deps

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy email templates
COPY --from=builder --chown=nestjs:nodejs /app/src/modules/email/templates ./src/modules/email/templates

# Create uploads directory and set ownership
RUN mkdir -p uploads && chown -R nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose port (Railway uses process.env.PORT)
EXPOSE ${PORT:-5000}

# Health check (customize to check application health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the application
CMD ["bun", "run", "dist/main.js"]