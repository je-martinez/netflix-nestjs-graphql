import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTvShowsQuery } from '../queries/get-tv-shows.query';
import { PrismaService } from '../../../database/prisma.service';
import { TvShow } from '../../domain/entities/tv-show.entity';

@QueryHandler(GetTvShowsQuery)
export class GetTvShowsHandler implements IQueryHandler<GetTvShowsQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetTvShowsQuery): Promise<TvShow[]> {
        const { first = 10, after, title } = query;

        const where: any = {};
        if (title) {
            where.title = { contains: title, mode: 'insensitive' };
        }

        const tvShows = await this.prisma.tv_show.findMany({
            take: first,
            skip: after ? 1 : 0,
            cursor: after ? { id: BigInt(after) } : undefined,
            where,
        });

        return tvShows.map(tvShow => ({
            id: tvShow.id.toString(),
            title: tvShow.title,
            originalTitle: tvShow.original_title ?? undefined,
            releaseDate: tvShow.release_date || undefined,
            availableGlobally: tvShow.available_globally ?? undefined,
            locale: tvShow.locale ?? undefined,
            createdDate: tvShow.created_date,
            modifiedDate: tvShow.modified_date,
        }));
    }
}
