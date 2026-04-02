import { CacheModule } from '@/cache/cache.module';
import { CatalogModule } from '@/catalog/catalog.module';
import configuration from '@/config/configuration';
import { validate } from '@/config/env.validation';
import { DatabaseModule } from '@/database/database.module';
import { HealthModule } from '@/health/health.module';
import { graphqlConfig } from '@/config/graphql.config';
import { TelemetryModule } from '@/telemetry/telemetry.module';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
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
