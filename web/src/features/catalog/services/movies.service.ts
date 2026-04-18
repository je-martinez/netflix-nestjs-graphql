import type { Movie, MoviesQueryResult, MovieQueryResult } from '../types/movie.types';
import { MOCK_MOVIES } from './movies.mock';

const getEndpoint = () => import.meta.env.PUBLIC_GRAPHQL_URL ?? '';

const MOVIES_QUERY = `
  query GetMovies {
    movies {
      id title year runtime rating posterUrl synopsis director starring genres stockNumber
    }
  }
`;

const MOVIE_QUERY = `
  query GetMovie($id: ID!) {
    movie(id: $id) {
      id title year runtime rating posterUrl synopsis director starring genres stockNumber
      chapters { number title thumbnailUrl }
      bonusMaterials { icon label active }
      technicalSpecs { audio resolution region }
    }
  }
`;

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const endpoint = getEndpoint();
  if (!endpoint) {
    throw new Error('No GraphQL endpoint');
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function getMovies(): Promise<Movie[]> {
  if (!getEndpoint()) return MOCK_MOVIES;
  const data = await gqlFetch<MoviesQueryResult>(MOVIES_QUERY);
  return data.movies;
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  if (!getEndpoint()) return MOCK_MOVIES.find((m) => m.id === id);
  const data = await gqlFetch<MovieQueryResult>(MOVIE_QUERY, { id });
  return data.movie;
}
