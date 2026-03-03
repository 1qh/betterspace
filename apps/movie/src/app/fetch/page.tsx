/* eslint-disable @next/next/no-img-element */
// biome-ignore-all lint/correctness/useImageSize: x
'use client'
import { reducers } from '@a/be/spacetimedb'
import { Badge } from '@a/ui/badge'
import { Input } from '@a/ui/input'
import { Skeleton } from '@a/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useReducer } from 'spacetimedb/react'
import { useState, useTransition } from 'react'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300',
  TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780',
  formatMoney = (n: null | number) => (n ? `$${(n / 1_000_000).toFixed(1)}M` : 'N/A')

interface MovieDetailData {
  backdropPath: null | string
  budget: null | number
  genres: { id: number; name: string }[]
  originalTitle: string
  overview: string
  posterPath: null | string
  releaseDate: string
  revenue: null | number
  runtime: null | number
  tagline: null | string
  title: string
  tmdbId: number
  voteAverage: number
  voteCount: number
}

interface TmdbMovieResponse {
  backdrop_path: null | string
  budget: number
  genres: { id: number; name: string }[]
  id: number
  original_title: string
  overview: string
  poster_path: null | string
  release_date: string
  revenue: number
  runtime: null | number
  tagline: string
  title: string
  vote_average: number
  vote_count: number
}

const fetchMovie = async (id: number): Promise<MovieDetailData> => {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    if (!apiKey) throw new Error('Missing NEXT_PUBLIC_TMDB_API_KEY')
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`)
    url.searchParams.set('api_key', apiKey)
    const response = await fetch(url)
    if (!response.ok) throw new Error('Movie not found')
    const payload = (await response.json()) as TmdbMovieResponse
    return {
      backdropPath: payload.backdrop_path,
      budget: payload.budget || null,
      genres: payload.genres,
      originalTitle: payload.original_title,
      overview: payload.overview,
      posterPath: payload.poster_path,
      releaseDate: payload.release_date,
      revenue: payload.revenue || null,
      runtime: payload.runtime,
      tagline: payload.tagline || null,
      title: payload.title,
      tmdbId: payload.id,
      voteAverage: payload.vote_average,
      voteCount: payload.vote_count
    }
  },
  MovieDetail = ({ movie }: { movie: MovieDetailData }) => (
    <div className='flex flex-col gap-4' data-testid='movie-detail'>
      <div className='flex items-center gap-2'>
        <Badge data-testid='cache-status' variant='default'>
          Fetched from TMDB
        </Badge>
        <span className='text-sm text-muted-foreground' data-testid='movie-id'>
          ID: {movie.tmdbId}
        </span>
      </div>
      {movie.backdropPath ? (
        <img alt={movie.title} className='w-full rounded-lg object-cover' src={`${TMDB_BACKDROP}${movie.backdropPath}`} />
      ) : null}
      <div className='flex gap-4'>
        {movie.posterPath ? (
          <img
            alt={movie.title}
            className='h-56 w-36 shrink-0 rounded-lg object-cover'
            src={`${TMDB_IMG}${movie.posterPath}`}
          />
        ) : null}
        <div className='flex flex-col gap-2'>
          <h2 className='text-2xl font-bold'>{movie.title}</h2>
          {movie.originalTitle === movie.title ? null : (
            <p className='text-sm text-muted-foreground'>{movie.originalTitle}</p>
          )}
          {movie.tagline ? <p className='text-muted-foreground italic'>{movie.tagline}</p> : null}
          <div className='flex flex-wrap gap-1'>
            {movie.genres.map((g: { id: number; name: string }) => (
              <Badge key={g.id} variant='outline'>
                {g.name}
              </Badge>
            ))}
          </div>
          <div className='mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm [&_span]:text-muted-foreground'>
            <p>
              <span>Release:</span> {movie.releaseDate}
            </p>
            <p>
              <span>Runtime:</span> {movie.runtime ?? 'N/A'} min
            </p>
            <p>
              <span>Rating:</span> {movie.voteAverage.toFixed(1)} ({movie.voteCount.toLocaleString()} votes)
            </p>
            <p>
              <span>Budget:</span> {formatMoney(movie.budget)}
            </p>
            <p>
              <span>Revenue:</span> {formatMoney(movie.revenue)}
            </p>
          </div>
        </div>
      </div>
      <p className='text-muted-foreground'>{movie.overview}</p>
    </div>
  ),
  Page = () => {
    const createMovie = useReducer(reducers.createMovie),
      [id, setId] = useState(''),
      [movie, setMovie] = useState<MovieDetailData | null>(null),
      [fetchError, setFetchError] = useState(''),
      [pending, go] = useTransition()
    return (
      <div className='mx-auto flex max-w-2xl flex-col gap-4 p-4' data-testid='movie-fetch-page'>
        <div className='flex items-center gap-2'>
          <Link className='rounded-lg p-1 hover:bg-muted' href='/'>
            <ArrowLeft className='size-5' />
          </Link>
          <h1 className='text-xl font-semibold'>Fetch by ID</h1>
        </div>
        <form
          className='flex gap-2'
          data-testid='movie-fetch-form'
          onSubmit={e => {
            e.preventDefault()
            const n = Number(id)
            if (!n || n < 1) {
              setFetchError('Enter a valid TMDB ID')
              return
            }
            setFetchError('')
            go(async () => {
              try {
                const loadedMovie = await fetchMovie(n)
                setMovie(loadedMovie)
                try {
                  await createMovie({
                    backdropPath: loadedMovie.backdropPath ?? undefined,
                    budget: loadedMovie.budget ?? undefined,
                    genres: loadedMovie.genres,
                    originalTitle: loadedMovie.originalTitle,
                    overview: loadedMovie.overview,
                    posterPath: loadedMovie.posterPath ?? undefined,
                    releaseDate: loadedMovie.releaseDate,
                    revenue: loadedMovie.revenue ?? undefined,
                    runtime: loadedMovie.runtime ?? undefined,
                    tagline: loadedMovie.tagline ?? undefined,
                    title: loadedMovie.title,
                    tmdbId: loadedMovie.tmdbId,
                    voteAverage: loadedMovie.voteAverage,
                    voteCount: loadedMovie.voteCount
                  })
                } catch (error) {
                  if (error instanceof Error) setFetchError(m => m)
                }
              } catch {
                setFetchError('Movie not found')
                setMovie(null)
              }
            })
          }}>
          <Input
            data-testid='movie-id-input'
            onChange={e => setId(e.target.value)}
            placeholder='TMDB ID (e.g. 27205)'
            value={id}
          />
        </form>
        <p className='text-xs text-muted-foreground'>
          Try: 27205 (Inception), 550 (Fight Club), 680 (Pulp Fiction), 155 (The Dark Knight)
        </p>
        {fetchError ? (
          <p className='text-sm text-destructive' data-testid='movie-error'>
            {fetchError}
          </p>
        ) : null}
        {pending ? (
          <div className='flex flex-col gap-4' data-testid='movie-loading'>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-48 w-full rounded-lg' />
            <div className='flex gap-4'>
              <Skeleton className='h-56 w-36 shrink-0' />
              <div className='flex flex-1 flex-col gap-2'>
                <Skeleton className='h-8 w-64' />
                <Skeleton className='h-4 w-48' />
                <Skeleton className='h-6 w-32' />
                <Skeleton className='mt-2 h-20 w-full' />
              </div>
            </div>
          </div>
        ) : movie ? (
          <MovieDetail movie={movie} />
        ) : null}
      </div>
    )
  }
export default Page
