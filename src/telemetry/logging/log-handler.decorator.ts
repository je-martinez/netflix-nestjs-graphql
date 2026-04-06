import { PinoLogger } from 'nestjs-pino';

interface HandlerWithLogger {
  readonly logger: PinoLogger;
}

/**
 * Method decorator for CQRS query/command handlers.
 *
 * Emits two structured debug log entries around `execute()`:
 *   - "started"   — handler name + all non-undefined query params
 *   - "completed" — handler name + elapsed ms (or "failed" on error)
 *
 * Requires the decorated class to have `readonly logger: PinoLogger` injected
 * via `@InjectPinoLogger(ClassName.name)`.
 */
export function LogHandler(): MethodDecorator {
  return (target, _key, descriptor: PropertyDescriptor): PropertyDescriptor => {
    const original = descriptor.value as (query: object) => Promise<unknown>;
    const handlerName = (target as { constructor: { name: string } }).constructor.name;

    descriptor.value = async function (this: HandlerWithLogger, query: object) {
      const { logger } = this;
      const params = definedEntries(query);
      const start = Date.now();

      logger.debug({ handler: handlerName, params }, `${handlerName} started`);

      try {
        const result = await original.call(this, query);
        logger.debug({ handler: handlerName, ms: Date.now() - start }, `${handlerName} completed`);
        return result;
      } catch (err) {
        logger.error({ handler: handlerName, ms: Date.now() - start, err }, `${handlerName} failed`);
        throw err;
      }
    };

    return descriptor;
  };
}

function definedEntries(obj: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}
