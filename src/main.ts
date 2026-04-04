// MUST be the very first import — patches http, pg, ioredis, etc. before NestJS loads
import '@/telemetry/instrument';
import { AppModule } from '@/app.module';
import loadConfig from '@/config/configuration';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const isProd = process.env.NODE_ENV === 'production';

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`, ...(!isProd ? ['unpkg.com', 'apollo-server-landing-page.cdn.apollographql.com'] : [])],
        styleSrc: [`'self'`, `'unsafe-inline'`, 'cdn.jsdelivr.net', 'fonts.googleapis.com', ...(!isProd ? ['unpkg.com'] : [])],
        fontSrc: [`'self'`, 'fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net', ...(!isProd ? ['apollo-server-landing-page.cdn.apollographql.com'] : [])],
        scriptSrc: [`'self'`, ...(!isProd ? [`'unsafe-inline'`, `'unsafe-eval'`, 'cdn.jsdelivr.net', 'unpkg.com', 'embeddable-sandbox.cdn.apollographql.com'] : [])],
        ...(!isProd && {
          frameSrc: [`'self'`, 'https://sandbox.embed.apollographql.com'],
          connectSrc: [`'self'`, 'https://sandbox.embed.apollographql.com'],
        }),
      },
    },
  });

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : '*',
    credentials: true,
  });

  // CSRF Protection
  await app.register(import('@fastify/cookie'));
  await app.register(import('@fastify/csrf-protection'), {
    cookieOpts: {
      signed: true,
    },
  });

  const config = await loadConfig();
  await app.listen(config.port, '0.0.0.0');
}
bootstrap();
