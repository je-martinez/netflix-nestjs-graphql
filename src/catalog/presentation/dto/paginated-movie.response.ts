import { ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from '../../../common/pagination/paginated.response';
import { Movie } from '../../domain/entities/movie.entity';

@ObjectType()
export class PaginatedMovie extends PaginatedResponse(Movie) { }
