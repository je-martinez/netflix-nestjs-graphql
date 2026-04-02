import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

export function graphqlConfig(): ApolloDriverConfig {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    driver: ApolloDriver,
    autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
    sortSchema: true,
    playground: false,
    introspection: !isProd,
    plugins: !isProd ? [ApolloServerPluginLandingPageLocalDefault()] : [],
  };
}
