import { Season } from '@/catalog/domain/entities/season.entity';
import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { ViewSummaryBySeasonLoader } from '@/catalog/presentation/dataloaders/view-summary-by-season.loader';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => Season)
export class SeasonResolver {
    constructor(private readonly viewSummaryBySeasonLoader: ViewSummaryBySeasonLoader) { }

    @ResolveField(() => [ViewSummary])
    async viewSummaries(@Parent() season: Season): Promise<ViewSummary[]> {
        return this.viewSummaryBySeasonLoader.load(season.id);
    }
}
