import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { readReplicas } from '@prisma/extension-read-replicas';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

const prismaFactory = (configService: ConfigService) => {
    const replica1 = new PrismaClient({
        adapter: new PrismaPg({
            connectionString: configService.get<string>('database.replica1Url'),
        }),
    });

    const replica2 = new PrismaClient({
        adapter: new PrismaPg({
            connectionString: configService.get<string>('database.replica2Url'),
        }),
    });

    const client = new PrismaClient({
        adapter: new PrismaPg({
            connectionString: configService.get<string>('database.url'),
        }),
    }).$extends(
        readReplicas({
            replicas: [replica1, replica2],
        }),
    );
    return client;
};

@Global()
@Module({
    providers: [
        {
            provide: PrismaService,
            useFactory: prismaFactory,
            inject: [ConfigService],
        },
    ],
    exports: [PrismaService],
})
export class DatabaseModule { }
