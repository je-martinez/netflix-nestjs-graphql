# Logging Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace NestJS's built-in logger with `nestjs-pino`, inject OTEL `traceId`/`spanId` and a `userId` (default `'anonymous'`) into every log line, ship logs to Loki, and provision a Grafana logging dashboard.

**Architecture:** Pino replaces the NestJS default logger and shares the Fastify internal logger instance. A mixin function reads the active OpenTelemetry span and `nestjs-cls` store on every log call to inject trace context and userId. A `pino-loki` transport ships batched JSON logs to a new Loki container; a Grafana datasource and marketplace dashboard (ID 18042) complete the stack.

**Tech Stack:** `nestjs-pino` v4, `pino-loki` v2, `nestjs-cls` v4, `pino-pretty` (dev), Grafana Loki v3.3.2, `@opentelemetry/api`, `nestjs-cls`

---

## File Map

```
New:
  src/telemetry/otel-pino.mixin.ts                                   ← otelMixin function
  src/telemetry/otel-pino.mixin.spec.ts                              ← unit tests for the mixin
  observability/grafana/provisioning/datasources/loki.yml            ← Loki datasource provisioning
  observability/grafana/provisioning/dashboards/loki-logs-18042.json ← marketplace dashboard

Modified:
  .env                                  ← add LOG_LEVEL, LOKI_URL
  src/config/env.validation.ts          ← add LOG_LEVEL, LOKI_URL (optional Zod fields)
  docker-compose.yml                    ← add loki service + loki_data volume + grafana depends_on
  src/app.module.ts                     ← add ClsModule.forRoot + LoggerModule.forRoot
  src/main.ts                           ← add app.useLogger(app.get(Logger))
```

---

## Task 1: Install packages

**Files:** `package.json` (modified by pnpm)

- [ ] **Step 1: Activate correct Node.js version**

```bash
nvm use
```
Expected output: `Now using node v24.13.1`

- [ ] **Step 2: Install production dependencies**

```bash
pnpm add nestjs-pino pino-http pino-loki nestjs-cls
```

Expected: packages added without errors. `pino-http` is a required peer of `nestjs-pino`.

- [ ] **Step 3: Install dev dependency**

```bash
pnpm add -D pino-pretty
```

- [ ] **Step 4: Verify installations**

```bash
node -e "require('nestjs-pino'); require('pino-loki'); require('nestjs-cls'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add nestjs-pino, pino-loki, nestjs-cls, pino-pretty"
```

---

## Task 2: Add environment variables

**Files:**
- Modify: `.env`
- Modify: `src/config/env.validation.ts`

- [ ] **Step 1: Add vars to `.env`**

Append these two lines to `.env`:

```
LOG_LEVEL=info
LOKI_URL=http://localhost:3100
```

- [ ] **Step 2: Add optional Zod fields to `src/config/env.validation.ts`**

The current schema (`envSchema`) ends with `ENV: z.string().optional()`. Add the two new optional fields:

```typescript
import { z } from 'zod';

export const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    DATABASE_URL_REPLICA_1: z.string().url(),
    DATABASE_URL_REPLICA_2: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    ENV: z.string().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    LOKI_URL: z.string().url().default('http://localhost:3100'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`Config validation error: ${result.error.message}`);
    }
    return result.data;
}
```

- [ ] **Step 3: Verify validation still works**

```bash
pnpm build --dry-run 2>&1 | head -5
```

Or just run TypeScript check:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .env src/config/env.validation.ts
git commit -m "feat: add LOG_LEVEL and LOKI_URL env vars"
```

---

## Task 3: Create `otelMixin` with unit tests (TDD)

**Files:**
- Create: `src/telemetry/otel-pino.mixin.ts`
- Create: `src/telemetry/otel-pino.mixin.spec.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/telemetry/otel-pino.mixin.spec.ts`:

```typescript
import { otelMixin } from './otel-pino.mixin';

jest.mock('@opentelemetry/api', () => ({
  trace: { getActiveSpan: jest.fn() },
  isSpanContextValid: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: { getClsService: jest.fn() },
}));

import * as otelApi from '@opentelemetry/api';
import { ClsServiceManager } from 'nestjs-cls';

const mockGetActiveSpan = otelApi.trace.getActiveSpan as jest.Mock;
const mockIsSpanContextValid = otelApi.isSpanContextValid as jest.Mock;
const mockGetClsService = ClsServiceManager.getClsService as jest.Mock;

