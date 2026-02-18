import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';
import loadConfig from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`, 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: [`'self'`, 'https://fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'https://cdn.jsdelivr.net'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`, `https://cdn.jsdelivr.net`],
      },
    },
  });

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : '*',
    credentials: true,
  });

  // CSRF Protection
  // Note: GraphQL often uses other methods for CSRF, but if using cookies for auth, this is needed.
  // For this setup, we'll keep it simple or strictly follow if user wants full CSRF with cookies.
  // Using @fastify/csrf-protection requiring @fastify/cookie
  await app.register(import('@fastify/cookie'));
  await app.register(import('@fastify/csrf-protection'), {
    cookieOpts: {
      signed: true,
    },
  });

  const config = loadConfig();
  await app.listen(config.port, '0.0.0.0');
}
bootstrap();
