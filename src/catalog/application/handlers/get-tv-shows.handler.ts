import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { GetTvShowsQuery } from '@/catalog/application/queries/get-tv-shows.query';
import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { IPaginatedType } from '@/common/pagination/paginated.response';
import { getPaginationParams } from '@/common/pagination/pagination.util';
import { LogHandler } from '@/telemetry/logging/log-handler.decorator';
import { PrismaService } from '@/database/prisma.service';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@QueryHandler(GetTvShowsQuery)
export class GetTvShowsHandler implements IQueryHandler<GetTvShowsQuery> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        @InjectPinoLogger(GetTvShowsHandler.name) readonly logger: PinoLogger,
    ) { }

    @LogHandler()
    async execute(query: GetTvShowsQuery): Promise<IPaginatedType<TvShow>> {
        const { title } = query;
        const { page, pageSize, warnings } = getPaginationParams(query.page, query.pageSize);
        const cacheKey = `${CachePrefix.TV_SHOWS}:${page}:${pageSize}:${title ?? ''}`;

        const cached = await this.cache.get<IPaginatedType<TvShow>>(cacheKey);
        if (cached) return { ...cached, warnings };

        const where: any = {};
        if (title) {
            where.title = { contains: title, mode: 'insensitive' };
        }

        const totalCount = await this.prisma.tv_show.count({ where });

        const tvShows = await this.prisma.tv_show.findMany({
            take: pageSize + 1,
            skip: (page - 1) * pageSize,
            where,
            orderBy: { id: 'asc' },
        });

        const hasNext = tvShows.length > pageSize;
        const nodes = hasNext ? tvShows.slice(0, pageSize) : tvShows;
        const hasPrevious = page > 1;

        const result: IPaginatedType<TvShow> = {
            nodes: nodes.map(tvShow => ({
                id: tvShow.id.toString(),
                title: tvShow.title,
                originalTitle: tvShow.original_title ?? undefined,
                releaseDate: tvShow.release_date || undefined,
                availableGlobally: tvShow.available_globally ?? undefined,
                locale: tvShow.locale ?? undefined,
                createdDate: tvShow.created_date,
                modifiedDate: tvShow.modified_date,
            })),
            hasNext,
            hasPrevious,
            totalCount,
            page,
            pageSize,
        };

        await this.cache.set(cacheKey, result, CacheTTL.LIST);
        return { ...result, warnings };
    }
}
