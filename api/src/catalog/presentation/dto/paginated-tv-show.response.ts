import { TvShow } from '@/catalog/domain/entities/tv-show.entity';
import { PaginatedResponse } from '@/common/pagination/paginated.response';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaginatedTvShow extends PaginatedResponse(TvShow) { }
