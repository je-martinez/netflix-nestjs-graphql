import { AppModule } from '@/app.module';
import loadConfig from '@/config/configuration';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`, 'unpkg.com', 'apollo-server-landing-page.cdn.apollographql.com'],
        styleSrc: [`'self'`, `'unsafe-inline'`, 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'unpkg.com'],
        fontSrc: [`'self'`, 'fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net', 'apollo-server-landing-page.cdn.apollographql.com'],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`, 'cdn.jsdelivr.net', 'unpkg.com', 'embeddable-sandbox.cdn.apollographql.com'],
        frameSrc: [`'self'`, 'https://sandbox.embed.apollographql.com'],
        connectSrc: [`'self'`, 'https://sandbox.embed.apollographql.com'],
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

  const config = await loadConfig();
  await app.listen(config.port, '0.0.0.0');
}
bootstrap();
