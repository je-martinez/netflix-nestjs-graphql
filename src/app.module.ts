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
            ...(process.env.NODE_ENV !== 'production' ? [{
              target: 'pino-pretty',
              level: 'debug',
              options: { colorize: true },
            }] : []),
            {
              target: 'pino-loki',
              level: process.env.LOG_LEVEL ?? 'info',
              options: {
                host: process.env.LOKI_URL ?? 'http://localhost:3100',
                labels: {
                  service: 'netflix-nestjs-graphql',
                  env: process.env.ENV ?? 'local',
                },
                batching: {
                  interval: 5,
                },
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
