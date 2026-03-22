export const CacheTTL = {
    ENTITY: 300,       // 5 minutes — single entity lookups (movie by ID, tvShow by ID)
    LIST: 120,         // 2 minutes — paginated list queries (change more frequently)
    DATALOADER: 300,   // 5 minutes — dataloader batch results (entity-level)
} as const;

export const CachePrefix = {
    MOVIE: 'movie',
    MOVIES: 'movies',
    TV_SHOW: 'tvshow',
    TV_SHOWS: 'tvshows',
    SEASONS: 'seasons',
    VIEW_SUMMARY_MOVIE: 'vs:movie',
    VIEW_SUMMARY_SEASON: 'vs:season',
} as const;
