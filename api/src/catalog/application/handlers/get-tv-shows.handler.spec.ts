/**
 * Mock PrismaService and CacheService before any module import so ts-jest never
 * resolves the ESM .js imports inside the generated Prisma client.
 */
jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { GetTvShowsHandler } from './get-tv-shows.handler';
import { GetTvShowsQuery } from '@/catalog/application/queries/get-tv-shows.query';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { IPaginatedType } from '@/common/pagination/paginated.response';
import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { getLoggerToken } from 'nestjs-pino';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

function buildPrismaRow(id: bigint = BigInt(1), title = 'Stranger Things') {
    return {
        id,
        title,
        original_title: null,
        release_date: null,
        available_globally: null,
        locale: null,
        created_date: NOW,
        modified_date: NOW,
    };
}

function buildMappedTvShow(id = '1', title = 'Stranger Things'): TvShow {
    return {
        id,
        title,
        originalTitle: undefined,
        releaseDate: undefined,
        availableGlobally: undefined,
        locale: undefined,
        createdDate: NOW,
        modifiedDate: NOW,
    };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GetTvShowsHandler', () => {
    let sut: GetTvShowsHandler;
    let prisma: jest.Mocked<PrismaService>;
    let cache: jest.Mocked<CacheService>;
    let tvShowModel: { count: jest.Mock; findMany: jest.Mock };

    beforeEach(async () => {
        tvShowModel = { count: jest.fn(), findMany: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetTvShowsHandler,
                PrismaService,
                CacheService,
                { provide: getLoggerToken(GetTvShowsHandler.name), useValue: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
            ],
        }).compile();

        sut = module.get<GetTvShowsHandler>(GetTvShowsHandler);
        prisma = module.get(PrismaService);
        cache = module.get(CacheService);

        Object.defineProperty(prisma, 'tv_show', { value: tvShowModel, writable: true });

        jest.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Cache hit
    // -----------------------------------------------------------------------

    describe('execute', () => {
        it('should return cached result and skip Prisma when cache hits', async () => {
            const cachedResult: IPaginatedType<TvShow> = {
                nodes: [buildMappedTvShow()],
                hasNext: false,
                hasPrevious: false,
                totalCount: 1,
                page: 1,
                pageSize: 10,
            };
            (cache.get as jest.Mock).mockResolvedValueOnce(cachedResult);

            const result = await sut.execute(new GetTvShowsQuery(1, 10));

            expect(result.nodes).toEqual(cachedResult.nodes);
            expect(result.totalCount).toBe(1);
            expect(tvShowModel.findMany).not.toHaveBeenCalled();
            expect(tvShowModel.count).not.toHaveBeenCalled();
        });

        it('should propagate warnings alongside a cache hit result when pageSize exceeded 200', async () => {
            const cachedResult: IPaginatedType<TvShow> = {
                nodes: [],
                hasNext: false,
                hasPrevious: false,
                totalCount: 0,
                page: 1,
                pageSize: 200,
            };
            (cache.get as jest.Mock).mockResolvedValueOnce(cachedResult);

            const result = await sut.execute(new GetTvShowsQuery(1, 201));

            expect(result.warnings).toEqual(['The maximum supported pageSize is 200.']);
        });

        // -----------------------------------------------------------------------
        // Cache miss — happy path
        // -----------------------------------------------------------------------

        it('should query Prisma, map tv shows, cache the result, and return paginated data on cache miss', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(2);
            tvShowModel.findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(1), 'Stranger Things'),
                buildPrismaRow(BigInt(2), 'Dark'),
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(1, 10));

            expect(result.nodes).toHaveLength(2);
            expect(result.nodes[0]).toEqual(buildMappedTvShow('1', 'Stranger Things'));
            expect(result.nodes[1]).toEqual(buildMappedTvShow('2', 'Dark'));
            expect(result.totalCount).toBe(2);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrevious).toBe(false);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        // -----------------------------------------------------------------------
        // hasNext / hasPrevious logic
        // -----------------------------------------------------------------------

        it('should set hasNext to true when Prisma returns pageSize+1 rows', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(15);
            const rows = Array.from({ length: 11 }, (_, i) =>
                buildPrismaRow(BigInt(i + 1), `Show ${i + 1}`),
            );
            tvShowModel.findMany.mockResolvedValueOnce(rows);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(1, 10));

            expect(result.hasNext).toBe(true);
            expect(result.nodes).toHaveLength(10);
        });

        it('should set hasPrevious to true when page > 1', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(20);
            tvShowModel.findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(11), 'Show 11'),
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(2, 10));

            expect(result.hasPrevious).toBe(true);
        });

        it('should set hasPrevious to false on page 1', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(5);
            tvShowModel.findMany.mockResolvedValueOnce(
                Array.from({ length: 5 }, (_, i) =>
                    buildPrismaRow(BigInt(i + 1), `Show ${i + 1}`),
                ),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(1, 10));

            expect(result.hasPrevious).toBe(false);
        });

        // -----------------------------------------------------------------------
        // Title filtering
        // -----------------------------------------------------------------------

        it('should pass the title filter to Prisma count and findMany', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(1);
            tvShowModel.findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(5), 'Stranger Things'),
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowsQuery(1, 10, 'stranger'));

            const expectedWhere = { title: { contains: 'stranger', mode: 'insensitive' } };
            expect(tvShowModel.count).toHaveBeenCalledWith({ where: expectedWhere });
            expect(tvShowModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expectedWhere }),
            );
        });

        it('should pass an empty where clause when title is not provided', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(0);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowsQuery(1, 10));

            expect(tvShowModel.count).toHaveBeenCalledWith({ where: {} });
            expect(tvShowModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} }),
            );
        });

        // -----------------------------------------------------------------------
        // PageSize cap
        // -----------------------------------------------------------------------

        it('should cap pageSize to 200 and include a warning when pageSize exceeds 200', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(500);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(1, 500));

            expect(result.pageSize).toBe(200);
            expect(result.warnings).toEqual(['The maximum supported pageSize is 200.']);
            expect(tvShowModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 201 }),
            );
        });

        it('should not include warnings when pageSize is within the limit', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(5);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(1, 10));

            expect(result.warnings).toBeUndefined();
        });

        // -----------------------------------------------------------------------
        // Default pagination
        // -----------------------------------------------------------------------

        it('should default to page=1 and pageSize=10 when not provided', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(0);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery());

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        // -----------------------------------------------------------------------
        // Cache key
        // -----------------------------------------------------------------------

        it('should build a cache key that includes page, pageSize and title', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(0);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowsQuery(2, 15, 'dark'));

            expect(cache.get).toHaveBeenCalledWith(`${CachePrefix.TV_SHOWS}:2:15:dark`);
            expect(cache.set).toHaveBeenCalledWith(
                `${CachePrefix.TV_SHOWS}:2:15:dark`,
                expect.any(Object),
                CacheTTL.LIST,
            );
        });

        it('should use an empty string for the title segment in the cache key when title is undefined', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(0);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowsQuery(1, 10));

            expect(cache.get).toHaveBeenCalledWith(`${CachePrefix.TV_SHOWS}:1:10:`);
        });

        // -----------------------------------------------------------------------
        // Pagination skip calculation
        // -----------------------------------------------------------------------

        it('should calculate the correct skip value for Prisma based on page and pageSize', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(100);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowsQuery(3, 10));

            expect(tvShowModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 20 }),
            );
        });

        // -----------------------------------------------------------------------
        // Optional field mapping
        // -----------------------------------------------------------------------

        it('should map non-null optional fields correctly in the nodes', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(1);
            tvShowModel.findMany.mockResolvedValueOnce([
                {
                    ...buildPrismaRow(BigInt(1), 'Breaking Bad'),
                    original_title: 'Breaking Bad Original',
                    available_globally: true,
                    locale: 'en',
                    release_date: NOW,
                },
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowsQuery(1, 10));

            expect(result.nodes[0].originalTitle).toBe('Breaking Bad Original');
            expect(result.nodes[0].availableGlobally).toBe(true);
            expect(result.nodes[0].locale).toBe('en');
            expect(result.nodes[0].releaseDate).toEqual(NOW);
        });

        it('should order Prisma results by id ascending', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.count.mockResolvedValueOnce(0);
            tvShowModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowsQuery(1, 10));

            expect(tvShowModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { id: 'asc' } }),
            );
        });
    });
});
