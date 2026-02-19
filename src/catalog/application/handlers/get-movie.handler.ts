import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMovieQuery } from '../queries/get-movie.query';
import { PrismaService } from '../../../database/prisma.service';
import { Movie } from '../../domain/entities/movie.entity';

@QueryHandler(GetMovieQuery)
export class GetMovieHandler implements IQueryHandler<GetMovieQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetMovieQuery): Promise<Movie | null> {
        const { id } = query;
        const movie = await this.prisma.movie.findUnique({
            where: { id: BigInt(id) },
        });

        if (!movie) return null;

        return {
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
    }
}
