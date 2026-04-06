import { Plugin } from '@nestjs/apollo';
import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Plugin()
export class ApolloLoggingPlugin implements ApolloServerPlugin {
  constructor(
    @InjectPinoLogger(ApolloLoggingPlugin.name)
    private readonly logger: PinoLogger,
  ) {}

  async requestDidStart(
    requestContext: GraphQLRequestContext<Record<string, unknown>>,
  ): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    const operationName =
      requestContext.request.operationName ??
      extractOperationName(requestContext.request.query) ??
      'anonymous';

    const logger = this.logger;

    return {
      async willSendResponse({ response }) {
        if (response.body.kind !== 'single') return;

        const errors = response.body.singleResult.errors;
        if (!errors?.length) return;

        logger.error(
          {
            graphqlOperation: operationName,
            graphqlErrors: errors.map((e) => ({
              message: e.message,
              path: e.path,
              extensions: e.extensions,
            })),
          },
          'GraphQL request completed with errors',
        );
      },
    };
  }
}

function extractOperationName(query?: string): string | undefined {
  if (!query) return undefined;
  return query.match(/^\s*(?:query|mutation|subscription)\s+(\w+)/i)?.[1];
}
