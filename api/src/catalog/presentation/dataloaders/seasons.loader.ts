import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { Season } from '@/catalog/domain/entities/season.entity';
import { PrismaService } from '@/database/prisma.service';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class SeasonsLoader extends DataLoader<string, Season[]> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) {
        super(async (tvShowIds: readonly string[]) => {
            const cacheKeys = tvShowIds.map((id) => `${CachePrefix.SEASONS}:${id}`);
            const cached = await this.cache.mget<Season[]>(cacheKeys);

            const missedIds: string[] = [];
            const missedIndexes: number[] = [];
            for (let i = 0; i < tvShowIds.length; i++) {
                if (!cached[i]) {
                    missedIds.push(tvShowIds[i]);
                    missedIndexes.push(i);
                }
            }

            if (missedIds.length > 0) {
                const seasons = await this.prisma.season.findMany({
                    where: {
                        tv_show_id: { in: missedIds.map((id) => BigInt(id)) },
                    },
                });

                const groupedByTvShowId = new Map<string, Season[]>();
                seasons.forEach((season) => {
                    const tvShowId = season.tv_show_id?.toString();
                    if (tvShowId) {
                        if (!groupedByTvShowId.has(tvShowId)) {
                            groupedByTvShowId.set(tvShowId, []);
                        }
                        groupedByTvShowId.get(tvShowId)?.push({
                            ...season,
                            id: season.id.toString(),
                            seasonNumber: Number(season.season_number) || undefined,
                            runtime: Number(season.runtime) || undefined,
                            tvShowId: season.tv_show_id?.toString(),
                            originalTitle: season.original_title ?? undefined,
                            releaseDate: season.release_date || undefined,
                            createdDate: season.created_date,
                            modifiedDate: season.modified_date,
                        });
                    }
                });

                const toCache: [string, Season[]][] = [];
                for (let i = 0; i < missedIds.length; i++) {
                    const data = groupedByTvShowId.get(missedIds[i]) || [];
                    cached[missedIndexes[i]] = data;
                    toCache.push([cacheKeys[missedIndexes[i]], data]);
                }
                await this.cache.mset(toCache, CacheTTL.DATALOADER);
            }

            return tvShowIds.map((_, i) => cached[i] || []);
        });
    }
}
