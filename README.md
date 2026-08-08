# Stockify Client

TanStack Start frontend for Stockify's point-of-sale, inventory, orders, invoicing, expenses, reporting, and administration workflows.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `STOCKIFY_API_URL` to the Stockify API origin, without the `/api` suffix.
3. Install dependencies with `bun install`.
4. Start the application with `bun run dev`.

The browser calls the same-origin `/api/public/backend/*` route. That server route reads `STOCKIFY_API_URL` and forwards requests to the API, so the backend URL is never exposed as browser configuration.

## Checks

```sh
bun run lint
bun run test
bunx tsc --noEmit
bun run build
```

Never commit `.env`, `.dev.vars`, or production credentials. Keep `.env.example` limited to safe placeholders.

## Docker

The client is deployed independently from the API. Set `DOCKER_STOCKIFY_API_URL` in `.env` to an address reachable from inside the container, then run:

```sh
docker compose up --build -d
```

By default the UI is available at `http://localhost:3000` and the container reaches a backend running on the host at `http://host.docker.internal:5042`. Override `STOCKIFY_CLIENT_PORT` or `DOCKER_STOCKIFY_API_URL` as needed. The Compose file does not create, modify, or depend on the Server project.
