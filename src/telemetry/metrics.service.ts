import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  metrics,
  ObservableGauge,
} from '@opentelemetry/api';

/**
 * Exposes custom application-level metrics on top of the auto-instrumented
 * ones (HTTP, pg, ioredis, runtime-node, etc.).
 *
 * Prometheus metric names (OTEL dots → underscores, unit appended):
 *   app_graphql_requests_total
 *   app_graphql_request_duration_milliseconds_{bucket,count,sum}
 *   app_graphql_errors_total
 *   app_active_graphql_operations (gauge)
 */
@Injectable()
export class MetricsService {
  private readonly meter = metrics.getMeter(
    'netflix-nestjs-graphql',
    process.env.npm_package_version ?? '1.0.0',
  );

  /** Total GraphQL resolver invocations (root level). */
  readonly graphqlRequestsTotal: Counter = this.meter.createCounter(
    'app.graphql.requests',
    {
      description: 'Total number of GraphQL root resolver calls',
      unit: '{requests}',
    },
  );

  /** Duration of each GraphQL root resolver call in milliseconds. */
  readonly graphqlRequestDuration: Histogram = this.meter.createHistogram(
    'app.graphql.request.duration',
    {
      description: 'GraphQL root resolver duration',
      unit: 'ms',
    },
  );

  /** Total GraphQL resolver errors. */
  readonly graphqlErrorsTotal: Counter = this.meter.createCounter(
    'app.graphql.errors',
    {
      description: 'Total number of GraphQL resolver errors',
      unit: '{errors}',
    },
  );

  /** Number of in-flight GraphQL operations (approximate). */
  private _activeOperations = 0;
  readonly activeGraphqlOperations: ObservableGauge =
    this.meter.createObservableGauge('app.active.graphql.operations', {
      description: 'Currently executing GraphQL operations',
      unit: '{operations}',
    });

  constructor() {
    this.activeGraphqlOperations.addCallback((result) => {
      result.observe(this._activeOperations);
    });
  }

  incrementActive(): void {
    this._activeOperations++;
  }

  decrementActive(): void {
    if (this._activeOperations > 0) this._activeOperations--;
  }
}
