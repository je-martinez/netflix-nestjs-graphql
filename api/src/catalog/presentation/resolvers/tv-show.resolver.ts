import { GetTvShowQuery } from '@/catalog/application/queries/get-tv-show.query';
import { GetTvShowsQuery } from '@/catalog/application/queries/get-tv-shows.query';
import { Season } from '@/catalog/domain/entities/season.entity';
import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { SeasonsLoader } from '@/catalog/presentation/dataloaders/seasons.loader';
import { PaginatedTvShow } from '@/catalog/presentation/dto/paginated-tv-show.response';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => TvShow)
export class TvShowResolver {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly seasonsLoader: SeasonsLoader,
    ) { }

    @Query(() => TvShow, { nullable: true })
    async tvShow(@Args('id', { type: () => ID }) id: string): Promise<TvShow | null> {
        return this.queryBus.execute(new GetTvShowQuery(id));
    }

    @Query(() => PaginatedTvShow)
    async tvShows(
        @Args() paginationArgs: PaginationArgs,
        @Args('title', { nullable: true }) title?: string,
    ): Promise<PaginatedTvShow> {
        return this.queryBus.execute(new GetTvShowsQuery(paginationArgs.page, paginationArgs.pageSize, title));
    }

    @ResolveField(() => [Season])
    async seasons(@Parent() tvShow: TvShow): Promise<Season[]> {
        return this.seasonsLoader.load(tvShow.id);
    }
}
