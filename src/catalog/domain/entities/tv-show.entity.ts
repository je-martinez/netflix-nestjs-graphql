import { Season } from '@/catalog/domain/entities/season.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TvShow {
    @Field(() => ID)
    id: string;

    @Field()
    title: string;

    @Field({ nullable: true })
    originalTitle?: string;

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

    @Field(() => [Season], { nullable: true })
    seasons?: Season[];
}
