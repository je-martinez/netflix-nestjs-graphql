import { CatalogModule } from '@/catalog/catalog.module';
import configuration from '@/config/configuration';
import { validate } from '@/config/env.validation';
import { DatabaseModule } from '@/database/database.module';
import { HealthModule } from '@/health/health.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    HealthModule,
    HealthModule,
    DatabaseModule,
    CatalogModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
