import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prismaService = app.get(PrismaService);
    const logger = new Logger('VerifyReplicas');

    logger.log('Checking Prisma Service instance...');

    // Check if the client has extension methods
    const isExtended = '$primary' in prismaService && '$replica' in prismaService;

    if (isExtended) {
        logger.log('SUCCESS: PrismaService is using the extended client with Read Replicas.');
        logger.log(`Found $primary: ${typeof (prismaService as any).$primary}`);
        logger.log(`Found $replica: ${typeof (prismaService as any).$replica}`);
    } else {
        logger.error('FAILURE: PrismaService is NOT using the extended client.');
    }

    await app.close();
}

bootstrap();
