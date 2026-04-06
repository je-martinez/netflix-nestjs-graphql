import { Params } from 'nestjs-pino';
import { otelMixin } from './otel-pino.mixin';

const defaultLevel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV !== 'production' ? 'debug' : 'info');

export function loggerConfig(): Params {
  return {
    pinoHttp: {
      level: defaultLevel,
      mixin: otelMixin,
      customProps: (req: unknown) => {
        const body = (req as { body?: { operationName?: string; query?: string } }).body;
        if (!body) return {};
        const name =
          body.operationName ??
          body.query?.match(/^\s*(?:query|mutation|subscription)\s+(\w+)/i)?.[1];
        return name ? { graphqlOperation: name } : {};
      },
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
          ...(process.env.NODE_ENV !== 'production'
            ? [{ target: 'pino-pretty', level: 'debug', options: { colorize: true } }]
            : []),
          {
            target: 'pino-loki',
            level: defaultLevel,
            options: {
              host: process.env.LOKI_URL ?? 'http://localhost:3100',
              labels: {
                service: 'netflix-nestjs-graphql',
                env: process.env.ENV ?? 'local',
                container: 'netflix-nestjs-graphql',
                pod: 'app',
                stream: 'stdout',
              },
              batching: { interval: 5 },
            },
          },
        ],
      },
    },
  };
}