describe('otelMixin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no active OTEL span', () => {
    it('returns only userId anonymous', () => {
      mockGetActiveSpan.mockReturnValue(undefined);
      mockGetClsService.mockReturnValue(null);

      expect(otelMixin()).toEqual({ userId: 'anonymous' });
    });
  });

  describe('when active span has invalid context', () => {
    it('returns only userId anonymous', () => {
      mockGetActiveSpan.mockReturnValue({ spanContext: () => ({}) });
      mockIsSpanContextValid.mockReturnValue(false);
      mockGetClsService.mockReturnValue(null);

      expect(otelMixin()).toEqual({ userId: 'anonymous' });
    });
  });

  describe('when active span is valid', () => {
    it('returns traceId, spanId, traceFlags, and userId anonymous', () => {
      mockGetActiveSpan.mockReturnValue({
        spanContext: () => ({
          traceId: 'aabbccdd11223344aabbccdd11223344',
          spanId: 'aabbccdd11223344',
          traceFlags: 1,
        }),
      });
      mockIsSpanContextValid.mockReturnValue(true);
      mockGetClsService.mockReturnValue(null);

      expect(otelMixin()).toEqual({
        traceId: 'aabbccdd11223344aabbccdd11223344',
        spanId: 'aabbccdd11223344',
        traceFlags: 1,
        userId: 'anonymous',
      });
    });
  });

  describe('when CLS store has a userId', () => {
    it('returns the stored userId', () => {
      mockGetActiveSpan.mockReturnValue(undefined);
      mockGetClsService.mockReturnValue({ get: jest.fn().mockReturnValue('user_42') });

      expect(otelMixin()).toEqual({ userId: 'user_42' });
    });
  });

  describe('when CLS store get returns undefined', () => {
    it('falls back to anonymous', () => {
      mockGetActiveSpan.mockReturnValue(undefined);
      mockGetClsService.mockReturnValue({ get: jest.fn().mockReturnValue(undefined) });

      expect(otelMixin()).toEqual({ userId: 'anonymous' });
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test -- --testPathPattern=otel-pino.mixin
```

Expected: FAIL — `Cannot find module './otel-pino.mixin'`

- [ ] **Step 3: Implement `src/telemetry/otel-pino.mixin.ts`**

```typescript
import { isSpanContextValid, trace } from '@opentelemetry/api';
import { ClsServiceManager } from 'nestjs-cls';

export function otelMixin(): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    if (isSpanContextValid(ctx)) {
      result.traceId = ctx.traceId;
      result.spanId = ctx.spanId;
      result.traceFlags = ctx.traceFlags;
    }
  }

  const cls = ClsServiceManager.getClsService();
  result.userId = cls?.get<string>('userId') ?? 'anonymous';

  return result;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=otel-pino.mixin
```

Expected:
```
PASS  src/telemetry/otel-pino.mixin.spec.ts
  otelMixin
    when no active OTEL span
      ✓ returns only userId anonymous
    when active span has invalid context
      ✓ returns only userId anonymous
    when active span is valid
      ✓ returns traceId, spanId, traceFlags, and userId anonymous
    when CLS store has a userId
      ✓ returns the stored userId
    when CLS store get returns undefined
      ✓ falls back to anonymous
```

- [ ] **Step 5: Commit**

```bash
git add src/telemetry/otel-pino.mixin.ts src/telemetry/otel-pino.mixin.spec.ts
git commit -m "feat: add otelMixin for traceId, spanId, and userId injection in logs"
```

---

## Task 4: Add Loki to docker-compose

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add Loki service and volume**

Replace the entire `docker-compose.yml` with the following (adds `loki` service, `loki_data` volume, and updates `grafana.depends_on`):

```yaml
version: '3.9'

services:
  roach1:
    image: cockroachdb/cockroach:latest-v23.1
    container_name: roach1
    hostname: roach1
    ports:
      - "26257:26257"
      - "8080:8080"
    command: start --insecure --join=roach1,roach2,roach3
    volumes:
      - roach1-data:/cockroach/cockroach-data

  roach2:
    image: cockroachdb/cockroach:latest-v23.1
    container_name: roach2
    hostname: roach2
    ports:
      - "26258:26257"
    command: start --insecure --join=roach1,roach2,roach3
    volumes:
      - roach2-data:/cockroach/cockroach-data

  roach3:
    image: cockroachdb/cockroach:latest-v23.1
    container_name: roach3
    hostname: roach3
    ports:
      - "26259:26257"
    command: start --insecure --join=roach1,roach2,roach3
    volumes:
      - roach3-data:/cockroach/cockroach-data

  roach-init:
    image: cockroachdb/cockroach:latest-v23.1
    container_name: roach-init
    hostname: roach-init
    volumes:
      - ./database/seed/netflixdb-postgres.sql:/seed/netflixdb.sql
    depends_on:
      - roach1
      - roach2
      - roach3
    entrypoint:
      - "/bin/bash"
    command: >
      -c "
      echo 'Waiting for servers to be up...';
      sleep 10;
      /cockroach/cockroach init --insecure --host=roach1;
      echo 'Cluster initialized.';
      sleep 5;
      echo 'Creating database...';
      /cockroach/cockroach sql --insecure --host=roach1 --execute='CREATE DATABASE IF NOT EXISTS netflix;';
      echo 'Seeding database...';
      /cockroach/cockroach sql --insecure --host=roach1 --database=netflix --file=/seed/netflixdb.sql;
      echo 'Database seeded.';
      "

  redis:
    image: redis:7-alpine
    container_name: redis
    hostname: redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  localstack:
    image: localstack/localstack
    container_name: localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=ssm,secretsmanager
      - DEFAULT_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=test
      - AWS_SECRET_ACCESS_KEY=test

  prometheus:
    image: prom/prometheus:v2.54.1
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=7d'
      - '--web.enable-lifecycle'
    extra_hosts:
      - "host.docker.internal:host-gateway"

  loki:
    image: grafana/loki:3.3.2
    container_name: loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/loki

  grafana:
    image: grafana/grafana:11.4.0
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=false
      - GF_FEATURE_TOGGLES_ENABLE=publicDashboards
    volumes:
      - grafana-data:/var/lib/grafana
      - ./observability/grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
      - loki

volumes:
  roach1-data:
  roach2-data:
  roach3-data:
  redis-data:
  prometheus-data:
  grafana-data:
  loki_data:
```

- [ ] **Step 2: Verify Loki starts**

```bash
docker-compose up -d loki
sleep 5
curl -s http://localhost:3100/ready
```

Expected: `ready`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add Loki to docker-compose for log aggregation"
```

---

## Task 5: Configure `ClsModule` and `LoggerModule` in app

**Files:**
- Modify: `src/app.module.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Update `src/app.module.ts`**

Replace the full file:

```typescript
import { CacheModule } from '@/cache/cache.module';
import { CatalogModule } from '@/catalog/catalog.module';
import configuration from '@/config/configuration';
import { validate } from '@/config/env.validation';
import { DatabaseModule } from '@/database/database.module';
import { HealthModule } from '@/health/health.module';
import { graphqlConfig } from '@/config/graphql.config';
import { TelemetryModule } from '@/telemetry/telemetry.module';
import { otelMixin } from '@/telemetry/otel-pino.mixin';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        mixin: otelMixin,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req: (req: { method: string; url: string }) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
        },
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              level: 'debug',
              options: { colorize: true },
            },
            {
              target: 'pino-loki',
              level: process.env.LOG_LEVEL ?? 'info',
              options: {
                host: process.env.LOKI_URL ?? 'http://localhost:3100',
                labels: {
                  service: 'netflix-nestjs-graphql',
                  env: process.env.ENV ?? 'local',
                },
                batching: true,
                interval: 5,
              },
            },
          ],
        },
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig()),
    TelemetryModule,
    HealthModule,
    DatabaseModule,
    CacheModule,
    CatalogModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
