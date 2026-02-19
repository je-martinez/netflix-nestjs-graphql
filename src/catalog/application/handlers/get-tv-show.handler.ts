import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTvShowQuery } from '../queries/get-tv-show.query';
import { PrismaService } from '../../../database/prisma.service';
import { TvShow } from '../../domain/entities/tv-show.entity';

@QueryHandler(GetTvShowQuery)
export class GetTvShowHandler implements IQueryHandler<GetTvShowQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetTvShowQuery): Promise<TvShow | null> {
        const { id } = query;
        const tvShow = await this.prisma.tv_show.findUnique({
            where: { id: BigInt(id) },
        });

        if (!tvShow) return null;

        return {
            ...tvShow,
            id: tvShow.id.toString(),
            originalTitle: tvShow.original_title ?? undefined,
            releaseDate: tvShow.release_date || undefined,
            availableGlobally: tvShow.available_globally ?? undefined,
            locale: tvShow.locale ?? undefined,
            createdDate: tvShow.created_date,
            modifiedDate: tvShow.modified_date,
        };
    }
}
