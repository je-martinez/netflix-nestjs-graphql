import { ViewSummary } from '@/catalog/domain/entities/view-summary.entity';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Season {
    @Field(() => ID)
    id: string;

    @Field()
    title: string;

    @Field({ nullable: true })
    originalTitle?: string;

    @Field(() => Int, { nullable: true })
    seasonNumber?: number;

    @Field(() => Int, { nullable: true })
    runtime?: number;

    @Field({ nullable: true })
    releaseDate?: Date;

    @Field(() => ID, { nullable: true })
    tvShowId?: string;

    @Field()
    createdDate: Date;

    @Field()
    modifiedDate: Date;

    @Field(() => [ViewSummary], { nullable: true })
    viewSummaries?: ViewSummary[];
}
