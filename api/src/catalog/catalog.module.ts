import { GetMovieHandler } from '@/catalog/application/handlers/get-movie.handler';
import { GetMoviesHandler } from '@/catalog/application/handlers/get-movies.handler';
import { GetTvShowHandler } from '@/catalog/application/handlers/get-tv-show.handler';
import { GetTvShowsHandler } from '@/catalog/application/handlers/get-tv-shows.handler';
import { SeasonsLoader } from '@/catalog/presentation/dataloaders/seasons.loader';
import { ViewSummaryBySeasonLoader } from '@/catalog/presentation/dataloaders/view-summary-by-season.loader';
import { ViewSummaryLoader } from '@/catalog/presentation/dataloaders/view-summary.loader';
import { MovieResolver } from '@/catalog/presentation/resolvers/movie.resolver';
import { SeasonResolver } from '@/catalog/presentation/resolvers/season.resolver';
import { TvShowResolver } from '@/catalog/presentation/resolvers/tv-show.resolver';
import { DatabaseModule } from '@/database/database.module';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
    imports: [CqrsModule, DatabaseModule],
    providers: [
        GetMovieHandler,
        GetMoviesHandler,
        MovieResolver,
        ViewSummaryLoader,
        ViewSummaryBySeasonLoader,
        GetTvShowHandler,
        GetTvShowsHandler,
        TvShowResolver,
        SeasonsLoader,
        SeasonResolver,
    ],
})
export class CatalogModule { }
