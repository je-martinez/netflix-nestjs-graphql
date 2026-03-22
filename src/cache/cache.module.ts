import { CacheService } from '@/cache/infrastructure/cache.service';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
    providers: [
        {
            provide: CacheService,
            useFactory: async (configService: ConfigService) => {
                const redisUrl = configService.get<string>('redis.url', 'redis://localhost:6379');
                const service = new CacheService(redisUrl);
                await service.connect();
                return service;
            },
            inject: [ConfigService],
        },
    ],
    exports: [CacheService],
})
export class CacheModule { }
