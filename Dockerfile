# Stage 1: Build the application with dev dependencies
FROM node:24-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

COPY . /app
WORKDIR /app

# Install all dependencies
RUN pnpm install

# Copy the application code and build the application
RUN pnpm build

# Stage 2: Create the final production image
FROM node:24-alpine
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY . /app
WORKDIR /app

# Install cURL for healthcheck
RUN apk add --no-cache curl
RUN apk add --no-cache libc6-compat

# Copy the package files and the built application from the builder stage
COPY --from=builder /app/public /app/public
COPY --from=builder /app/.next/standalone /app/
COPY --from=builder /app/.next/static /app/.next/static

# Start Next.js application
CMD ["node", "./server.js"]