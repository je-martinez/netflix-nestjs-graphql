import { Movie } from '@/catalog/domain/entities/movie.entity';
import { PaginatedResponse } from '@/common/pagination/paginated.response';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaginatedMovie extends PaginatedResponse(Movie) { }
