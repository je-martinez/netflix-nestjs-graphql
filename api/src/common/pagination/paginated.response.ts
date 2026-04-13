import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

export interface IPaginatedType<T> {
    nodes: T[];
    hasNext: boolean;
    hasPrevious: boolean;
    totalCount: number;
    page: number;
    pageSize: number;
    warnings?: string[];
}

export function PaginatedResponse<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
    @ObjectType({ isAbstract: true })
    abstract class PaginatedType implements IPaginatedType<T> {
        @Field(() => [classRef], { nullable: 'items' })
        nodes: T[];

        @Field(() => Boolean)
        hasNext: boolean;

        @Field(() => Boolean)
        hasPrevious: boolean;

        @Field(() => Int)
        totalCount: number;

        @Field(() => Int)
        page: number;

        @Field(() => Int)
        pageSize: number;

        @Field(() => [String], { nullable: true })
        warnings?: string[];
    }
    return PaginatedType as Type<IPaginatedType<T>>;
}
