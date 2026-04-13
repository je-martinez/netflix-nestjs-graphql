export class GetTvShowsQuery {
    constructor(
        public readonly page?: number,
        public readonly pageSize?: number,
        public readonly title?: string,
    ) { }
}
