/**
 * Mock the Prisma-generated client and CacheService before any module is
 * loaded so that ts-jest never tries to resolve the .js ESM imports inside
 * the generated Prisma client.
 */
jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { GetMovieHandler } from './get-movie.handler';
import { GetMovieQuery } from '@/catalog/application/queries/get-movie.query';
import { CachePrefix, CacheTTL } from '@/cache/cache.constants';
import { Movie } from '@/catalog/domain/entities/movie.entity';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/cache/infrastructure/cache.service';
import { getLoggerToken } from 'nestjs-pino';

// ---------------------------------------------------------------------------
// Shared stubs
// ---------------------------------------------------------------------------

const NOW = new Date('2024-01-01T00:00:00.000Z');

/** Raw Prisma row — BigInt id, snake_case columns */
function buildPrismaRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: BigInt(42),
        title: 'Inception',
        original_title: 'Inception',
        runtime: BigInt(148),
        release_date: NOW,
        available_globally: true,
        locale: 'en',
        created_date: NOW,
        modified_date: NOW,
        ...overrides,
    };
}

/**
 * The handler spreads the raw Prisma row with `{ ...movie, ... }` so the
 * returned object contains both camelCase mapped properties AND the original
 * snake_case columns. Use `expect.objectContaining` to assert only the
 * camelCase surface that the Movie GraphQL type exposes.
 */
const expectedMovieShape = {
    id: '42',
    title: 'Inception',
    originalTitle: 'Inception',
    runtime: 148,
    releaseDate: NOW,
    availableGlobally: true,
    locale: 'en',
    createdDate: NOW,
    modifiedDate: NOW,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('GetMovieHandler', () => {
    let sut: GetMovieHandler;
    let prisma: jest.Mocked<PrismaService>;
    let cache: jest.Mocked<CacheService>;

    // Typed mock for the nested prisma.movie object
    let movieModel: { findUnique: jest.Mock };

    beforeEach(async () => {
        movieModel = { findUnique: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetMovieHandler,
                PrismaService,
                CacheService,
                { provide: getLoggerToken(GetMovieHandler.name), useValue: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
            ],
        }).compile();

        sut = module.get<GetMovieHandler>(GetMovieHandler);
        prisma = module.get(PrismaService);
        cache = module.get(CacheService);

        // Wire the nested movie accessor on the mocked PrismaService
        Object.defineProperty(prisma, 'movie', { value: movieModel, writable: true });

        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // execute — cache hit
    // -------------------------------------------------------------------------

    describe('execute', () => {
        it('should return cached movie and skip Prisma when cache hits', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(expectedMovieShape);

            const result = await sut.execute(new GetMovieQuery('42'));

            expect(result).toEqual(expectedMovieShape);
            expect(cache.get).toHaveBeenCalledWith(`${CachePrefix.MOVIE}:42`);
            expect(movieModel.findUnique).not.toHaveBeenCalled();
            expect(cache.set).not.toHaveBeenCalled();
        });

        // -------------------------------------------------------------------------
        // execute — cache miss, Prisma hit
        // -------------------------------------------------------------------------

        it('should query Prisma, map fields, cache the result, and return the movie when cache misses', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.findUnique.mockResolvedValueOnce(buildPrismaRow());
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMovieQuery('42'));

            expect(result).toEqual(expect.objectContaining(expectedMovieShape));
            expect(movieModel.findUnique).toHaveBeenCalledWith({
                where: { id: BigInt(42) },
            });
            expect(cache.set).toHaveBeenCalledWith(
                `${CachePrefix.MOVIE}:42`,
                expect.objectContaining(expectedMovieShape),
                CacheTTL.ENTITY,
            );
        });

        // -------------------------------------------------------------------------
        // execute — cache miss, Prisma miss
        // -------------------------------------------------------------------------

        it('should return null and skip caching when the movie does not exist in the DB', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.findUnique.mockResolvedValueOnce(null);

            const result = await sut.execute(new GetMovieQuery('999'));

            expect(result).toBeNull();
            expect(cache.set).not.toHaveBeenCalled();
        });

        // -------------------------------------------------------------------------
        // execute — nullable field mapping
        // -------------------------------------------------------------------------

        it('should map null optional fields to undefined', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.findUnique.mockResolvedValueOnce(
                buildPrismaRow({
                    original_title: null,
                    runtime: null,
                    release_date: null,
                    available_globally: null,
                    locale: null,
                }),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMovieQuery('42'));

            expect(result).not.toBeNull();
            expect((result as Movie).originalTitle).toBeUndefined();
            expect((result as Movie).runtime).toBeUndefined();
            expect((result as Movie).releaseDate).toBeUndefined();
            expect((result as Movie).availableGlobally).toBeUndefined();
            expect((result as Movie).locale).toBeUndefined();
        });

        it('should convert BigInt runtime to a plain number', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.findUnique.mockResolvedValueOnce(
                buildPrismaRow({ runtime: BigInt(120) }),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMovieQuery('42'));

            expect((result as Movie).runtime).toBe(120);
            expect(typeof (result as Movie).runtime).toBe('number');
        });

        it('should convert BigInt id to a string', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.findUnique.mockResolvedValueOnce(
                buildPrismaRow({ id: BigInt(9007199254740991) }),
            );
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await sut.execute(new GetMovieQuery('9007199254740991'));

            expect((result as Movie).id).toBe('9007199254740991');
        });

        it('should build the correct cache key using the query id', async () => {
            (cache.get as jest.Mock).mockResolvedValueOnce(null);
            movieModel.findUnique.mockResolvedValueOnce(buildPrismaRow({ id: BigInt(7) }));
            (cache.set as jest.Mock).mockResolvedValueOnce(undefined);

            await sut.execute(new GetMovieQuery('7'));

            expect(cache.get).toHaveBeenCalledWith('movie:7');
        });
    });
});
