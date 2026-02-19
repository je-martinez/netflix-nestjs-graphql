import { Resolver, Query, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { QueryBus } from '@nestjs/cqrs';
import { Movie } from '../../domain/entities/movie.entity';
import { ViewSummary } from '../../domain/entities/view-summary.entity';
import { GetMovieQuery } from '../../application/queries/get-movie.query';
import { GetMoviesQuery } from '../../application/queries/get-movies.query';
import { ViewSummaryLoader } from '../dataloaders/view-summary.loader';

@Resolver(() => Movie)
export class MovieResolver {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly viewSummaryLoader: ViewSummaryLoader,
    ) { }

    @Query(() => Movie, { nullable: true })
    async movie(@Args('id', { type: () => ID }) id: string): Promise<Movie | null> {
        return this.queryBus.execute(new GetMovieQuery(id));
    }

    @Query(() => [Movie])
    async movies(
        @Args('first', { nullable: true }) first?: number,
        @Args('after', { nullable: true }) after?: string,
        @Args('title', { nullable: true }) title?: string,
    ): Promise<Movie[]> {
        return this.queryBus.execute(new GetMoviesQuery(first, after, title));
    }

    @ResolveField(() => [ViewSummary])
    async viewSummaries(@Parent() movie: Movie): Promise<ViewSummary[]> {
        return this.viewSummaryLoader.load(movie.id);
    }
}
