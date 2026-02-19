import { Field, ObjectType, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ViewSummary {
    @Field(() => ID)
    id: string;

    @Field(() => Int)
    hoursViewed: number;

    @Field({ nullable: true })
    cumulativeWeeksInTop10?: number;

    @Field({ nullable: true })
    views?: number;

    @Field({ nullable: true })
    viewRank?: number;

    @Field()
    duration: string;

    @Field()
    startDate: Date;

    @Field()
    endDate: Date;

    @Field()
    createdDate: Date;

    @Field()
    modifiedDate: Date;

    @Field(() => ID, { nullable: true })
    movieId?: string;

    @Field(() => ID, { nullable: true })
    seasonId?: string;
}
