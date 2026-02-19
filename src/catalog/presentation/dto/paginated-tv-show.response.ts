import { ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from '../../../common/pagination/paginated.response';
import { TvShow } from '../../domain/entities/tv-show.entity';

@ObjectType()
export class PaginatedTvShow extends PaginatedResponse(TvShow) { }
