export class GetTvShowsQuery {
    constructor(
        public readonly first?: number,
        public readonly after?: string,
        public readonly title?: string,
    ) { }
}