```

- [ ] **Step 2: Update `src/main.ts` to use the Pino logger**

Add `app.useLogger(app.get(Logger))` after `NestFactory.create`. Replace the full file:

```typescript
// MUST be the very first import — patches http, pg, ioredis, etc. before NestJS loads
import '@/telemetry/instrument';
import { AppModule } from '@/app.module';
import loadConfig from '@/config/configuration';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const isProd = process.env.NODE_ENV === 'production';

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`, ...(!isProd ? ['unpkg.com', 'apollo-server-landing-page.cdn.apollographql.com'] : [])],
        styleSrc: [`'self'`, `'unsafe-inline'`, 'cdn.jsdelivr.net', 'fonts.googleapis.com', ...(!isProd ? ['unpkg.com'] : [])],
        fontSrc: [`'self'`, 'fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net', ...(!isProd ? ['apollo-server-landing-page.cdn.apollographql.com'] : [])],
        scriptSrc: [`'self'`, ...(!isProd ? [`'unsafe-inline'`, `'unsafe-eval'`, 'cdn.jsdelivr.net', 'unpkg.com', 'embeddable-sandbox.cdn.apollographql.com'] : [])],
        ...(!isProd && {
          frameSrc: [`'self'`, 'https://sandbox.embed.apollographql.com'],
          connectSrc: [`'self'`, 'https://sandbox.embed.apollographql.com'],
        }),
      },
    },
  });

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : '*',
    credentials: true,
  });

  // CSRF Protection
  await app.register(import('@fastify/cookie'));
  await app.register(import('@fastify/csrf-protection'), {
    cookieOpts: {
      signed: true,
    },
  });

  const config = await loadConfig();
  await app.listen(config.port, '0.0.0.0');
}
bootstrap();
```

