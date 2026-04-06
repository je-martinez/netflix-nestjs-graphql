import { ClsServiceManager } from 'nestjs-cls';

// trace_id / span_id / trace_flags are injected automatically by
// @opentelemetry/instrumentation-pino (included in auto-instrumentations-node).
// Adding them here would produce duplicate fields in every log entry.
export function otelMixin(): Record<string, unknown> {
  const cls = ClsServiceManager.getClsService();
  return { userId: cls?.get<string>('userId') ?? 'anonymous' };
}
