# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Node.js Version

This project requires Node.js **24.13.1** as specified in [.nvmrc](.nvmrc). Always activate it before running any command, especially when installing packages or running scripts that depend on native bindings (e.g., Prisma engines):

```bash
nvm use   # reads .nvmrc automatically
```

Failure to use the correct version will cause `pnpm install` to fail for packages with Node.js engine requirements (e.g., Prisma 7+ requires Node.js >=20.19, 22.12+, or 24.0+).

## Commands

```bash
# Development
pnpm start:dev         # Watch mode (runs config:sync pre-hook automatically)
pnpm start:debug       # Debug mode with watch

# Build & Production
pnpm build             # Compile TypeScript → dist/
pnpm start:prod        # Run compiled build

# Testing
pnpm test              # Unit tests (*.spec.ts in src/)
pnpm test:watch        # Watch mode
pnpm test:cov          # Coverage report → coverage/
pnpm test:e2e          # E2E tests (*.e2e-spec.ts in test/)

# Single test file
pnpm test -- --testPathPattern=health.controller

# Code Quality
pnpm lint              # ESLint with auto-fix
pnpm format            # Prettier format

# Data & Config
pnpm config:sync       # Sync .env vars to LocalStack (Secrets Manager + SSM)
pnpm sync:images       # Fetch TMDB poster/backdrop images into DB

# Infrastructure
docker-compose up -d   # Start CockroachDB cluster (3 nodes) + LocalStack
```

## Architecture

**Stack:** NestJS v11 + Apollo GraphQL (code-first) + Fastify + CockroachDB + Prisma ORM + LocalStack (AWS emulation)

### Module Structure

```
src/
├── app.module.ts
├── main.ts                     # Fastify bootstrap with Helmet, CORS, CSRF, cookies
├── config/
│   ├── configuration.ts        # Loads secrets from AWS Secrets Manager at startup
│   └── env.validation.ts       # Zod schema validates env vars before app starts
├── database/                   # Global module — PrismaService available everywhere
├── health/                     # REST endpoints: GET /health/live, GET /health/ready
├── catalog/                    # Main business domain
│   ├── application/
│   │   ├── queries/            # CQRS query definitions
│   │   └── handlers/           # QueryBus handlers (execute DB queries)
│   ├── presentation/
│   │   ├── resolvers/          # GraphQL resolvers dispatch via QueryBus
│   │   ├── dataloaders/        # REQUEST-scoped, prevent N+1
│   │   └── dto/                # Paginated response wrappers
│   └── domain/entities/        # @ObjectType() GraphQL types
├── common/
│   └── pagination/             # Generic PaginatedResponse<T> factory + PaginationArgs
└── graphql/schema.gql          # Auto-generated — do not edit manually
```

### Key Patterns

**CQRS:** Resolvers dispatch queries via `QueryBus`. Handlers in `application/handlers/` contain the Prisma queries. Adding a new query requires: query class → handler → register in module's `CqrsModule`.

**DataLoaders:** All nested GraphQL field resolvers (e.g., `movie.viewSummaries`, `tvShow.seasons`) use REQUEST-scoped DataLoaders. The loader batches IDs and uses `groupBy` for one-to-many. New resolvers using `@ResolveField` should follow this pattern.

**Pagination:** Generic factory `PaginatedResponse<T>` creates a class with `nodes`, `hasNext`, `hasPrevious`, `totalCount`, `page`, `pageSize`. Implemented by fetching `pageSize + 1` rows to determine `hasNext`.

**Read Replicas:** `DatabaseModule` wraps `PrismaClient` with `@prisma/extension-read-replicas`. Write queries go to the primary (`SECRET_DATABASE_URL`); reads are distributed across two replicas. The `PrismaService` extends the extended client type.

**Config Loading:** On startup, `configuration.ts` reads all `SECRET_*` env vars from AWS Secrets Manager (LocalStack locally) and `SSM_*` vars from Parameter Store. The `config:sync` script (`aws/local/sync.ts`) populates LocalStack from the `.env` file — it runs automatically as a pre-hook before `start`, `start:dev`, and `build`.

### Infrastructure

**CockroachDB:** 3-node cluster via docker-compose (`roach1:26257`, `roach2:26258`, `roach3:26259`). Initialized with `database/seed/netflixdb-postgres.sql` (8.3MB Netflix viewing data).

**LocalStack:** Emulates Secrets Manager and SSM on port 4566. Credentials are always `test/test` locally.

**Health checks** (`GET /health/ready`) validate: Prisma DB ping, Secrets Manager `ListSecrets`, SSM `DescribeParameters`.

### GraphQL Schema

Code-first — decorators generate the schema. Auto-written to `src/graphql/schema.gql` on startup. Available queries:
- `movie(id)`, `movies(page, pageSize, title)` → Movie / PaginatedMovie
- `tvShow(id)`, `tvShows(page, pageSize, title)` → TvShow / PaginatedTvShow

Nested: `Movie.viewSummaries`, `TvShow.seasons`, `Season.viewSummaries`

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SECRET_DATABASE_URL` | Primary CockroachDB connection |
| `SECRET_DATABASE_URL_REPLICA_1` | Read replica 1 |
| `SECRET_DATABASE_URL_REPLICA_2` | Read replica 2 |
| `PORT` | HTTP server port (default 3000) |
| `ENV` | `local` uses LocalStack endpoint; any other value uses real AWS |
| `TMDB_API_KEY` | For `sync:images` script |
