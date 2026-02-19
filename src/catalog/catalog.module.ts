import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../database/database.module';
import { GetMovieHandler } from './application/handlers/get-movie.handler';
import { GetMoviesHandler } from './application/handlers/get-movies.handler';
import { MovieResolver } from './presentation/resolvers/movie.resolver';
import { ViewSummaryLoader } from './presentation/dataloaders/view-summary.loader';
import { ViewSummaryBySeasonLoader } from './presentation/dataloaders/view-summary-by-season.loader';
import { GetTvShowHandler } from './application/handlers/get-tv-show.handler';
import { GetTvShowsHandler } from './application/handlers/get-tv-shows.handler';
import { TvShowResolver } from './presentation/resolvers/tv-show.resolver';
import { SeasonsLoader } from './presentation/dataloaders/seasons.loader';
import { SeasonResolver } from './presentation/resolvers/season.resolver';

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
