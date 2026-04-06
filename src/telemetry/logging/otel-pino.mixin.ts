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
