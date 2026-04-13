import { GetTvShowQuery } from './get-tv-show.query';

describe('GetTvShowQuery', () => {
    describe('constructor', () => {
        it('should store the provided id as a readonly property', () => {
            const sut = new GetTvShowQuery('123');

            expect(sut.id).toBe('123');
        });

        it('should accept any non-empty string id', () => {
            const sut = new GetTvShowQuery('9007199254740991');

            expect(sut.id).toBe('9007199254740991');
        });

        it('should create two distinct instances with different ids', () => {
            const q1 = new GetTvShowQuery('1');
            const q2 = new GetTvShowQuery('2');

            expect(q1.id).not.toBe(q2.id);
        });
    });
});
