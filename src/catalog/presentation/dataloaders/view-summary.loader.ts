import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { PrismaService } from '@/database/prisma.service';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class ViewSummaryLoader extends DataLoader<string, ViewSummary[]> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) {
        super(async (movieIds: readonly string[]) => {
            const cacheKeys = movieIds.map((id) => `${CachePrefix.VIEW_SUMMARY_MOVIE}:${id}`);
            const cached = await this.cache.mget<ViewSummary[]>(cacheKeys);

            const missedIds: string[] = [];
            const missedIndexes: number[] = [];
            for (let i = 0; i < movieIds.length; i++) {
                if (!cached[i]) {
                    missedIds.push(movieIds[i]);
                    missedIndexes.push(i);
                }
            }

            if (missedIds.length > 0) {
                const viewSummaries = await this.prisma.view_summary.findMany({
                    where: {
                        movie_id: { in: missedIds.map((id) => BigInt(id)) },
                    },
                });

                const groupedByMovieId = new Map<string, ViewSummary[]>();
                viewSummaries.forEach((summary) => {
                    const movieId = summary.movie_id?.toString();
                    if (movieId) {
                        if (!groupedByMovieId.has(movieId)) {
                            groupedByMovieId.set(movieId, []);
                        }
                        groupedByMovieId.get(movieId)?.push({
                            ...summary,
                            id: summary.id.toString(),
                            movieId: summary.movie_id?.toString(),
                            seasonId: summary.season_id?.toString(),
                            cumulativeWeeksInTop10: Number(summary.cumulative_weeks_in_top10),
                            views: Number(summary.views),
                            viewRank: Number(summary.view_rank),
                            hoursViewed: Number(summary.hours_viewed),
                            startDate: summary.start_date,
                            endDate: summary.end_date,
                            createdDate: summary.created_date,
                            modifiedDate: summary.modified_date,
                            duration: summary.duration,
                        });
                    }
                });

                const toCache: [string, ViewSummary[]][] = [];
                for (let i = 0; i < missedIds.length; i++) {
                    const data = groupedByMovieId.get(missedIds[i]) || [];
                    cached[missedIndexes[i]] = data;
                    toCache.push([cacheKeys[missedIndexes[i]], data]);
                }
                await this.cache.mset(toCache, CacheTTL.DATALOADER);
            }

            return movieIds.map((_, i) => cached[i] || []);
        });
    }
}
