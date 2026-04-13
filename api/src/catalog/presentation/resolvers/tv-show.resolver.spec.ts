jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { TvShowResolver } from './tv-show.resolver';
import { GetTvShowQuery } from '@/catalog/application/queries/get-tv-show.query';
import { GetTvShowsQuery } from '@/catalog/application/queries/get-tv-shows.query';
import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { Season } from '@/catalog/domain/entities/season.entity';
import { IPaginatedType } from '@/common/pagination/paginated.response';
import { QueryBus } from '@nestjs/cqrs';
import { SeasonsLoader } from '@/catalog/presentation/dataloaders/seasons.loader';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const NOW = new Date('2024-06-01T00:00:00.000Z');

const tvShowStub: TvShow = {
    id: '1',
    title: 'Stranger Things',
    originalTitle: 'Stranger Things',
    releaseDate: NOW,
    availableGlobally: true,
    locale: 'en',
    createdDate: NOW,
    modifiedDate: NOW,
};

const seasonStub: Season = {
    id: '100',
    title: 'Stranger Things Season 1',
    seasonNumber: 1,
    runtime: 45,
    tvShowId: '1',
    createdDate: NOW,
    modifiedDate: NOW,
};

const paginatedStub: IPaginatedType<TvShow> = {
    nodes: [tvShowStub],
    hasNext: false,
    hasPrevious: false,
    totalCount: 1,
    page: 1,
    pageSize: 10,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TvShowResolver', () => {
    let sut: TvShowResolver;
    let queryBus: jest.Mocked<QueryBus>;
    let seasonsLoader: jest.Mocked<SeasonsLoader>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TvShowResolver,
                {
                    provide: QueryBus,
                    useValue: { execute: jest.fn() },
                },
                {
                    provide: SeasonsLoader,
                    useValue: { load: jest.fn() },
                },
            ],
        }).compile();

        sut = module.get<TvShowResolver>(TvShowResolver);
        queryBus = module.get(QueryBus);
        seasonsLoader = module.get(SeasonsLoader);

        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // tvShow query
    // -------------------------------------------------------------------------

    describe('tvShow', () => {
        it('should dispatch a GetTvShowQuery with the provided id and return the result', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(tvShowStub);

            const result = await sut.tvShow('1');

            expect(result).toEqual(tvShowStub);
            expect(queryBus.execute).toHaveBeenCalledTimes(1);
            expect(queryBus.execute).toHaveBeenCalledWith(new GetTvShowQuery('1'));
        });

        it('should return null when the tv show does not exist', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(null);

            const result = await sut.tvShow('9999');

            expect(result).toBeNull();
        });

        it('should forward the exact id string to GetTvShowQuery', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(null);

            await sut.tvShow('42');

            const dispatched = (queryBus.execute as jest.Mock).mock
                .calls[0][0] as GetTvShowQuery;
            expect(dispatched).toBeInstanceOf(GetTvShowQuery);
            expect(dispatched.id).toBe('42');
        });
    });

    // -------------------------------------------------------------------------
    // tvShows query
    // -------------------------------------------------------------------------

    describe('tvShows', () => {
        it('should dispatch a GetTvShowsQuery with pagination args and return paginated result', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(paginatedStub);

            const result = await sut.tvShows({ page: 1, pageSize: 10 }, undefined);

            expect(result).toEqual(paginatedStub);
            expect(queryBus.execute).toHaveBeenCalledWith(
                new GetTvShowsQuery(1, 10, undefined),
            );
        });

        it('should forward the title filter to GetTvShowsQuery when provided', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(paginatedStub);

            await sut.tvShows({ page: 1, pageSize: 10 }, 'stranger');

            const dispatched = (queryBus.execute as jest.Mock).mock
                .calls[0][0] as GetTvShowsQuery;
            expect(dispatched).toBeInstanceOf(GetTvShowsQuery);
            expect(dispatched.title).toBe('stranger');
        });

        it('should forward page and pageSize correctly to GetTvShowsQuery', async () => {
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(paginatedStub);

            await sut.tvShows({ page: 3, pageSize: 25 });

            const dispatched = (queryBus.execute as jest.Mock).mock
                .calls[0][0] as GetTvShowsQuery;
            expect(dispatched.page).toBe(3);
            expect(dispatched.pageSize).toBe(25);
        });

        it('should return an empty paginated result when no tv shows match', async () => {
            const empty: IPaginatedType<TvShow> = {
                ...paginatedStub,
                nodes: [],
                totalCount: 0,
            };
            (queryBus.execute as jest.Mock).mockResolvedValueOnce(empty);

            const result = await sut.tvShows({ page: 1, pageSize: 10 }, 'nonexistent');

            expect(result.nodes).toHaveLength(0);
            expect(result.totalCount).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // seasons resolve field
    // -------------------------------------------------------------------------

    describe('seasons', () => {
        it('should delegate to SeasonsLoader.load with the parent tv show id', async () => {
            (seasonsLoader.load as jest.Mock).mockResolvedValueOnce([seasonStub]);

            const result = await sut.seasons(tvShowStub);

            expect(result).toEqual([seasonStub]);
            expect(seasonsLoader.load).toHaveBeenCalledWith(tvShowStub.id);
        });

        it('should return an empty array when the loader finds no seasons', async () => {
            (seasonsLoader.load as jest.Mock).mockResolvedValueOnce([]);

            const result = await sut.seasons(tvShowStub);

            expect(result).toEqual([]);
        });

        it('should call load exactly once per invocation', async () => {
            (seasonsLoader.load as jest.Mock).mockResolvedValueOnce([seasonStub]);

            await sut.seasons(tvShowStub);

            expect(seasonsLoader.load).toHaveBeenCalledTimes(1);
        });

        it('should return multiple seasons when the loader returns them', async () => {
            const season2: Season = {
                ...seasonStub,
                id: '101',
                seasonNumber: 2,
                title: 'Stranger Things Season 2',
            };
            (seasonsLoader.load as jest.Mock).mockResolvedValueOnce([
                seasonStub,
                season2,
            ]);

            const result = await sut.seasons(tvShowStub);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('100');
            expect(result[1].id).toBe('101');
        });
    });
});
