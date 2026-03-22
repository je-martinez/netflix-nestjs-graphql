jest.mock('@/database/prisma.service');
jest.mock('@/cache/infrastructure/cache.service');

import { Test, TestingModule } from '@nestjs/testing';
import { SeasonResolver } from './season.resolver';
import { Season } from '@/catalog/domain/entities/season.entity';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { ViewSummaryBySeasonLoader } from '@/catalog/presentation/dataloaders/view-summary-by-season.loader';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const NOW = new Date('2024-06-01T00:00:00.000Z');

const seasonStub: Season = {
    id: '100',
    title: 'Stranger Things Season 1',
    seasonNumber: 1,
    runtime: 45,
    tvShowId: '1',
    createdDate: NOW,
    modifiedDate: NOW,
};

const viewSummaryStub: ViewSummary = {
    id: '200',
    hoursViewed: 3000000,
    cumulativeWeeksInTop10: 6,
    views: 15000,
    viewRank: 2,
    duration: 'P6M',
    startDate: NOW,
    endDate: NOW,
    createdDate: NOW,
    modifiedDate: NOW,
    seasonId: '100',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SeasonResolver', () => {
    let sut: SeasonResolver;
    let viewSummaryBySeasonLoader: jest.Mocked<ViewSummaryBySeasonLoader>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeasonResolver,
                {
                    provide: ViewSummaryBySeasonLoader,
                    useValue: { load: jest.fn() },
                },
            ],
        }).compile();

        sut = module.get<SeasonResolver>(SeasonResolver);
        viewSummaryBySeasonLoader = module.get(ViewSummaryBySeasonLoader);

        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // viewSummaries resolve field
    // -------------------------------------------------------------------------

    describe('viewSummaries', () => {
        it('should delegate to ViewSummaryBySeasonLoader.load with the parent season id', async () => {
            (viewSummaryBySeasonLoader.load as jest.Mock).mockResolvedValueOnce([
                viewSummaryStub,
            ]);

            const result = await sut.viewSummaries(seasonStub);

            expect(result).toEqual([viewSummaryStub]);
            expect(viewSummaryBySeasonLoader.load).toHaveBeenCalledWith(seasonStub.id);
        });

        it('should return an empty array when the loader finds no view summaries for the season', async () => {
            (viewSummaryBySeasonLoader.load as jest.Mock).mockResolvedValueOnce([]);

            const result = await sut.viewSummaries(seasonStub);

            expect(result).toEqual([]);
        });

        it('should call load exactly once per invocation', async () => {
            (viewSummaryBySeasonLoader.load as jest.Mock).mockResolvedValueOnce([
                viewSummaryStub,
            ]);

            await sut.viewSummaries(seasonStub);

            expect(viewSummaryBySeasonLoader.load).toHaveBeenCalledTimes(1);
        });

        it('should return multiple view summaries when the loader returns them', async () => {
            const summary2: ViewSummary = {
                ...viewSummaryStub,
                id: '201',
                hoursViewed: 2500000,
            };
            (viewSummaryBySeasonLoader.load as jest.Mock).mockResolvedValueOnce([
                viewSummaryStub,
                summary2,
            ]);

            const result = await sut.viewSummaries(seasonStub);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('200');
            expect(result[1].id).toBe('201');
        });

        it('should use the season id from the parent Season object', async () => {
            const differentSeason: Season = {
                ...seasonStub,
                id: '999',
            };
            (viewSummaryBySeasonLoader.load as jest.Mock).mockResolvedValueOnce([]);

            await sut.viewSummaries(differentSeason);

            expect(viewSummaryBySeasonLoader.load).toHaveBeenCalledWith('999');
        });
    });
});
