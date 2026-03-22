import { GetMovieQuery } from '@/catalog/application/queries/get-movie.query';
import { GetMoviesQuery } from '@/catalog/application/queries/get-movies.query';
import { Movie } from '@/catalog/domain/entities/movie.entity';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { ViewSummaryLoader } from '@/catalog/presentation/dataloaders/view-summary.loader';
import { PaginatedMovie } from '@/catalog/presentation/dto/paginated-movie.response';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

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

    @Query(() => PaginatedMovie)
    async movies(
        @Args() paginationArgs: PaginationArgs,
        @Args('title', { nullable: true }) title?: string,
    ): Promise<PaginatedMovie> {
        return this.queryBus.execute(new GetMoviesQuery(paginationArgs.page, paginationArgs.pageSize, title));
    }

    @ResolveField(() => [ViewSummary])
    async viewSummaries(@Parent() movie: Movie): Promise<ViewSummary[]> {
        return this.viewSummaryLoader.load(movie.id);
    }
}
