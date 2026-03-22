import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { GetTvShowQuery } from '@/catalog/application/queries/get-tv-show.query';
import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { PrismaService } from '@/database/prisma.service';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetTvShowQuery)
export class GetTvShowHandler implements IQueryHandler<GetTvShowQuery> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { }

    async execute(query: GetTvShowQuery): Promise<TvShow | null> {
        const { id } = query;
        const cacheKey = `${CachePrefix.TV_SHOW}:${id}`;

        const cached = await this.cache.get<TvShow>(cacheKey);
        if (cached) return cached;

        const tvShow = await this.prisma.tv_show.findUnique({
            where: { id: BigInt(id) },
        });

        if (!tvShow) return null;

        const result: TvShow = {
            ...tvShow,
            id: tvShow.id.toString(),
            originalTitle: tvShow.original_title ?? undefined,
            releaseDate: tvShow.release_date || undefined,
            availableGlobally: tvShow.available_globally ?? undefined,
            locale: tvShow.locale ?? undefined,
            createdDate: tvShow.created_date,
            modifiedDate: tvShow.modified_date,
        };

        await this.cache.set(cacheKey, result, CacheTTL.ENTITY);
        return result;
    }
}
