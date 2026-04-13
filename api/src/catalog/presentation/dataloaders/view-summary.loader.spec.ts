jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

/**
 * ViewSummaryLoader is a DataLoader subclass whose batch function is injected
 * at construction time via super(batchFn). We instantiate it directly with
 * mock PrismaService and CacheService so we can drive the batch function and
 * verify every branching path (full cache hit, full miss, partial hit/miss).
 *
 * NOTE: The loader uses `{ ...summary, ... }` when building mapped objects, so
 * the actual returned objects contain both camelCase mapped properties AND the
 * original snake_case Prisma row columns. Assertions use
 * `expect.objectContaining` to check only the camelCase GraphQL surface.
 */
import { ViewSummaryLoader } from './view-summary.loader';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

function buildPrismaRow(id: bigint, movieId: bigint): Record<string, unknown> {
    return {
        id,
        movie_id: movieId,
        season_id: null,
        hours_viewed: BigInt(1000),
        cumulative_weeks_in_top10: BigInt(4),
        views: BigInt(200),
        view_rank: BigInt(1),
        duration: 'P1Y',
        start_date: NOW,
        end_date: NOW,
        created_date: NOW,
        modified_date: NOW,
    };
}

/** Shape of the camelCase properties we care about for a mapped ViewSummary. */
function expectedSummaryShape(id: string, movieId: string) {
    return {
        id,
        movieId,
        hoursViewed: 1000,
        cumulativeWeeksInTop10: 4,
        views: 200,
        viewRank: 1,
        duration: 'P1Y',
        startDate: NOW,
        endDate: NOW,
        createdDate: NOW,
        modifiedDate: NOW,
    };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ViewSummaryLoader', () => {
    let findMany: jest.Mock;
    let mget: jest.Mock;
    let mset: jest.Mock;
    let mockPrisma: Partial<PrismaService>;
    let mockCache: Partial<CacheService>;
    let sut: ViewSummaryLoader;

    beforeEach(() => {
        findMany = jest.fn();
        mget = jest.fn();
        mset = jest.fn();

        mockPrisma = {
            view_summary: { findMany } as any,
        };

        mockCache = { mget, mset };

        sut = new ViewSummaryLoader(
            mockPrisma as PrismaService,
            mockCache as CacheService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Access the underlying DataLoader batch function without going through
     * the DataLoader scheduling machinery.
     */
    function getBatchFn() {
        return (sut as any)._batchLoadFn as (
            keys: readonly string[],
        ) => Promise<ViewSummary[][]>;
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
            const cached1: ViewSummary[] = [
                expect.objectContaining(expectedSummaryShape('10', '1')),
            ];
            const cached2: ViewSummary[] = [
                expect.objectContaining(expectedSummaryShape('20', '2')),
            ];
            // For a full cache hit, mget returns the stored arrays directly
            const storedArray1 = [{ id: '10', movieId: '1' }] as ViewSummary[];
            const storedArray2 = [{ id: '20', movieId: '2' }] as ViewSummary[];
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

        it('should query Prisma, group by movie id, cache and return results on full cache miss', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([
                buildPrismaRow(BigInt(10), BigInt(1)),
                buildPrismaRow(BigInt(20), BigInt(2)),
            ]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1', '2']);

            expect(result[0]).toHaveLength(1);
            expect(result[0][0]).toEqual(
                expect.objectContaining(expectedSummaryShape('10', '1')),
            );
            expect(result[1]).toHaveLength(1);
            expect(result[1][0]).toEqual(
                expect.objectContaining(expectedSummaryShape('20', '2')),
            );
        });

        it('should pass BigInt-converted movie ids to Prisma findMany', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['1', '2']);

            expect(findMany).toHaveBeenCalledWith({
                where: {
                    movie_id: { in: [BigInt(1), BigInt(2)] },
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
                    [`${CachePrefix.VIEW_SUMMARY_MOVIE}:99`, expect.any(Array)],
                ]),
                CacheTTL.DATALOADER,
            );
        });

        // -----------------------------------------------------------------------
        // Partial cache hit
        // -----------------------------------------------------------------------

        it('should only query Prisma for cache-missed ids on a partial hit', async () => {
            const storedArray1 = [{ id: '10', movieId: '1' }] as ViewSummary[];
            mget.mockResolvedValueOnce([storedArray1, null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(20), BigInt(2))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1', '2']);

            expect(result[0]).toBe(storedArray1);
            expect(result[1][0]).toEqual(
                expect.objectContaining(expectedSummaryShape('20', '2')),
            );
            expect(findMany).toHaveBeenCalledWith({
                where: { movie_id: { in: [BigInt(2)] } },
            });
        });

        // -----------------------------------------------------------------------
        // Multiple view summaries per movie
        // -----------------------------------------------------------------------

        it('should group multiple view summaries under the same movie id', async () => {
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
        // Movie with no view summaries
        // -----------------------------------------------------------------------

        it('should return an empty array for a movie that has no view summaries in the DB', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['42']);

            expect(result[0]).toEqual([]);
        });

        // -----------------------------------------------------------------------
        // Field mapping — numeric conversions
        // -----------------------------------------------------------------------

        it('should convert BigInt numeric fields to number during mapping', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(1), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            const summary = result[0][0];
            expect(typeof summary.hoursViewed).toBe('number');
            expect(typeof summary.cumulativeWeeksInTop10).toBe('number');
            expect(typeof summary.views).toBe('number');
            expect(typeof summary.viewRank).toBe('number');
        });

        it('should convert BigInt id and movie_id to string during mapping', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(999), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            const summary = result[0][0];
            expect(summary.id).toBe('999');
            expect(summary.movieId).toBe('7');
        });

        it('should set seasonId to undefined when season_id is null', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(1), BigInt(1))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1']);

            // season_id is null → undefined via null?.toString()
            expect(result[0][0].seasonId).toBeUndefined();
        });

        // -----------------------------------------------------------------------
        // Cache keys
        // -----------------------------------------------------------------------

        it('should build mget cache keys with the VIEW_SUMMARY_MOVIE prefix', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['1', '2']);

            expect(mget).toHaveBeenCalledWith([
                `${CachePrefix.VIEW_SUMMARY_MOVIE}:1`,
                `${CachePrefix.VIEW_SUMMARY_MOVIE}:2`,
            ]);
        });
    });
});
