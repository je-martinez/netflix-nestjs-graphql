import { CacheService } from '@/cache/infrastructure/cache.service';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class RedisHealthIndicator {
    constructor(
        private readonly healthIndicatorService: HealthIndicatorService,
        private readonly cache: CacheService,
    ) { }

    async check(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);
        try {
            const isHealthy = await this.cache.ping();
            if (isHealthy) {
                return indicator.up();
            }
            return indicator.down({ message: 'Redis ping failed' });
        } catch (e: any) {
            return indicator.down({ message: e.message });
        }
    }
}
