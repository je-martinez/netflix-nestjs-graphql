import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MOCK_MOVIES } from './movies.mock';

// Helpers to control the GraphQL endpoint env var
function setEndpoint(url: string) {
  vi.stubEnv('PUBLIC_GRAPHQL_URL', url);
}
function clearEndpoint() {
  vi.unstubAllEnvs();
}

// Re-import the service fresh each time so import.meta.env is re-evaluated
async function importService() {
  vi.resetModules();
  return import('./movies.service');
}

describe('getMovies (mock fallback)', () => {
  afterEach(clearEndpoint);

  it('returns all mock movies when no endpoint is configured', async () => {
    clearEndpoint();
    const { getMovies } = await importService();
    const movies = await getMovies();
    expect(movies).toEqual(MOCK_MOVIES);
    expect(movies.length).toBe(MOCK_MOVIES.length);
  });

  it('first movie has id "1"', async () => {
    clearEndpoint();
    const { getMovies } = await importService();
    const movies = await getMovies();
    expect(movies[0].id).toBe('1');
  });
});

describe('getMovieById (mock fallback)', () => {
  afterEach(clearEndpoint);

  it('returns the correct movie by id', async () => {
    clearEndpoint();
    const { getMovieById } = await importService();
    const movie = await getMovieById('1');
    expect(movie).toBeDefined();
    expect(movie!.id).toBe('1');
    expect(movie!.title).toBe('Neon Frontier');
  });

  it('returns undefined for a non-existent id', async () => {
    clearEndpoint();
    const { getMovieById } = await importService();
    const movie = await getMovieById('9999');
    expect(movie).toBeUndefined();
  });

  it('returns a movie with all required detail fields', async () => {
    clearEndpoint();
    const { getMovieById } = await importService();
    const movie = await getMovieById('6');
    expect(movie).toBeDefined();
    expect(movie!.chapters.length).toBeGreaterThan(0);
    expect(movie!.bonusMaterials.length).toBeGreaterThan(0);
    expect(movie!.technicalSpecs).toBeDefined();
  });
});

describe('getMovies (GraphQL endpoint)', () => {
  afterEach(() => {
    clearEndpoint();
    vi.restoreAllMocks();
  });

  it('calls fetch with correct payload when endpoint is set', async () => {
    setEndpoint('http://localhost:3000/graphql');
    const mockMovies = [MOCK_MOVIES[0]];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { movies: mockMovies } }),
    } as Response);

    const { getMovies } = await importService();
    const movies = await getMovies();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(movies).toEqual(mockMovies);
  });

  it('throws on non-ok HTTP response', async () => {
    setEndpoint('http://localhost:3000/graphql');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { getMovies } = await importService();
    await expect(getMovies()).rejects.toThrow('GraphQL request failed: 500');
  });

  it('throws on GraphQL errors in response body', async () => {
    setEndpoint('http://localhost:3000/graphql');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'Not authorized' }] }),
    } as Response);

    const { getMovies } = await importService();
    await expect(getMovies()).rejects.toThrow('Not authorized');
  });
});
