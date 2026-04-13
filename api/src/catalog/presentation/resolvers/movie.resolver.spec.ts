jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { MovieResolver } from './movie.resolver';
import { GetMovieQuery } from '@/catalog/application/queries/get-movie.query';
import { GetMoviesQuery } from '@/catalog/application/queries/get-movies.query';
import { Movie } from '@/catalog/domain/entities/movie.entity';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { IPaginatedType } from '@/common/pagination/paginated.response';
import { QueryBus } from '@nestjs/cqrs';
import { ViewSummaryLoader } from '@/catalog/presentation/dataloaders/view-summary.loader';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const NOW = new Date('2024-06-01T00:00:00.000Z');

const movieStub: Movie = {
    id: '1',
    title: 'Inception',
    originalTitle: 'Inception',
    runtime: 148,
    releaseDate: NOW,
    availableGlobally: true,
    locale: 'en',
    createdDate: NOW,
    modifiedDate: NOW,
};

const viewSummaryStub: ViewSummary = {
    id: '10',
    hoursViewed: 5000000,
    cumulativeWeeksInTop10: 4,
    views: 20000,
    viewRank: 1,
    duration: 'P1Y',
    startDate: NOW,
    endDate: NOW,
    createdDate: NOW,
    modifiedDate: NOW,
    movieId: '1',
};

const paginatedStub: IPaginatedType<Movie> = {
    nodes: [movieStub],
    hasNext: false,
    hasPrevious: false,
    totalCount: 1,
    page: 1,
    pageSize: 10,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MovieResolver', () => {
    let sut: MovieResolver;
    let queryBus: jest.Mocked<QueryBus>;
    let viewSummaryLoader: jest.Mocked<ViewSummaryLoader>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MovieResolver,
                {
                    provide: QueryBus,
                    useValue: { execute: jest.fn() },
                },
                {
                    provide: ViewSummaryLoader,
                    useValue: { load: jest.fn() },
                },
            ],
        }).compile();

        sut = module.get<MovieResolver>(MovieResolver);
        queryBus = module.get(QueryBus);
        viewSummaryLoader = module.get(ViewSummaryLoader);

        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // movie query
    // -------------------------------------------------------------------------

    describe('movie', () => {
        it('should dispatch a GetMovieQuery with the provided id and return the result', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(movieStub);

            const result = await sut.movie('1');

            expect(result).toEqual(movieStub);
            expect(queryBus.execute).toHaveBeenCalledTimes(1);
            expect(queryBus.execute).toHaveBeenCalledWith(new GetMovieQuery('1'));
        });

        it('should return null when the movie does not exist', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(null);

            const result = await sut.movie('9999');

            expect(result).toBeNull();
        });

        it('should forward the exact id string to GetMovieQuery', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(null);

            await sut.movie('42');

            const dispatched = (queryBus.execute as jest.Mock).mock
                .calls[0][0] as GetMovieQuery;
            expect(dispatched).toBeInstanceOf(GetMovieQuery);
            expect(dispatched.id).toBe('42');
        });
    });

    // -------------------------------------------------------------------------
    // movies query
    // -------------------------------------------------------------------------

    describe('movies', () => {
        it('should dispatch a GetMoviesQuery with pagination args and return paginated result', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(paginatedStub);

            const result = await sut.movies({ page: 1, pageSize: 10 }, undefined);

            expect(result).toEqual(paginatedStub);
            expect(queryBus.execute).toHaveBeenCalledWith(
                new GetMoviesQuery(1, 10, undefined),
            );
        });

        it('should forward the title filter to GetMoviesQuery when provided', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(paginatedStub);

            await sut.movies({ page: 1, pageSize: 10 }, 'inception');

            const dispatched = (queryBus.execute as jest.Mock).mock
                .calls[0][0] as GetMoviesQuery;
            expect(dispatched).toBeInstanceOf(GetMoviesQuery);
            expect(dispatched.title).toBe('inception');
        });

        it('should forward page and pageSize correctly to GetMoviesQuery', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(paginatedStub);

            await sut.movies({ page: 3, pageSize: 25 });

            const dispatched = (queryBus.execute as jest.Mock).mock
                .calls[0][0] as GetMoviesQuery;
            expect(dispatched.page).toBe(3);
            expect(dispatched.pageSize).toBe(25);
        });

        it('should return an empty paginated result when no movies match', async () => {
            const empty: IPaginatedType<Movie> = {
                ...paginatedStub,
                nodes: [],
                totalCount: 0,
            };
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(empty);

            const result = await sut.movies({ page: 1, pageSize: 10 }, 'nonexistent');

            expect(result.nodes).toHaveLength(0);
            expect(result.totalCount).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // viewSummaries resolve field
    // -------------------------------------------------------------------------

    describe('viewSummaries', () => {
        it('should delegate to ViewSummaryLoader.load with the parent movie id', async () => {
            (viewSummaryLoader.load as jest.Mock).mockResolvedValueOnce([
                viewSummaryStub,
            ]);

            const result = await sut.viewSummaries(movieStub);

            expect(result).toEqual([viewSummaryStub]);
            expect(viewSummaryLoader.load).toHaveBeenCalledWith(movieStub.id);
        });

        it('should return an empty array when the loader finds no view summaries', async () => {
            (viewSummaryLoader.load as jest.Mock).mockResolvedValueOnce([]);

            const result = await sut.viewSummaries(movieStub);

            expect(result).toEqual([]);
        });

        it('should call load exactly once per invocation', async () => {
            (viewSummaryLoader.load as jest.Mock).mockResolvedValueOnce([
                viewSummaryStub,
            ]);

            await sut.viewSummaries(movieStub);

            expect(viewSummaryLoader.load).toHaveBeenCalledTimes(1);
        });
    });
});
