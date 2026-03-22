import { GetMovieQuery } from './get-movie.query';

describe('GetMovieQuery', () => {
    describe('constructor', () => {
        it('should store the id on the public property', () => {
            const sut = new GetMovieQuery('42');
            expect(sut.id).toBe('42');
        });

        it('should accept any string as id', () => {
            const sut = new GetMovieQuery('99999');
            expect(sut.id).toBe('99999');
        });
    });
});
