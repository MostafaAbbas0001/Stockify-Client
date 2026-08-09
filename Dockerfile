# syntax=docker/dockerfile:1

FROM node:22-alpine AS dependencies
WORKDIR /app

# Copy whichever npm metadata is available. Older deployments may not contain
# package-lock.json; once present, npm ci keeps installs deterministic.
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

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
