import { Field, ObjectType, ID, Int } from '@nestjs/graphql';
import { ViewSummary } from './view-summary.entity';

@ObjectType()
export class Movie {
    @Field(() => ID)
    id: string;

    @Field()
    title: string;

    @Field({ nullable: true })
    originalTitle?: string;

    @Field(() => Int, { nullable: true })
    runtime?: number;

    @Field({ nullable: true })
    releaseDate?: Date;

    @Field({ nullable: true })
    availableGlobally?: boolean;

    @Field({ nullable: true })
    locale?: string;

    @Field()
    createdDate: Date;

    @Field()
    modifiedDate: Date;

    @Field(() => [ViewSummary], { nullable: true })
    viewSummaries?: ViewSummary[];
}
