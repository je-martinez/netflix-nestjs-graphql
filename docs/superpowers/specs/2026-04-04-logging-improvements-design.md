# Logging Improvements — Design Spec
**Date:** 2026-04-04
**Status:** Approved
**Scope:** Local dev (docker-compose)

---

## Overview

Replace NestJS's built-in logger with `nestjs-pino` (backed by Pino, which Fastify already uses internally), inject OpenTelemetry `traceId`/`spanId` and a `userId` into every log line, and ship structured JSON logs to Loki for visualization in a new Grafana dashboard.

No changes to the existing OpenTelemetry, Prometheus, or metrics dashboard — logging is additive.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  NestJS App (Fastify)                                   │
│                                                         │
│  nestjs-pino ──► Pino Logger                           │
│                      │                                  │
│                      ├─ mixin: otelMixin()              │
│                      │   ├─ traceId, spanId, traceFlags │
│                      │   └─ userId ('anonymous' default)│
│                      │                                  │
│                      ├─ transport: pino-pretty (local)  │
│                      └─ transport: pino-loki ──► Loki  │
└─────────────────────────────────────────────────────────┘
                                    │
                              ┌─────▼──────┐
                              │    Loki     │  docker-compose
                              └─────┬──────┘
                                    │
                              ┌─────▼──────┐
                              │   Grafana  │  datasource: Loki
                              │  Dashboard │  ID 18042 (marketplace)
                              └────────────┘
```

**Request flow:**
1. Fastify receives request → OTEL auto-instruments and creates a span.
2. Any `logger.log()` call in the app triggers Pino.
3. `otelMixin()` calls `trace.getActiveSpan()` and extracts `traceId` + `spanId`.
4. `nestjs-cls` provides `userId` from the request-scoped store (defaults to `'anonymous'`).
5. Pino serializes the log as JSON: `{ level, time, msg, traceId, spanId, traceFlags, userId, ... }`.
6. `pino-loki` batches and ships logs to Loki with labels `{ service, env }`.
7. Grafana queries Loki with LogQL and renders the dashboard.

---

## Components

### 1. `nestjs-pino` — NestJS Logger replacement

`LoggerModule.forRoot()` registered globally in `app.module.ts`. Bridges the NestJS logger with Fastify's internal Pino instance so both share the same configuration.

**Configuration:**
- `level`: from `LOG_LEVEL` env var, default `'info'`.
- `transport.targets`: two targets in parallel — `pino-pretty` (local) and `pino-loki`.
- `mixin`: `otelMixin` (see below).
- `redact`: `['req.headers.authorization', 'req.headers.cookie']` — sensitive headers never logged.
- `serializers`: `req` → `{ method, url }`, `res` → `{ statusCode }`.

**New env var:** `LOG_LEVEL` (optional, default `'info'`). Added to `.env`, `env.validation.ts` Zod schema, and `aws/local/sync.ts`.

### 2. `otelMixin` — Trace + user context injection

File: `src/telemetry/otel-pino.mixin.ts`

Executed on every Pino log call. Extracts the active OTEL span context and the CLS-stored `userId`:

```typescript
import { trace, isSpanContextValid } from '@opentelemetry/api';
import { ClsServiceManager } from 'nestjs-cls';

export function otelMixin() {
  const otel: Record<string, unknown> = {};

  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    if (isSpanContextValid(ctx)) {
      otel.traceId    = ctx.traceId;
      otel.spanId     = ctx.spanId;
      otel.traceFlags = ctx.traceFlags;
    }
  }

  const cls = ClsServiceManager.getClsService();
  const userId = cls?.get<string>('userId') ?? 'anonymous';

  return { ...otel, userId };
}
```

**Why it works without manual context passing:** OTEL auto-instruments Fastify and creates the span before NestJS handles the request. The mixin runs inside that async context, so `getActiveSpan()` always returns the correct span.

**Future userId injection** (when auth is added):
```typescript
// In any AuthGuard or JwtStrategy — no mixin changes needed
this.cls.set('userId', jwtPayload.sub);
```

### 3. `nestjs-cls` — Per-request async store

Registered globally in `app.module.ts` via `ClsModule.forRoot({ middleware: { mount: true } })`. The CLS middleware mounts an async store at the start of every HTTP request. Any code within that request (guards, interceptors, resolvers) can read/write the store via `ClsService`.

### 4. Loki — Log aggregation

Added to `docker-compose.yml`:

```yaml
loki:
  image: grafana/loki:3.3.2
  ports:
    - "3100:3100"
  command: -config.file=/etc/loki/local-config.yaml
  volumes:
    - loki_data:/loki

volumes:
  loki_data: {}
