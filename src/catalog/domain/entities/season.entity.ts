import { Field, ObjectType, ID, Int } from '@nestjs/graphql';
import { ViewSummary } from './view-summary.entity';

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
