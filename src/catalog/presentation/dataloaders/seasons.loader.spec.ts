jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

/**
 * SeasonsLoader is a DataLoader subclass whose batch function is injected
 * at construction time via super(batchFn). We instantiate it directly with
 * mock PrismaService and CacheService so we can drive the batch function and
 * verify every branching path (full cache hit, full miss, partial hit/miss).
 *
 * NOTE: The loader uses `{ ...season, ... }` when building mapped objects, so
 * the actual returned objects contain both camelCase mapped properties AND the
 * original snake_case Prisma row columns. Assertions use
 * `expect.objectContaining` to check only the camelCase GraphQL surface.
 */
import { SeasonsLoader } from './seasons.loader';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { Season } from '@/catalog/domain/entities/season.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

function buildPrismaRow(id: bigint, tvShowId: bigint): Record<string, unknown> {
    return {
        id,
        tv_show_id: tvShowId,
        title: `Season ${id.toString()}`,
        original_title: null,
        season_number: BigInt(1),
        runtime: BigInt(45),
        release_date: NOW,
        created_date: NOW,
        modified_date: NOW,
    };
}

function expectedSeasonShape(id: string, tvShowId: string) {
    return {
        id,
        tvShowId,
        title: `Season ${id}`,
        originalTitle: undefined,
        seasonNumber: 1,
        runtime: 45,
        releaseDate: NOW,
        createdDate: NOW,
        modifiedDate: NOW,
    };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SeasonsLoader', () => {
    let findMany: jest.Mock;
    let mget: jest.Mock;
    let mset: jest.Mock;
    let mockPrisma: Partial<PrismaService>;
    let mockCache: Partial<CacheService>;
    let sut: SeasonsLoader;

    beforeEach(() => {
        findMany = jest.fn();
        mget = jest.fn();
        mset = jest.fn();

        mockPrisma = {
            season: { findMany } as any,
        };

        mockCache = { mget, mset };

        sut = new SeasonsLoader(
            mockPrisma as PrismaService,
            mockCache as CacheService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Access the underlying DataLoader batch function directly to avoid
     * DataLoader scheduling machinery (no setTimeout needed).
     */
    function getBatchFn() {
        return (sut as any)._batchLoadFn as (
            keys: readonly string[],
        ) => Promise<Season[][]>;
    }

    // -----------------------------------------------------------------------
    // Instantiation
    // -----------------------------------------------------------------------

    describe('instantiation', () => {
        it('should be defined and expose DataLoader methods', () => {
            expect(sut).toBeDefined();
            expect(typeof sut.load).toBe('function');
            expect(typeof sut.loadMany).toBe('function');
        });
    });

    // -----------------------------------------------------------------------
    // batch load function — full cache hit
    // -----------------------------------------------------------------------

    describe('batch load function', () => {
        it('should return cached results and skip Prisma when all keys are in the cache', async () => {
            const storedArray1 = [{ id: '10', tvShowId: '1' }] as Season[];
            const storedArray2 = [{ id: '20', tvShowId: '2' }] as Season[];
            mget.mockResolvedValueOnce([storedArray1, storedArray2]);

            const result = await getBatchFn()(['1', '2']);

            expect(result[0]).toBe(storedArray1);
            expect(result[1]).toBe(storedArray2);
            expect(findMany).not.toHaveBeenCalled();
            expect(mset).not.toHaveBeenCalled();
        });

        // -----------------------------------------------------------------------
        // Full cache miss
        // -----------------------------------------------------------------------

        it('should query Prisma, group by tv_show_id, cache and return results on full cache miss', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(10), BigInt(1)),
                buildPrismaRow(BigInt(20), BigInt(2)),
            ]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1', '2']);

            expect(result[0]).toHaveLength(1);
            expect(result[0][0]).toEqual(
                expect.objectContaining(expectedSeasonShape('10', '1')),
            );
            expect(result[1]).toHaveLength(1);
            expect(result[1][0]).toEqual(
                expect.objectContaining(expectedSeasonShape('20', '2')),
            );
        });

        it('should pass BigInt-converted tv_show ids to Prisma findMany', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['1', '2']);

            expect(findMany).toHaveBeenCalledWith({
                where: {
                    tv_show_id: { in: [BigInt(1), BigInt(2)] },
                },
            });
        });

        it('should cache missed results with the DATALOADER TTL', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(5), BigInt(99))]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['99']);

            expect(mset).toHaveBeenCalledWith(
                expect.arrayContaining([
                    [`${CachePrefix.SEASONS}:99`, expect.any(Array)],
                ]),
                CacheTTL.DATALOADER,
            );
        });

        // -----------------------------------------------------------------------
        // Partial cache hit
        // -----------------------------------------------------------------------

        it('should only query Prisma for cache-missed ids on a partial hit', async () => {
            const storedArray1 = [{ id: '10', tvShowId: '1' }] as Season[];
            mget.mockResolvedValueOnce([storedArray1, null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(20), BigInt(2))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1', '2']);

            expect(result[0]).toBe(storedArray1);
            expect(result[1][0]).toEqual(
                expect.objectContaining(expectedSeasonShape('20', '2')),
            );
            expect(findMany).toHaveBeenCalledWith({
                where: { tv_show_id: { in: [BigInt(2)] } },
            });
        });

        // -----------------------------------------------------------------------
        // Multiple seasons per tv show
        // -----------------------------------------------------------------------

        it('should group multiple seasons under the same tv_show_id', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(10), BigInt(1)),
                buildPrismaRow(BigInt(11), BigInt(1)),
            ]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1']);

            expect(result[0]).toHaveLength(2);
            expect(result[0].map((s) => s.id)).toEqual(['10', '11']);
        });

        // -----------------------------------------------------------------------
        // TV show with no seasons
        // -----------------------------------------------------------------------

        it('should return an empty array for a tv show that has no seasons in the DB', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['42']);

            expect(result[0]).toEqual([]);
        });

        // -----------------------------------------------------------------------
        // Rows where tv_show_id is null — defensive branch
        // -----------------------------------------------------------------------

        it('should skip rows with a null tv_show_id during grouping', async () => {
            mget.mockResolvedValueOnce([null]);
            const rowWithNullTvShowId = {
                ...buildPrismaRow(BigInt(10), BigInt(1)),
                tv_show_id: null,
            };
            findMany.mockResolvedValueOnce([rowWithNullTvShowId]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1']);

            // The row is skipped; tv show '1' gets an empty array
            expect(result[0]).toEqual([]);
        });

        // -----------------------------------------------------------------------
        // Field mapping
        // -----------------------------------------------------------------------

        it('should convert BigInt id and tv_show_id to string during mapping', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(999), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            const season = result[0][0];
            expect(season.id).toBe('999');
            expect(season.tvShowId).toBe('7');
        });

        it('should convert BigInt season_number to a plain number', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(1), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            expect(typeof result[0][0].seasonNumber).toBe('number');
            expect(result[0][0].seasonNumber).toBe(1);
        });

        it('should convert BigInt runtime to a plain number', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(1), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            expect(typeof result[0][0].runtime).toBe('number');
            expect(result[0][0].runtime).toBe(45);
        });

        it('should set originalTitle to undefined when original_title is null', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(1), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            expect(result[0][0].originalTitle).toBeUndefined();
        });

        it('should set seasonNumber to undefined when season_number rounds to 0', async () => {
            mget.mockResolvedValueOnce([null]);
            const row = { ...buildPrismaRow(BigInt(1), BigInt(7)), season_number: BigInt(0) };
            findMany.mockResolvedValueOnce([row]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            // Number(BigInt(0)) || undefined evaluates to undefined
            expect(result[0][0].seasonNumber).toBeUndefined();
        });

        // -----------------------------------------------------------------------
        // Cache keys
        // -----------------------------------------------------------------------

        it('should build mget cache keys with the SEASONS prefix', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['1', '2']);

            expect(mget).toHaveBeenCalledWith([
                `${CachePrefix.SEASONS}:1`,
                `${CachePrefix.SEASONS}:2`,
            ]);
        });
    });
});
