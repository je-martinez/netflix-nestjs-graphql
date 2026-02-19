import { Int } from '@nestjs/graphql';

export class GetMoviesQuery {
    constructor(
        public readonly first?: number,
        public readonly after?: string,
        public readonly title?: string,
    ) { }
}
