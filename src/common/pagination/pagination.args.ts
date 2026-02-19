import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

@ArgsType()
export class PaginationArgs {
    @Field(() => Int)
    @Min(1)
    @IsOptional()
    page: number = 1;

    @Field(() => Int)
    @Min(1)
    @IsOptional()
    pageSize: number = 10;
}
