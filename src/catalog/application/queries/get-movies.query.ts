import { Int } from '@nestjs/graphql';

export class GetMoviesQuery {
    constructor(
        public readonly page?: number,
        public readonly pageSize?: number,
        public readonly title?: string,
    ) { }
}
