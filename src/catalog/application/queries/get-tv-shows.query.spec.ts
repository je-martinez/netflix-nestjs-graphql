import { GetTvShowsQuery } from './get-tv-shows.query';

describe('GetTvShowsQuery', () => {
    describe('constructor', () => {
        it('should store all provided arguments', () => {
            const sut = new GetTvShowsQuery(2, 25, 'Stranger Things');

            expect(sut.page).toBe(2);
            expect(sut.pageSize).toBe(25);
            expect(sut.title).toBe('Stranger Things');
        });

        it('should leave all properties undefined when called with no arguments', () => {
            const sut = new GetTvShowsQuery();

            expect(sut.page).toBeUndefined();
            expect(sut.pageSize).toBeUndefined();
            expect(sut.title).toBeUndefined();
        });

        it('should allow title to be undefined while page and pageSize are set', () => {
            const sut = new GetTvShowsQuery(1, 10);

            expect(sut.page).toBe(1);
            expect(sut.pageSize).toBe(10);
            expect(sut.title).toBeUndefined();
        });

        it('should create two distinct instances independently', () => {
            const q1 = new GetTvShowsQuery(1, 10, 'Dark');
            const q2 = new GetTvShowsQuery(2, 20);

            expect(q1.page).not.toBe(q2.page);
            expect(q1.title).not.toBe(q2.title);
        });
    });
});
