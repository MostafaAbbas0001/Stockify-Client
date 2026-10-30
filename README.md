# Stockify Client

TanStack Start frontend for Stockify's point-of-sale, inventory, orders, invoicing, expenses, reporting, and administration workflows.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `STOCKIFY_API_URL` to the Stockify API origin, without the `/api` suffix.
3. Install dependencies with `bun install`.
4. Start the application with `bun run dev`.

The browser calls the same-origin `/api/public/backend/*` route. That server route reads `STOCKIFY_API_URL` and forwards requests to the API, so the backend URL is never exposed as browser configuration.

## Project structure

```
src/
├─ routes/     file routes, kept thin: path + search validation + permission gate → screen
├─ app/        providers, root error pages, app layout (shell, sidebar navigation)
├─ features/   one folder per area, mirroring the API:
│    auth · catalog · sales · inventory · people · finance · settings · lookups
│    each feature: api.ts · queries.ts · types.ts · screens/ · components/ · hooks/ · search.ts
└─ shared/     api client, UI primitives, shared components, i18n (en/ar), theme, formatting
```

Imports flow one way: `routes → features → shared`. Fixed lists (statuses, payment methods, sale and discount types) are never hard-coded: they come from `GET /api/lookups` through `useLookups()` in `features/lookups`, and their labels are translated by code (`lookups.<list>.<CODE>` in `shared/i18n`).

## Design system

The UI follows [DESIGN.md](DESIGN.md) (hairline borders, Geist type, an 18px radius on controls and 24px on containers, red only for errors and destructive actions) with the Stockify brand layered on top: navy text, brand-blue actions, links, focus and charts, the two-tone logo, and a deep-navy dark mode. Tokens live in `src/styles.css`.

- Build screens from the primitives in `src/shared/ui`:
  - `Button` and `buttonVariants`
  - `Input` and `Textarea`
  - `Field`, `FormError` and `CheckboxField`
  - `Badge`
  - `DialogContent size="…"`
- For page structure, use `src/shared/components/Surface.tsx`: `PageHeader`, `Card`, `CardHeader`, `StatStrip`, `TableShell`.
- Don't write inline class strings for controls.

Statuses are told apart by badge shape first (`StatusBadge`): solid blue = done, navy outline = confirmed, dashed blue = partial, red outline = failed.

On phones:

- the sidebar becomes a sheet,
- dialogs become bottom sheets,
- tables restack into labelled rows.

## Checks

```sh
bun run lint
bun run test
bunx tsc --noEmit
bun run build
```

Never commit `.env`, `.dev.vars`, or production credentials. Keep `.env.example` limited to safe placeholders.

## Docker

The container joins the external Docker network `stockify-network`, which the server's Compose file also uses. It reaches the API at `http://server:8080` (set in `docker-compose.yml`). Start the server stack first, then run:

```sh
docker compose up --build -d
```

The UI is available at `http://localhost:3000`; override the port with `STOCKIFY_CLIENT_PORT`.
