import { Resolver, Query, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { QueryBus } from '@nestjs/cqrs';
import { TvShow } from '../../domain/entities/tv-show.entity';
import { Season } from '../../domain/entities/season.entity';
import { GetTvShowQuery } from '../../application/queries/get-tv-show.query';
import { GetTvShowsQuery } from '../../application/queries/get-tv-shows.query';
import { SeasonsLoader } from '../dataloaders/seasons.loader';

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

    @Query(() => [TvShow])
    async tvShows(
        @Args('first', { nullable: true }) first?: number,
        @Args('after', { nullable: true }) after?: string,
        @Args('title', { nullable: true }) title?: string,
    ): Promise<TvShow[]> {
        return this.queryBus.execute(new GetTvShowsQuery(first, after, title));
    }

    @ResolveField(() => [Season])
    async seasons(@Parent() tvShow: TvShow): Promise<Season[]> {
        return this.seasonsLoader.load(tvShow.id);
    }
}
