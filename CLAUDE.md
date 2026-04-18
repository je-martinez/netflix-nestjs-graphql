# CLAUDE.md — netflix-nestjs-graphql

Monorepo with two projects: a GraphQL API (NestJS) and a movie catalog frontend (Astro).

## Monorepo structure

```
/
├── api/          # Backend — NestJS + Apollo GraphQL + CockroachDB + Prisma
├── web/          # Frontend — Astro SSG + Tailwind + Vitest + Unlighthouse
└── designs/      # Design reference: DESIGN.md, HTML mockups, screenshots
```

Each project has its own `CLAUDE.md` with detailed instructions:

- [api/CLAUDE.md](api/CLAUDE.md) — backend: commands, CQRS architecture, infrastructure, environment variables
- [web/CLAUDE.md](web/CLAUDE.md) — frontend: commands, feature structure, design system, testing

## Quick start

```bash
# 1. API (terminal 1)
cd api
nvm use
docker-compose up -d        # CockroachDB + LocalStack
pnpm start:dev              # → http://localhost:3000/graphql

# 2. Web (terminal 2)
cd web
nvm use
cp .env.example .env        # set PUBLIC_GRAPHQL_URL if needed
npm run dev                 # → http://localhost:4321
```

## Node.js

Both projects use Node.js **24** (`.nvmrc` in each folder). Always run `nvm use` before any command.

## Project relationship

The frontend consumes the backend's GraphQL schema:

- Queries used: `movies`, `movie(id)`
- When `PUBLIC_GRAPHQL_URL` is empty in `web/.env`, the frontend falls back to local mock data (see `web/src/features/catalog/services/movies.mock.ts`).

## Design

Visual reference files live in [designs/](designs/):

| File | Description |
|---|---|
| [designs/DESIGN.md](designs/DESIGN.md) | Full design system ("The Digital Rental Archive") |
| [designs/main-page.html](designs/main-page.html) | Catalog page HTML mockup |
| [designs/movie-details.html](designs/movie-details.html) | Movie detail/modal HTML mockup |
