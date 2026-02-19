import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTvShowsQuery } from '../queries/get-tv-shows.query';
import { PrismaService } from '../../../database/prisma.service';
import { TvShow } from '../../domain/entities/tv-show.entity';

@QueryHandler(GetTvShowsQuery)
export class GetTvShowsHandler implements IQueryHandler<GetTvShowsQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetTvShowsQuery): Promise<any> {
        const { page = 1, pageSize = 10, title } = query;

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

        return {
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
        };
    }
}
