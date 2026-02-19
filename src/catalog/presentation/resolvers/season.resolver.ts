import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Season } from '../../domain/entities/season.entity';
import { ViewSummary } from '../../domain/entities/view-summary.entity';
import { ViewSummaryBySeasonLoader } from '../dataloaders/view-summary-by-season.loader';

@Resolver(() => Season)
export class SeasonResolver {
    constructor(private readonly viewSummaryBySeasonLoader: ViewSummaryBySeasonLoader) { }

    @ResolveField(() => [ViewSummary])
    async viewSummaries(@Parent() season: Season): Promise<ViewSummary[]> {
        return this.viewSummaryBySeasonLoader.load(season.id);
    }
}
