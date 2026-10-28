# syntax=docker/dockerfile:1

# Build context is frontend/. The Caddyfile comes from a second named context,
# "deploy", pointing at ../deploy:
#   docker build --build-context deploy=deploy -f frontend/Dockerfile frontend
# (compose: build.additional_contexts: { deploy: ./deploy })

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /build

# Lockfile first so the npm ci layer is cached between source changes
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Run stage ----
FROM caddy:2-alpine

# The caddy binary carries cap_net_bind_service, so a non-root user can still bind :80/:443.
# /data (certificates) and /config (autosave) must be writable; mount them as named volumes.
RUN addgroup -S -g 10001 caddy \
    && adduser -S -D -H -u 10001 -G caddy caddy \
    && chown -R caddy:caddy /data /config

COPY --from=deploy Caddyfile /etc/caddy/Caddyfile
COPY --from=build /build/dist/client /srv

ENV SITE_ADDRESS=http://localhost

USER caddy
EXPOSE 80 443
