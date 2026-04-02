/**
 * OpenTelemetry SDK initialization.
 *
 * IMPORTANT: This file MUST be the very first import in main.ts.
 * It must run before any other module is loaded so that auto-instrumentation
 * can patch Node.js built-ins (http, pg, ioredis, etc.) at startup.
 */
// Force HTTP instrumentation to emit stable semconv metric names
// (http.server.request.duration + http.request.method / http.response.status_code).
// Must be set before getNodeAutoInstrumentations() constructs the HttpInstrumentation.
process.env.OTEL_SEMCONV_STABILITY_OPT_IN = 'http';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';

const prometheusExporter = new PrometheusExporter({
  port: 9464,
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME ?? 'netflix-nestjs-graphql',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
    'deployment.environment':
      process.env.NODE_ENV ?? process.env.ENV ?? 'development',
  }),
  metricReaders: [prometheusExporter],
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy low-value instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      // Keep all useful instrumentations enabled by default:
      // http, fastify, graphql, pg, ioredis, nestjs-core, runtime-node, dataloader
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch((err) => console.error('OTEL shutdown error', err));
});