Note: `bufferLogs: true` tells NestFactory to buffer any logs emitted before `app.useLogger()` is called and then flush them through Pino once the logger is set up.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all unit tests to verify nothing broke**

```bash
pnpm test
```

Expected: all tests pass (including `otel-pino.mixin.spec.ts`).

- [ ] **Step 5: Start the app and verify Pino logs appear**

Make sure docker-compose is running (`docker-compose up -d`), then:

```bash
pnpm start:dev
```

Expected: logs appear in Pino's pretty format in the terminal, e.g.:

```
[12:00:00.000] INFO: Nest application successfully started
    module: "NestApplication"
```

- [ ] **Step 6: Commit**

```bash
git add src/app.module.ts src/main.ts
git commit -m "feat: integrate nestjs-pino and nestjs-cls as global NestJS logger"
```

---

## Task 6: Add Grafana Loki datasource

**Files:**
- Create: `observability/grafana/provisioning/datasources/loki.yml`

- [ ] **Step 1: Create the datasource provisioning file**

Create `observability/grafana/provisioning/datasources/loki.yml`:

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

The UID `loki` matches what the dashboard JSON will reference. The `derivedFields` entry is a no-op today but pre-configures the link for when Tempo is added later.

- [ ] **Step 2: Restart Grafana to pick up the new datasource**

```bash
docker-compose restart grafana
sleep 5
```

- [ ] **Step 3: Verify Loki datasource in Grafana**

