import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { GetMoviesQuery } from '@/catalog/application/queries/get-movies.query';
import { Movie } from '@/catalog/domain/entities/movie.entity';
import { IPaginatedType } from '@/common/pagination/paginated.response';
import { getPaginationParams } from '@/common/pagination/pagination.util';
import { PrismaService } from '@/database/prisma.service';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetMoviesQuery)
export class GetMoviesHandler implements IQueryHandler<GetMoviesQuery> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { }

    async execute(query: GetMoviesQuery): Promise<IPaginatedType<Movie>> {
        const { title } = query;
        const { page, pageSize, warnings } = getPaginationParams(query.page, query.pageSize);
        const cacheKey = `${CachePrefix.MOVIES}:${page}:${pageSize}:${title ?? ''}`;

        const cached = await this.cache.get<IPaginatedType<Movie>>(cacheKey);
        if (cached) return { ...cached, warnings };

        const where: any = {};
        if (title) {
            where.title = { contains: title, mode: 'insensitive' };
        }

        const totalCount = await this.prisma.movie.count({ where });

        const movies = await this.prisma.movie.findMany({
            take: pageSize + 1,
            skip: (page - 1) * pageSize,
            where,
            orderBy: { id: 'asc' },
        });

        const hasNext = movies.length > pageSize;
        const nodes = hasNext ? movies.slice(0, pageSize) : movies;
        const hasPrevious = page > 1;

        const result: IPaginatedType<Movie> = {
            nodes: nodes.map(movie => ({
                id: movie.id.toString(),
                title: movie.title,
                originalTitle: movie.original_title ?? undefined,
                releaseDate: movie.release_date || undefined,
                availableGlobally: movie.available_globally ?? undefined,
                locale: movie.locale ?? undefined,
                createdDate: movie.created_date,
                modifiedDate: movie.modified_date,
                runtime: movie.runtime ? Number(movie.runtime) : undefined,
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
