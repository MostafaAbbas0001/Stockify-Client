# syntax=docker/dockerfile:1

FROM node:22-alpine AS dependencies
WORKDIR /app

# npm install uses the lockfile when present while repairing platform-specific
# optional dependencies omitted when the lockfile was generated on Windows.
COPY package*.json ./
RUN npm install --include=optional --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# The Docker runtime uses Nitro's Node server output. Other builds keep the
# Cloudflare preset configured in vite.config.ts.
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