```

Uses Loki's built-in `local-config.yaml` — no extra config file for local dev.

Grafana's `depends_on` in docker-compose must be updated to include `loki` alongside `prometheus`.

### 5. `pino-loki` — Log transport

Second Pino transport target. Batches log lines and pushes them to Loki every 5 seconds.

**Configuration:**
- `host`: from `LOKI_URL` env var, default `'http://localhost:3100'`.
- `labels`: `{ service: 'netflix-nestjs-graphql', env }` — enables filtering in LogQL.
- `batching: true`, `interval: 5`.

**New env var:** `LOKI_URL` (optional, default `'http://localhost:3100'`). Added to `.env`, `env.validation.ts`, and `aws/local/sync.ts`.

**Sample log line shipped to Loki:**
```json
{
  "level": "info",
  "time": 1712200000000,
  "msg": "Resolving query: movies",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId":  "00f067aa0ba902b7",
  "traceFlags": 1,
  "userId": "anonymous",
  "req": { "method": "POST", "url": "/graphql" }
}
```

### 6. Grafana Loki datasource

New provisioning file: `observability/grafana/provisioning/datasources/loki.yml`

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    uid: loki
    url: http://loki:3100
    isDefault: false
    jsonData:
      derivedFields:
        - name: TraceID
          matcherRegex: '"traceId":"(\w+)"'
          url: ''
          datasourceUid: ''
```

`derivedFields` is pre-configured so that when Tempo is added in the future, each log line will automatically render a clickable link to its trace — requiring only filling in the `url` and `datasourceUid` fields.

### 7. Grafana dashboard — Loki Logs (ID 18042)

Dashboard from the [Grafana marketplace](https://grafana.com/grafana/dashboards/18042-logging-dashboard-via-loki-v2/) downloaded and provisioned automatically via the existing provisioning mechanism.

**Why ID 18042:** Purpose-built for Loki v2+, includes log volume over time, log level breakdown, full log explorer with free-text search, and label filters. Complements the existing `nestjs-overview.json` (metrics) without overlap.

**Useful LogQL queries after implementation:**
```logql
# All logs for this service
{service="netflix-nestjs-graphql"} | json

# Errors only
{service="netflix-nestjs-graphql"} | json | level="error"

# Logs for a specific trace
{service="netflix-nestjs-graphql"} | json | traceId="<id>"

# Logs for a specific user (future)
{service="netflix-nestjs-graphql"} | json | userId="user_123"
```

---

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `nestjs-pino` | prod | NestJS logger adapter |
| `pino-http` | prod | HTTP request logging (peer dep of nestjs-pino) |
| `pino-loki` | prod | Loki transport for Pino |
| `nestjs-cls` | prod | Per-request async store (userId) |
| `pino-pretty` | dev | Human-readable logs in local terminal |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `info` | Minimum log level for Pino |
| `LOKI_URL` | `http://localhost:3100` | Loki push endpoint |

Both added to `.env`, `env.validation.ts` (Zod, optional), and `aws/local/sync.ts`.

---

## What Does NOT Change

- `src/telemetry/instrument.ts` — OTEL SDK initialization unchanged.
- `src/telemetry/metrics.service.ts` — custom metrics unchanged.
- `src/telemetry/metrics.interceptor.ts` — metrics interceptor unchanged.
- `src/telemetry/apollo-metrics.plugin.ts` — Apollo error counter unchanged.
- `observability/grafana/provisioning/dashboards/nestjs-overview.json` — existing metrics dashboard unchanged.
- Prometheus scrape config — unchanged.
- All existing `Logger` usages in the codebase — `nestjs-pino` intercepts them transparently.

---

## File Changelist

```
Modified:
  docker-compose.yml                                        ← add loki service + loki_data volume
  src/app.module.ts                                         ← add LoggerModule + ClsModule (global)
  src/main.ts                                               ← remove NestFactory logger override if present
  src/config/env.validation.ts                              ← add LOG_LEVEL, LOKI_URL (optional)
  aws/local/sync.ts                                         ← add LOG_LEVEL, LOKI_URL to LocalStack sync
  .env                                                      ← add LOG_LEVEL=info, LOKI_URL=http://localhost:3100

New:
  src/telemetry/otel-pino.mixin.ts                          ← otelMixin function
  observability/grafana/provisioning/datasources/loki.yml   ← Loki datasource auto-provisioning
  observability/grafana/provisioning/dashboards/loki-logs-18042.json ← marketplace dashboard JSON
```

---

## Future Extensions

- **Tempo integration:** Add Grafana Tempo to docker-compose as a trace backend. Fill in `derivedFields.url` and `derivedFields.datasourceUid` in `loki.yml` to enable log→trace linking.
- **Auth userId:** Add `this.cls.set('userId', payload.sub)` in the JWT guard — no other changes needed.
- **Production log shipping:** Remove `pino-loki` transport, configure app to write JSON to stdout, add Promtail/Alloy as a sidecar to ship container logs to Loki.
