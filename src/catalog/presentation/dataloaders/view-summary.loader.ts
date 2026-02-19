import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../database/prisma.service';
import { ViewSummary } from '../../domain/entities/view-summary.entity';

@Injectable({ scope: Scope.REQUEST })
export class ViewSummaryLoader extends DataLoader<string, ViewSummary[]> {
    constructor(private readonly prisma: PrismaService) {
        super(async (movieIds: readonly string[]) => {
            const viewSummaries = await this.prisma.view_summary.findMany({
                where: {
                    movie_id: { in: movieIds.map((id) => BigInt(id)) },
                },
            });

            const groupedByMovieId = new Map<string, ViewSummary[]>();

            viewSummaries.forEach((summary) => {
                const movieId = summary.movie_id?.toString();
                if (movieId) {
                    if (!groupedByMovieId.has(movieId)) {
                        groupedByMovieId.set(movieId, []);
                    }
                    groupedByMovieId.get(movieId)?.push({
                        ...summary,
                        id: summary.id.toString(),
                        movieId: summary.movie_id?.toString(),
                        seasonId: summary.season_id?.toString(),
                        // map other fields/types as necessary
                        cumulativeWeeksInTop10: Number(summary.cumulative_weeks_in_top10),
                        views: Number(summary.views),
                        viewRank: Number(summary.view_rank),
                        hoursViewed: Number(summary.hours_viewed),
                        startDate: summary.start_date,
                        endDate: summary.end_date,
                        createdDate: summary.created_date,
                        modifiedDate: summary.modified_date,
                        duration: summary.duration,
                    });
                }
            });

            return movieIds.map((movieId) => groupedByMovieId.get(movieId) || []);
        });
    }
}
