import { Plugin } from '@nestjs/apollo';
import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { FieldNode, OperationDefinitionNode } from 'graphql';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const IGNORED_OPERATIONS = new Set(['IntrospectionQuery']);

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

    if (IGNORED_OPERATIONS.has(operationName)) {
      return {};
    }

    const logger = this.logger;

    return {
      async didResolveOperation({ operation, request }) {
        if (!operation) return;

        const fields = topLevelFields(operation);
        const variables = request.variables;
        const graphqlProps: Record<string, unknown> = {
          graphqlOperation: operationName,
          graphqlType: operation.operation,
          graphqlFields: fields,
        };
        if (variables && Object.keys(variables).length > 0) {
          graphqlProps.graphqlVariables = variables;
        }

        // assign() writes into the request-scoped pino store so these fields
        // appear in the pino-http "request completed" log automatically.
        logger.assign(graphqlProps);

        // Separate debug entry with the full resolved context.
        logger.debug(graphqlProps, 'GraphQL operation resolved');
      },

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

function topLevelFields(operation: OperationDefinitionNode): string[] {
  return operation.selectionSet.selections
    .filter((s): s is FieldNode => s.kind === 'Field')
    .map((s) => s.name.value);
}
