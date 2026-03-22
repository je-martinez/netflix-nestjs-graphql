import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { GetMovieQuery } from '@/catalog/application/queries/get-movie.query';
import { Movie } from '@/catalog/domain/entities/movie.entity';
import { PrismaService } from '@/database/prisma.service';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetMovieQuery)
export class GetMovieHandler implements IQueryHandler<GetMovieQuery> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { }

    async execute(query: GetMovieQuery): Promise<Movie | null> {
        const { id } = query;
        const cacheKey = `${CachePrefix.MOVIE}:${id}`;

        const cached = await this.cache.get<Movie>(cacheKey);
        if (cached) return cached;

        const movie = await this.prisma.movie.findUnique({
            where: { id: BigInt(id) },
        });

        if (!movie) return null;

        const result: Movie = {
            ...movie,
            id: movie.id.toString(),
            originalTitle: movie.original_title ?? undefined,
            releaseDate: movie.release_date || undefined,
            availableGlobally: movie.available_globally ?? undefined,
            locale: movie.locale ?? undefined,
            createdDate: movie.created_date,
            modifiedDate: movie.modified_date,
            runtime: Number(movie.runtime) || undefined,
        };

        await this.cache.set(cacheKey, result, CacheTTL.ENTITY);
        return result;
    }
}
