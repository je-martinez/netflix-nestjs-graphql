import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../database/prisma.service';
import { Season } from '../../domain/entities/season.entity';

@Injectable({ scope: Scope.REQUEST })
export class SeasonsLoader extends DataLoader<string, Season[]> {
    constructor(private readonly prisma: PrismaService) {
        super(async (tvShowIds: readonly string[]) => {
            const seasons = await this.prisma.season.findMany({
                where: {
                    tv_show_id: { in: tvShowIds.map((id) => BigInt(id)) },
                },
            });

            const groupedByTvShowId = new Map<string, Season[]>();

            seasons.forEach((season) => {
                const tvShowId = season.tv_show_id?.toString();
                if (tvShowId) {
                    if (!groupedByTvShowId.has(tvShowId)) {
                        groupedByTvShowId.set(tvShowId, []);
                    }
                    groupedByTvShowId.get(tvShowId)?.push({
                        ...season,
                        id: season.id.toString(),
                        seasonNumber: Number(season.season_number) || undefined,
                        runtime: Number(season.runtime) || undefined,
                        tvShowId: season.tv_show_id?.toString(),
                        originalTitle: season.original_title ?? undefined,
                        releaseDate: season.release_date || undefined,
                        createdDate: season.created_date,
                        modifiedDate: season.modified_date,
                    });
                }
            });

            return tvShowIds.map((id) => groupedByTvShowId.get(id) || []);
        });
    }
}
