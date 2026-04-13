# Netflix NestJS GraphQL

NestJS 11 · Apollo GraphQL (code-first) · Fastify · CockroachDB · Prisma 7 · Redis · LocalStack · **OpenTelemetry + Prometheus + Grafana**

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 24.13.1 (via `.nvmrc`) |
| pnpm | ≥ 10 |
| Docker + Docker Compose | any recent version |

```bash
nvm use          # activates Node 24.13.1 from .nvmrc
```

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start all infrastructure (DB + Redis + LocalStack + Prometheus + Grafana)
docker-compose up -d

# 3. Start the app in watch mode (syncs .env → LocalStack automatically)
pnpm start:dev
```

The app runs on **http://localhost:3000**  
Apollo sandbox: **http://localhost:3000/graphql** (dev only)

---

## Observability stack

### Ports at a glance

| Service | URL | Credentials |
|---------|-----|-------------|
| NestJS app | http://localhost:3000 | – |
| **OTEL metrics** | http://localhost:9464/metrics | – |
| **Prometheus** | http://localhost:9090 | – |
| **Grafana** | http://localhost:3001 | admin / admin |
| CockroachDB UI | http://localhost:8080 | – |

### Architecture

```
NestJS app (port 3000)
  └── OpenTelemetry SDK (instrument.ts – loaded first)
        ├── Auto-instrumentations: http · fastify · graphql · pg · ioredis
        │                          nestjs-core · dataloader · runtime-node
        └── PrometheusExporter → :9464/metrics
                                        ↑
                              Prometheus (scrapes every 10 s)
                                        ↑
                              Grafana (reads Prometheus, port 3001)
```

### What is measured automatically

| Layer | Metrics |
|-------|---------|
| HTTP | `http_server_request_duration_seconds` (histogram) per route + method + status |
| GraphQL | spans per operation / resolver (traces) |
| PostgreSQL / CockroachDB | query duration spans |
| Redis (ioredis) | command duration spans |
| NestJS | guard / interceptor / pipe spans |
| DataLoader | batch load spans |
| **Node.js runtime** | event-loop delay (p50/p90/p99/max), heap spaces, GC duration & count, event-loop utilisation |

### Custom application metrics

Defined in `src/telemetry/metrics.service.ts` and recorded by `src/telemetry/metrics.interceptor.ts`:

| Prometheus metric | Type | Labels |
|-------------------|------|--------|
| `app_graphql_requests_total` | counter | `graphql_operation_name`, `graphql_operation_type` |
| `app_graphql_request_duration_milliseconds` | histogram | `graphql_operation_name`, `graphql_operation_type`, `graphql_success` |
| `app_graphql_errors_total` | counter | `graphql_operation_name`, `graphql_operation_type` |
| `app_active_graphql_operations` | gauge | – |

---

## Grafana dashboard

The pre-built dashboard **"Netflix NestJS GraphQL – Overview"** is provisioned automatically at startup. It contains:

- **HTTP Overview** – request rate, 5xx error %, P95 latency, active operations  
- **HTTP Details** – request rate by route, latency percentiles (P50 / P95 / P99)  
- **GraphQL** – operation rate by name, P95 duration, error rate  
- **Node.js Runtime** – V8 heap (used vs limit), event-loop delay, event-loop utilisation, GC collections & duration  

Open Grafana at **http://localhost:3001** → Dashboards → *Netflix NestJS GraphQL – Overview*.

> **First load:** the dashboard may show "No data" until Prometheus has scraped at least one data point (≈ 10 s after the app starts).

### Discovering actual metric names

If a panel shows "No data", open Prometheus at **http://localhost:9090** and run:

```promql
{job="netflix-nestjs-graphql"}
```

This lists every metric scraped from the app. Paste the correct name into the dashboard panel editor if needed.

---

## Manual setup steps

### Resetting Grafana admin password

```bash
docker exec -it grafana grafana-cli admin reset-admin-password <new-password>
```

### Reloading Prometheus config without restart

```bash
curl -X POST http://localhost:9090/-/reload
```

### Running on Linux

The Prometheus config targets `host.docker.internal:9464`. On Linux that alias does not exist by default; `extra_hosts: - "host.docker.internal:host-gateway"` in `docker-compose.yml` handles it automatically with Docker ≥ 20.10. If you use an older Docker version, replace `host.docker.internal` in `observability/prometheus/prometheus.yml` with `172.17.0.1` (default bridge IP).

---

## Project commands

```bash
# Development
pnpm start:dev         # watch mode (config:sync runs automatically)
pnpm start:debug       # debug + watch

# Build & production
pnpm build
pnpm start:prod

# Tests
pnpm test              # unit tests
pnpm test:watch
pnpm test:cov          # coverage → coverage/
pnpm test:e2e

# Single test file
pnpm test -- --testPathPattern=health.controller

# Code quality
pnpm lint
pnpm format

# Data sync
pnpm config:sync       # push .env vars → LocalStack (Secrets Manager + SSM)
pnpm sync:images       # fetch TMDB poster/backdrop images into DB

# Infrastructure
docker-compose up -d                   # start everything
docker-compose up -d prometheus grafana  # observability stack only
docker-compose down                    # stop (volumes preserved)
docker-compose down -v                 # stop + delete volumes
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SECRET_DATABASE_URL` | Primary CockroachDB connection |
| `SECRET_DATABASE_URL_REPLICA_1` | Read replica 1 |
| `SECRET_DATABASE_URL_REPLICA_2` | Read replica 2 |
| `PORT` | HTTP server port (default 3000) |
| `ENV` | `local` uses LocalStack; anything else uses real AWS |
| `TMDB_API_KEY` | For `sync:images` script |
| `OTEL_SERVICE_NAME` | Override the service name reported to OTEL (default: `netflix-nestjs-graphql`) |

Copy `.env.example` to `.env` and fill in `TMDB_API_KEY` before running.

---

## Architecture overview

```
src/
├── main.ts                     # Fastify bootstrap (OTEL import MUST be first)
├── app.module.ts
├── telemetry/                  # OpenTelemetry
│   ├── instrument.ts           # NodeSDK init + PrometheusExporter on :9464
│   ├── metrics.service.ts      # Custom GraphQL meters
│   ├── metrics.interceptor.ts  # Records metrics per root resolver
│   └── telemetry.module.ts
├── config/
│   ├── configuration.ts        # Loads secrets from AWS Secrets Manager
│   ├── env.validation.ts       # Zod schema
│   └── graphql.config.ts
├── database/                   # Global PrismaService (primary + 2 read replicas)
├── health/                     # GET /health/live  GET /health/ready
├── catalog/                    # CQRS domain (movies, TV shows, seasons)
│   ├── application/queries|handlers/
│   ├── presentation/resolvers|dataloaders|dto/
│   └── domain/entities/
├── cache/                      # Redis module
└── common/pagination/          # Generic PaginatedResponse<T>

observability/
├── prometheus/prometheus.yml
└── grafana/provisioning/
    ├── datasources/prometheus.yml   # auto-provisioned
    └── dashboards/
        ├── dashboards.yml
        └── nestjs-overview.json     # pre-built dashboard
```
