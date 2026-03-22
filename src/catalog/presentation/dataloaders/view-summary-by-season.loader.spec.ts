jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

/**
 * ViewSummaryBySeasonLoader is a DataLoader subclass whose batch function is
 * injected at construction time via super(batchFn). We instantiate it directly
 * with mock PrismaService and CacheService so we can drive the batch function
 * and verify every branching path (full cache hit, full miss, partial hit/miss).
 *
 * NOTE: The loader uses `{ ...summary, ... }` when building mapped objects, so
 * the actual returned objects contain both camelCase mapped properties AND the
 * original snake_case Prisma row columns. Assertions use
 * `expect.objectContaining` to check only the camelCase GraphQL surface.
 */
import { ViewSummaryBySeasonLoader } from './view-summary-by-season.loader';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

function buildPrismaRow(id: bigint, seasonId: bigint): Record<string, unknown> {
    return {
        id,
        season_id: seasonId,
        movie_id: null,
        hours_viewed: BigInt(2000),
        cumulative_weeks_in_top10: BigInt(8),
        views: BigInt(500),
        view_rank: BigInt(3),
        duration: 'P6M',
        start_date: NOW,
        end_date: NOW,
        created_date: NOW,
        modified_date: NOW,
    };
}

function expectedSummaryShape(id: string, seasonId: string) {
    return {
        id,
        seasonId,
        hoursViewed: 2000,
        cumulativeWeeksInTop10: 8,
        views: 500,
        viewRank: 3,
        duration: 'P6M',
        startDate: NOW,
        endDate: NOW,
        createdDate: NOW,
        modifiedDate: NOW,
    };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ViewSummaryBySeasonLoader', () => {
    let findMany: jest.Mock;
    let mget: jest.Mock;
    let mset: jest.Mock;
    let mockPrisma: Partial<PrismaService>;
    let mockCache: Partial<CacheService>;
    let sut: ViewSummaryBySeasonLoader;

    beforeEach(() => {
        findMany = jest.fn();
        mget = jest.fn();
        mset = jest.fn();

        mockPrisma = {
            view_summary: { findMany } as any,
        };

        mockCache = { mget, mset };

        sut = new ViewSummaryBySeasonLoader(
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
            const storedArray1 = [{ id: '10', seasonId: '1' }] as ViewSummary[];
            const storedArray2 = [{ id: '20', seasonId: '2' }] as ViewSummary[];
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

        it('should query Prisma, group by season_id, cache and return results on full cache miss', async () => {
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

        it('should pass BigInt-converted season ids to Prisma findMany', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['1', '2']);

            expect(findMany).toHaveBeenCalledWith({
                where: {
                    season_id: { in: [BigInt(1), BigInt(2)] },
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
                    [`${CachePrefix.VIEW_SUMMARY_SEASON}:99`, expect.any(Array)],
                ]),
                CacheTTL.DATALOADER,
            );
        });

        // -----------------------------------------------------------------------
        // Partial cache hit
        // -----------------------------------------------------------------------

        it('should only query Prisma for cache-missed ids on a partial hit', async () => {
            const storedArray1 = [{ id: '10', seasonId: '1' }] as ViewSummary[];
            mget.mockResolvedValueOnce([storedArray1, null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(20), BigInt(2))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1', '2']);

            expect(result[0]).toBe(storedArray1);
            expect(result[1][0]).toEqual(
                expect.objectContaining(expectedSummaryShape('20', '2')),
            );
            expect(findMany).toHaveBeenCalledWith({
                where: { season_id: { in: [BigInt(2)] } },
            });
        });

        // -----------------------------------------------------------------------
        // Multiple view summaries per season
        // -----------------------------------------------------------------------

        it('should group multiple view summaries under the same season id', async () => {
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
        // Season with no view summaries
        // -----------------------------------------------------------------------

        it('should return an empty array for a season that has no view summaries in the DB', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['42']);

            expect(result[0]).toEqual([]);
        });

        // -----------------------------------------------------------------------
        // Rows where season_id is null — defensive branch
        // -----------------------------------------------------------------------

        it('should skip rows with a null season_id during grouping', async () => {
            mget.mockResolvedValueOnce([null]);
            const rowWithNullSeasonId = {
                ...buildPrismaRow(BigInt(10), BigInt(1)),
                season_id: null,
            };
            findMany.mockResolvedValueOnce([rowWithNullSeasonId]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1']);

            // Row is skipped; season '1' gets an empty array
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

        it('should convert BigInt id and season_id to string during mapping', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(999), BigInt(7))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['7']);

            const summary = result[0][0];
            expect(summary.id).toBe('999');
            expect(summary.seasonId).toBe('7');
        });

        it('should set movieId to undefined when movie_id is null', async () => {
            mget.mockResolvedValueOnce([null]);
            findMany.mockResolvedValueOnce([buildPrismaRow(BigInt(1), BigInt(1))]);
            mset.mockResolvedValueOnce(undefined);

            const result = await getBatchFn()(['1']);

            // movie_id is null → undefined via null?.toString()
            expect(result[0][0].movieId).toBeUndefined();
        });

        // -----------------------------------------------------------------------
        // Cache keys
        // -----------------------------------------------------------------------

        it('should build mget cache keys with the VIEW_SUMMARY_SEASON prefix', async () => {
            mget.mockResolvedValueOnce([null, null]);
            findMany.mockResolvedValueOnce([]);
            mset.mockResolvedValueOnce(undefined);

            await getBatchFn()(['1', '2']);

            expect(mget).toHaveBeenCalledWith([
                `${CachePrefix.VIEW_SUMMARY_SEASON}:1`,
                `${CachePrefix.VIEW_SUMMARY_SEASON}:2`,
            ]);
        });
    });
});
