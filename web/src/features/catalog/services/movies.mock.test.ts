import { describe, it, expect } from 'vitest';
import { MOCK_MOVIES } from './movies.mock';

describe('MOCK_MOVIES', () => {
  it('contains at least one movie', () => {
    expect(MOCK_MOVIES.length).toBeGreaterThan(0);
  });

  it('every movie has a unique id', () => {
    const ids = MOCK_MOVIES.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(MOCK_MOVIES.length);
  });

  it('every movie has required fields', () => {
    for (const movie of MOCK_MOVIES) {
      expect(movie.id).toBeTruthy();
      expect(movie.title).toBeTruthy();
      expect(movie.year).toBeGreaterThan(1900);
      expect(movie.runtime).toBeGreaterThan(0);
      expect(['G', 'PG', 'PG-13', 'R', 'NC-17']).toContain(movie.rating);
      expect(movie.posterUrl).toMatch(/^https?:\/\//);
      expect(movie.synopsis).toBeTruthy();
      expect(movie.director).toBeTruthy();
      expect(movie.starring.length).toBeGreaterThan(0);
      expect(movie.genres.length).toBeGreaterThan(0);
      expect(movie.stockNumber).toBeTruthy();
    }
  });

  it('every movie has at least one chapter', () => {
    for (const movie of MOCK_MOVIES) {
      expect(movie.chapters.length).toBeGreaterThan(0);
    }
  });

  it('chapter numbers are sequential starting at 1', () => {
    for (const movie of MOCK_MOVIES) {
      movie.chapters.forEach((ch, idx) => {
        expect(ch.number).toBe(idx + 1);
        expect(ch.title).toBeTruthy();
        expect(ch.thumbnailUrl).toMatch(/^https?:\/\//);
      });
    }
  });

  it('every movie has at least one bonus material', () => {
    for (const movie of MOCK_MOVIES) {
      expect(movie.bonusMaterials.length).toBeGreaterThan(0);
    }
  });

  it('every movie has valid technical specs', () => {
    for (const movie of MOCK_MOVIES) {
      expect(movie.technicalSpecs.audio).toBeTruthy();
      expect(movie.technicalSpecs.resolution).toBeTruthy();
      expect(movie.technicalSpecs.region).toBeTruthy();
    }
  });
});
