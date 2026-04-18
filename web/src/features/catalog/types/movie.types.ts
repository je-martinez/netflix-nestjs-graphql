export type Rating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';

export interface Movie {
  id: string;
  title: string;
  year: number;
  runtime: number;
  rating: Rating;
  posterUrl: string;
  synopsis: string;
  director: string;
  starring: string[];
  genres: string[];
  chapters: Chapter[];
  bonusMaterials: BonusMaterial[];
  technicalSpecs: TechnicalSpecs;
  stockNumber: string;
}

export interface Chapter {
  number: number;
  title: string;
  thumbnailUrl: string;
}

export interface BonusMaterial {
  icon: string;
  label: string;
  active?: boolean;
}

export interface TechnicalSpecs {
  audio: string;
  resolution: string;
  region: string;
}

export interface MoviesQueryResult {
  movies: Movie[];
}

export interface MovieQueryResult {
  movie: Movie;
}
