import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMoviesQuery } from '../queries/get-movies.query';
import { PrismaService } from '../../../database/prisma.service';
import { Movie } from '../../domain/entities/movie.entity';

@QueryHandler(GetMoviesQuery)
export class GetMoviesHandler implements IQueryHandler<GetMoviesQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetMoviesQuery): Promise<Movie[]> {
        const { first = 10, after, title } = query;

        // Simple pagination using skip/take for now, or cursor based if 'after' is a cursor
        // For simplicity, let's assume 'after' is just an ID for cursor pagination if we were doing it properly, 
        // but Prisma makes it easy. Let's stick to simple 'take' and optional 'where' for now.

        const where: any = {};
        if (title) {
            where.title = { contains: title, mode: 'insensitive' };
        }

        const movies = await this.prisma.movie.findMany({
            take: first,
            skip: after ? 1 : 0, // Simplified cursor logic
            cursor: after ? { id: BigInt(after) } : undefined,
            where,
        });

        return movies.map(movie => ({
            id: movie.id.toString(),
            title: movie.title,
            originalTitle: movie.original_title ?? undefined,
            releaseDate: movie.release_date || undefined,
            availableGlobally: movie.available_globally ?? undefined,
            locale: movie.locale ?? undefined,
            createdDate: movie.created_date,
            modifiedDate: movie.modified_date,
            runtime: movie.runtime ? Number(movie.runtime) : undefined,
        }));
    }
}