Open [http://localhost:3001/connections/datasources](http://localhost:3001/connections/datasources) (admin/admin).

Expected: "Loki" datasource appears in the list. Click "Test" — it should return "Data source connected and labels found."

> If labels are not found yet, start the app (`pnpm start:dev`), make a request, wait 5–10 seconds for pino-loki to flush, then test again.

- [ ] **Step 4: Commit**

```bash
git add observability/grafana/provisioning/datasources/loki.yml
git commit -m "feat: add Grafana Loki datasource provisioning"
```

---

## Task 7: Download and provision Grafana dashboard 18042

**Files:**
- Create: `observability/grafana/provisioning/dashboards/loki-logs-18042.json`

- [ ] **Step 1: Download the dashboard JSON from Grafana marketplace**

```bash
curl -s "https://grafana.com/api/dashboards/18042/revisions/latest/download" \
  -o observability/grafana/provisioning/dashboards/loki-logs-18042.json
```

- [ ] **Step 2: Verify the download succeeded**

```bash
head -5 observability/grafana/provisioning/dashboards/loki-logs-18042.json
```

Expected: valid JSON starting with `{` or `{"__inputs":`.

- [ ] **Step 3: Replace datasource template variables with provisioned UID**

The downloaded JSON contains `${DS_LOKI}` (Grafana's datasource template variable) which works during manual import but not during file provisioning. Replace it with the provisioned UID `loki`:

```bash
sed -i '' 's/\${DS_LOKI}/loki/g' observability/grafana/provisioning/dashboards/loki-logs-18042.json
```

On Linux (without `''` after `-i`):
```bash
sed -i 's/\${DS_LOKI}/loki/g' observability/grafana/provisioning/dashboards/loki-logs-18042.json
```

- [ ] **Step 4: Remove `__inputs` and `__requires` top-level keys if present**

Grafana provisioning ignores `__inputs` but it can cause confusion. Check:

```bash
grep -c '"__inputs"' observability/grafana/provisioning/dashboards/loki-logs-18042.json
```

If output is `1`, the keys are present. Remove them using Node.js (avoids dependency on `jq`):

```bash
node -e "
  const fs = require('fs');
  const path = 'observability/grafana/provisioning/dashboards/loki-logs-18042.json';
  const dash = JSON.parse(fs.readFileSync(path, 'utf8'));
  delete dash.__inputs;
  delete dash.__requires;
  fs.writeFileSync(path, JSON.stringify(dash, null, 2));
  console.log('Done');
"
```

- [ ] **Step 5: Restart Grafana to load the new dashboard**

```bash
docker-compose restart grafana
sleep 8
```

- [ ] **Step 6: Verify the dashboard appears in Grafana**

Open [http://localhost:3001/dashboards](http://localhost:3001/dashboards) (admin/admin).

Expected: "Logging Dashboard via Loki" appears in the dashboard list.

- [ ] **Step 7: Verify logs appear in the dashboard**

1. Start the app: `pnpm start:dev`
2. Make a GraphQL request (e.g., `curl -s -X POST http://localhost:3000/graphql -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}'`)
3. Wait ~10 seconds for pino-loki to batch and flush.
4. Open the dashboard and set time range to "Last 5 minutes".
5. Expected: log entries appear with `level`, `msg`, `userId: "anonymous"`, and `traceId`/`spanId` fields visible.

- [ ] **Step 8: Commit**

```bash
git add observability/grafana/provisioning/dashboards/loki-logs-18042.json
git commit -m "feat: provision Grafana Loki logs dashboard (ID 18042) from marketplace"
```

---

## Task 8: Full run test

**No file changes — verification only.**

- [ ] **Step 1: Start the full stack**

```bash
docker-compose up -d
```

Wait ~15 seconds for all services to initialize.

- [ ] **Step 2: Start the app**

```bash
pnpm start:dev
```

- [ ] **Step 3: Send a test GraphQL request**

```bash
curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' | jq .
```

Expected: `{ "data": { "__typename": "Query" } }`

- [ ] **Step 4: Verify log fields in terminal**

In the `pnpm start:dev` terminal, look for a log line containing:
- `traceId` — 32-character hex string
- `spanId` — 16-character hex string
- `userId` — `"anonymous"`

Example:
```json
{
  "level": "info",
  "time": 1712200000000,
  "msg": "request completed",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "traceFlags": 1,
  "userId": "anonymous",
  "req": { "method": "POST", "url": "/graphql" },
  "res": { "statusCode": 200 }
}
```

- [ ] **Step 5: Verify logs in Grafana Loki dashboard**

1. Open [http://localhost:3001/dashboards](http://localhost:3001/dashboards)
2. Open "Logging Dashboard via Loki"
3. Set time range to "Last 5 minutes"
4. Expected: log entries appear, filterable by `level` and `service`

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 7: Final commit**

```bash
git add -p  # review any remaining unstaged changes
git commit -m "feat: complete structured logging with Pino, Loki, and Grafana dashboard"
```

---

## Reference: Future userId injection (no changes needed to the mixin)

When authentication is added, inject the user ID in any guard or interceptor:

```typescript
import { ClsService } from 'nestjs-cls';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly cls: ClsService) {
    super();
  }

  handleRequest<T>(err: Error, user: T & { id: string }): T {
    if (err || !user) throw err || new UnauthorizedException();
    this.cls.set('userId', user.id);  // automatically picked up by otelMixin
    return user;
  }
}
```

## Reference: LogQL queries for the Loki dashboard

```logql
# All logs for this service
{service="netflix-nestjs-graphql"} | json

# Errors only
{service="netflix-nestjs-graphql"} | json | level="error"

# Filter by traceId (paste from a failing request)
{service="netflix-nestjs-graphql"} | json | traceId="4bf92f3577b34da6a3ce929d0e0e4736"

# Filter by userId (future, when auth exists)
{service="netflix-nestjs-graphql"} | json | userId="user_42"
```
