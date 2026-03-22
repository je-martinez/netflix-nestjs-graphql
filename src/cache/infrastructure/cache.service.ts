import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    readonly client: Redis;

    constructor(redisUrl: string) {
        this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        this.client.on('error', (err) => {
            this.logger.error('Redis connection error', err.message);
        });
    }

    async connect(): Promise<void> {
        await this.client.connect();
        this.logger.log('Redis connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch {
            this.logger.warn(`Cache get failed for key: ${key}`);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            this.logger.warn(`Cache set failed for key: ${key}`);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch {
            this.logger.warn(`Cache del failed for key: ${key}`);
        }
    }

    async mget<T>(keys: string[]): Promise<(T | null)[]> {
        if (keys.length === 0) return [];
        try {
            const results = await this.client.mget(...keys);
            return results.map((r) => (r ? (JSON.parse(r) as T) : null));
        } catch {
            this.logger.warn(`Cache mget failed for ${keys.length} keys`);
            return keys.map(() => null);
        }
    }

    async mset(entries: [string, unknown][], ttlSeconds: number): Promise<void> {
        if (entries.length === 0) return;
        try {
            const pipeline = this.client.pipeline();
            for (const [key, value] of entries) {
                pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            }
            await pipeline.exec();
        } catch {
            this.logger.warn(`Cache mset failed for ${entries.length} keys`);
        }
    }

    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}
