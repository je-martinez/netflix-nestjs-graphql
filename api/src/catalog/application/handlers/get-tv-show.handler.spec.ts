/**
 * Mock PrismaService and CacheService before any module import so ts-jest never
 * resolves the ESM .js imports inside the generated Prisma client.
 */
jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { GetTvShowHandler } from './get-tv-show.handler';
import { GetTvShowQuery } from '@/catalog/application/queries/get-tv-show.query';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { getLoggerToken } from 'nestjs-pino';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

/** Raw Prisma row — BigInt id, snake_case columns */
function buildPrismaRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: BigInt(10),
        title: 'Stranger Things',
        original_title: 'Stranger Things',
        release_date: NOW,
        available_globally: true,
        locale: 'en',
        created_date: NOW,
        modified_date: NOW,
        ...overrides,
    };
}

/**
 * Expected camelCase shape after mapping.
 * The handler spreads the raw row with `{ ...tvShow, ... }` so the object
 * carries snake_case columns too — use objectContaining in assertions.
 */
const expectedTvShowShape = {
    id: '10',
    title: 'Stranger Things',
    originalTitle: 'Stranger Things',
    releaseDate: NOW,
    availableGlobally: true,
    locale: 'en',
    createdDate: NOW,
    modifiedDate: NOW,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GetTvShowHandler', () => {
    let sut: GetTvShowHandler;
    let prisma: jest.Mocked<PrismaService>;
    let cache: jest.Mocked<CacheService>;
    let tvShowModel: { findUnique: jest.Mock };

    beforeEach(async () => {
        tvShowModel = { findUnique: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetTvShowHandler,
                PrismaService,
                CacheService,
                { provide: getLoggerToken(GetTvShowHandler.name), useValue: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
            ],
        }).compile();

        sut = module.get<GetTvShowHandler>(GetTvShowHandler);
        prisma = module.get(PrismaService);
        cache = module.get(CacheService);

        Object.defineProperty(prisma, 'tv_show', { value: tvShowModel, writable: true });

        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // Cache hit
    // -------------------------------------------------------------------------

    describe('execute', () => {
        it('should return cached tv show and skip Prisma when cache hits', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(expectedTvShowShape);

            const result = await sut.execute(new GetTvShowQuery('10'));

            expect(result).toEqual(expectedTvShowShape);
            expect(cache.get).toHaveBeenCalledWith(`${CachePrefix.TV_SHOW}:10`);
            expect(tvShowModel.findUnique).not.toHaveBeenCalled();
            expect(cache.set).not.toHaveBeenCalled();
        });

        // -------------------------------------------------------------------------
        // Cache miss — Prisma hit
        // -------------------------------------------------------------------------

        it('should query Prisma, map fields, cache the result, and return the tv show when cache misses', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(buildPrismaRow());
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowQuery('10'));

            expect(result).toEqual(expect.objectContaining(expectedTvShowShape));
            expect(tvShowModel.findUnique).toHaveBeenCalledWith({
                where: { id: BigInt(10) },
            });
            expect(cache.set).toHaveBeenCalledWith(
                `${CachePrefix.TV_SHOW}:10`,
                expect.objectContaining(expectedTvShowShape),
                CacheTTL.ENTITY,
            );
        });

        // -------------------------------------------------------------------------
        // Cache miss — Prisma miss
        // -------------------------------------------------------------------------

        it('should return null and skip caching when the tv show does not exist in the DB', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(null);

            const result = await sut.execute(new GetTvShowQuery('999'));

            expect(result).toBeNull();
            expect(cache.set).not.toHaveBeenCalled();
        });

        // -------------------------------------------------------------------------
        // Nullable field mapping
        // -------------------------------------------------------------------------

        it('should map null optional fields to undefined', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(
                buildPrismaRow({
                    original_title: null,
                    release_date: null,
                    available_globally: null,
                    locale: null,
                }),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowQuery('10'));

            expect(result).not.toBeNull();
            expect((result as TvShow).originalTitle).toBeUndefined();
            expect((result as TvShow).releaseDate).toBeUndefined();
            expect((result as TvShow).availableGlobally).toBeUndefined();
            expect((result as TvShow).locale).toBeUndefined();
        });

        it('should convert BigInt id to a string', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(
                buildPrismaRow({ id: BigInt(9007199254740991) }),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetTvShowQuery('9007199254740991'));

            expect((result as TvShow).id).toBe('9007199254740991');
            expect(typeof (result as TvShow).id).toBe('string');
        });

        it('should build the correct cache key using the TV_SHOW prefix and query id', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(buildPrismaRow({ id: BigInt(7) }));
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowQuery('7'));

            expect(cache.get).toHaveBeenCalledWith('tvshow:7');
        });

        it('should pass the BigInt-converted id to Prisma findUnique', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(buildPrismaRow());
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowQuery('10'));

            expect(tvShowModel.findUnique).toHaveBeenCalledWith({
                where: { id: BigInt(10) },
            });
        });

        it('should cache result with ENTITY TTL after a Prisma hit', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            tvShowModel.findUnique.mockResolvedValueOnce(buildPrismaRow());
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetTvShowQuery('10'));

            expect(cache.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                CacheTTL.ENTITY,
            );
        });
    });
});
