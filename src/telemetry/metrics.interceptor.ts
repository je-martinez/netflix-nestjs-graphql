import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Global interceptor that records custom GraphQL metrics for every root-level
 * resolver invocation.  HTTP metrics are already covered by the OTEL
 * auto-instrumentation for http / fastify, so we skip non-GraphQL contexts.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<string>() !== 'graphql') {
      return next.handle();
    }

    const gqlCtx = GqlExecutionContext.create(context);
    const info = gqlCtx.getInfo();

    // Only track root-level operations (path.prev === undefined)
    if (!info || info.path?.prev !== undefined) {
      return next.handle();
    }

    const operationName: string = info.fieldName ?? 'unknown';
    const operationType: string = info.operation?.operation ?? 'query';
    const startTime = Date.now();

    this.metricsService.incrementActive();
    this.metricsService.graphqlRequestsTotal.add(1, {
      'graphql.operation.name': operationName,
      'graphql.operation.type': operationType,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.metricsService.decrementActive();
        this.metricsService.graphqlRequestDuration.record(duration, {
          'graphql.operation.name': operationName,
          'graphql.operation.type': operationType,
          'graphql.success': 'true',
        });
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;
        this.metricsService.decrementActive();
        this.metricsService.graphqlRequestDuration.record(duration, {
          'graphql.operation.name': operationName,
          'graphql.operation.type': operationType,
          'graphql.success': 'false',
        });
        this.metricsService.graphqlErrorsTotal.add(1, {
          'graphql.operation.name': operationName,
          'graphql.operation.type': operationType,
        });
        return throwError(() => error);
      }),
    );
  }
}
