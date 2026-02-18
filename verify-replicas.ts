import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/database/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prismaService = app.get(PrismaService);

    console.log('Checking Prisma Service instance...');

    // Check if the client has extension methods
    const isExtended = '$primary' in prismaService && '$replica' in prismaService;

    if (isExtended) {
        console.log('SUCCESS: PrismaService is using the extended client with Read Replicas.');
        console.log('Found $primary:', typeof (prismaService as any).$primary);
        console.log('Found $replica:', typeof (prismaService as any).$replica);
    } else {
        console.error('FAILURE: PrismaService is NOT using the extended client.');
    }

    await app.close();
}

bootstrap();
