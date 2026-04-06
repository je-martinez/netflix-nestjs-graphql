import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
    readonly client: Redis;

    constructor(
        @InjectPinoLogger(CacheService.name) private readonly logger: PinoLogger,
        configService: ConfigService,
    ) {
        const redisUrl = configService.get<string>('redis.url', 'redis://localhost:6379');
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

    private static readonly ISO_DATE_RE =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

    private serialize(value: unknown): string {
        return JSON.stringify(value, (_, v) =>
            typeof v === 'bigint' ? v.toString() : v,
        );
    }

    private deserialize<T>(data: string): T {
        return JSON.parse(data, (_, v) =>
            typeof v === 'string' && CacheService.ISO_DATE_RE.test(v)
                ? new Date(v)
                : v,
        ) as T;
    }

    async onModuleInit(): Promise<void> {
        await this.connect();
    }

    async connect(): Promise<void> {
        await this.client.connect();
        this.logger.info('Redis connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (!data) {
                this.logger.debug(`MISS  ${key}`);
                return null;
            }
            this.logger.debug(`HIT   ${key}`);
            return this.deserialize<T>(data);
        } catch {
            this.logger.warn(`Cache get failed for key: ${key}`);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            await this.client.set(key, this.serialize(value), 'EX', ttlSeconds);
            this.logger.debug(`SET   ${key} (ttl=${ttlSeconds}s)`);
        } catch (err: unknown) {
            this.logger.warn(`Cache set failed for key "${key}": ${(err as Error).message}`);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
            this.logger.debug(`DEL   ${key}`);
        } catch {
            this.logger.warn(`Cache del failed for key: ${key}`);
        }
    }

    async mget<T>(keys: string[]): Promise<(T | null)[]> {
        if (keys.length === 0) return [];
        try {
            const results = await this.client.mget(...keys);
            const parsed = results.map((r) => (r ? this.deserialize<T>(r) : null));
            const hits = parsed.filter(Boolean).length;
            const misses = keys.length - hits;
            this.logger.debug(
                `MGET  ${hits} hit / ${misses} miss  (${this.keyPattern(keys)} ×${keys.length})`,
            );
            return parsed;
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
                pipeline.set(key, this.serialize(value), 'EX', ttlSeconds);
            }
            await pipeline.exec();
            const keys = entries.map(([k]) => k);
            this.logger.debug(
                `MSET  ${entries.length} keys (ttl=${ttlSeconds}s)  (${this.keyPattern(keys)} ×${entries.length})`,
            );
        } catch (err: unknown) {
            this.logger.warn(`Cache mset failed for ${entries.length} keys: ${(err as Error).message}`);
        }
    }

    private keyPattern(keys: string[]): string {
        const prefix = keys[0].substring(0, keys[0].lastIndexOf(':'));
        return `${prefix}:*`;
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
