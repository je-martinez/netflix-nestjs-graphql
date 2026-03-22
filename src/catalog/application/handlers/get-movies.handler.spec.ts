jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { GetMoviesHandler } from './get-movies.handler';
import { GetMoviesQuery } from '@/catalog/application/queries/get-movies.query';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { IPaginatedType } from '@/common/pagination/paginated.response';
import { Movie } from '@/catalog/domain/entities/movie.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

function buildPrismaRow(id: bigint = BigInt(1), title = 'Movie') {
    return {
        id,
        title,
        original_title: null,
        runtime: null,
        release_date: null,
        available_globally: null,
        locale: null,
        created_date: NOW,
        modified_date: NOW,
    };
}

function buildMappedMovie(id = '1', title = 'Movie'): Movie {
    return {
        id,
        title,
        originalTitle: undefined,
        runtime: undefined,
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

describe('GetMoviesHandler', () => {
    let sut: GetMoviesHandler;
    let prisma: jest.Mocked<PrismaService>;
    let cache: jest.Mocked<CacheService>;
    let movieModel: { count: jest.Mock; findMany: jest.Mock };

    beforeEach(async () => {
        movieModel = { count: jest.fn(), findMany: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [GetMoviesHandler, PrismaService, CacheService],
        }).compile();

        sut = module.get<GetMoviesHandler>(GetMoviesHandler);
        prisma = module.get(PrismaService);
        cache = module.get(CacheService);

        Object.defineProperty(prisma, 'movie', { value: movieModel, writable: true });

        jest.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Cache hit
    // -----------------------------------------------------------------------

    describe('execute', () => {
        it('should return cached result and skip Prisma when cache hits', async () => {
            const cachedResult: IPaginatedType<Movie> = {
                nodes: [buildMappedMovie()],
                hasNext: false,
                hasPrevious: false,
                totalCount: 1,
                page: 1,
                pageSize: 10,
            };
            (cache.get as jest.Mock).mockResolvedValueOnce(cachedResult);

            const result = await sut.execute(new GetMoviesQuery(1, 10));

            expect(result.nodes).toEqual(cachedResult.nodes);
            expect(result.totalCount).toBe(1);
            expect(movieModel.findMany).not.toHaveBeenCalled();
            expect(movieModel.count).not.toHaveBeenCalled();
        });

        it('should propagate warnings alongside a cache hit result', async () => {
            const cachedResult: IPaginatedType<Movie> = {
                nodes: [],
                hasNext: false,
                hasPrevious: false,
                totalCount: 0,
                page: 1,
                pageSize: 200,
            };
            (cache.get as jest.Mock).mockResolvedValueOnce(cachedResult);

            const result = await sut.execute(new GetMoviesQuery(1, 201));

            expect(result.warnings).toEqual(['The maximum supported pageSize is 200.']);
        });

        // -----------------------------------------------------------------------
        // Cache miss — happy path
        // -----------------------------------------------------------------------

        it('should query Prisma, map movies, cache the result, and return paginated data on cache miss', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(2);
            movieModel.findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(1), 'Movie A'),
                buildPrismaRow(BigInt(2), 'Movie B'),
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(1, 10));

            expect(result.nodes).toHaveLength(2);
            expect(result.nodes[0]).toEqual(buildMappedMovie('1', 'Movie A'));
            expect(result.nodes[1]).toEqual(buildMappedMovie('2', 'Movie B'));
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
            movieModel.count.mockResolvedValueOnce(15);
            const rows = Array.from({ length: 11 }, (_, i) =>
                buildPrismaRow(BigInt(i + 1), `Movie ${i + 1}`),
            );
            movieModel.findMany.mockResolvedValueOnce(rows);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(1, 10));

            expect(result.hasNext).toBe(true);
            expect(result.nodes).toHaveLength(10);
        });

        it('should set hasPrevious to true when page > 1', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(20);
            movieModel.findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(11), 'Movie 11'),
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(2, 10));

            expect(result.hasPrevious).toBe(true);
        });

        it('should set hasPrevious to false on page 1', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(5);
            movieModel.findMany.mockResolvedValueOnce(
                Array.from({ length: 5 }, (_, i) =>
                    buildPrismaRow(BigInt(i + 1), `Movie ${i + 1}`),
                ),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(1, 10));

            expect(result.hasPrevious).toBe(false);
        });

        // -----------------------------------------------------------------------
        // Title filtering
        // -----------------------------------------------------------------------

        it('should pass the title filter to Prisma count and findMany', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(1);
            movieModel.findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(5), 'Inception'),
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetMoviesQuery(1, 10, 'inception'));

            const expectedWhere = { title: { contains: 'inception', mode: 'insensitive' } };
            expect(movieModel.count).toHaveBeenCalledWith({ where: expectedWhere });
            expect(movieModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expectedWhere }),
            );
        });

        it('should pass an empty where clause when title is not provided', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(0);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetMoviesQuery(1, 10));

            expect(movieModel.count).toHaveBeenCalledWith({ where: {} });
            expect(movieModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} }),
            );
        });

        // -----------------------------------------------------------------------
        // PageSize cap
        // -----------------------------------------------------------------------

        it('should cap pageSize to 200 and include a warning when pageSize exceeds 200', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(500);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(1, 500));

            expect(result.pageSize).toBe(200);
            expect(result.warnings).toEqual(['The maximum supported pageSize is 200.']);
            expect(movieModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 201 }),
            );
        });

        it('should not include warnings when pageSize is within the limit', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(5);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(1, 10));

            expect(result.warnings).toBeUndefined();
        });

        // -----------------------------------------------------------------------
        // Default pagination
        // -----------------------------------------------------------------------

        it('should default to page=1 and pageSize=10 when not provided', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(0);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery());

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        // -----------------------------------------------------------------------
        // Cache key
        // -----------------------------------------------------------------------

        it('should build a cache key that includes page, pageSize and title', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(0);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetMoviesQuery(2, 15, 'matrix'));

            expect(cache.get).toHaveBeenCalledWith(`${CachePrefix.MOVIES}:2:15:matrix`);
            expect(cache.set).toHaveBeenCalledWith(
                `${CachePrefix.MOVIES}:2:15:matrix`,
                expect.any(Object),
                CacheTTL.LIST,
            );
        });

        it('should use an empty string for the title segment in the cache key when title is undefined', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(0);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetMoviesQuery(1, 10));

            expect(cache.get).toHaveBeenCalledWith(`${CachePrefix.MOVIES}:1:10:`);
        });

        // -----------------------------------------------------------------------
        // Pagination skip calculation
        // -----------------------------------------------------------------------

        it('should calculate the correct skip value for Prisma based on page and pageSize', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(100);
            movieModel.findMany.mockResolvedValueOnce([]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetMoviesQuery(3, 10));

            expect(movieModel.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 20 }),
            );
        });

        // -----------------------------------------------------------------------
        // Runtime conversion
        // -----------------------------------------------------------------------

        it('should convert non-null BigInt runtime to number in the mapped nodes', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.count.mockResolvedValueOnce(1);
            movieModel.findMany.mockResolvedValueOnce([
                { ...buildPrismaRow(BigInt(1), 'Test'), runtime: BigInt(120) },
            ]);
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMoviesQuery(1, 10));

            expect(result.nodes[0].runtime).toBe(120);
        });
    });
});
