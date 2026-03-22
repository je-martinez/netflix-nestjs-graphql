import { GetMoviesQuery } from './get-movies.query';

describe('GetMoviesQuery', () => {
    describe('constructor', () => {
        it('should store all provided arguments', () => {
            const sut = new GetMoviesQuery(2, 20, 'inception');
            expect(sut.page).toBe(2);
            expect(sut.pageSize).toBe(20);
            expect(sut.title).toBe('inception');
        });

        it('should default all properties to undefined when no arguments are provided', () => {
            const sut = new GetMoviesQuery();
            expect(sut.page).toBeUndefined();
            expect(sut.pageSize).toBeUndefined();
            expect(sut.title).toBeUndefined();
        });

        it('should allow title to be omitted while providing page and pageSize', () => {
            const sut = new GetMoviesQuery(1, 10);
            expect(sut.page).toBe(1);
            expect(sut.pageSize).toBe(10);
            expect(sut.title).toBeUndefined();
        });
    });
});
