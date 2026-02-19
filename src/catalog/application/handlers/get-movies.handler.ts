import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMoviesQuery } from '../queries/get-movies.query';
import { PrismaService } from '../../../database/prisma.service';
import { Movie } from '../../domain/entities/movie.entity';

@QueryHandler(GetMoviesQuery)
export class GetMoviesHandler implements IQueryHandler<GetMoviesQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetMoviesQuery): Promise<any> {
        const { page = 1, pageSize = 10, title } = query;

        const where: any = {};
        if (title) {
            where.title = { contains: title, mode: 'insensitive' };
        }

        const totalCount = await this.prisma.movie.count({ where });

        const movies = await this.prisma.movie.findMany({
            take: pageSize + 1, // Fetch one extra to check for next page
            skip: (page - 1) * pageSize,
            where,
            orderBy: { id: 'asc' }, // Ensure consistent ordering
        });

        const hasNext = movies.length > pageSize;
        const nodes = hasNext ? movies.slice(0, pageSize) : movies;
        const hasPrevious = page > 1;

        return {
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
        };
    }
}
