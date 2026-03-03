// biome-ignore-all lint/performance/noImgElement: x
'use client'

import { Input } from '@a/ui/input'
import Link from 'next/link'
import { useState, useTransition } from 'react'

interface SearchResult {
  id: number
  overview: string
  poster_path: null | string
  release_date: string
  title: string
  tmdb_id: number
  vote_average: number
}

interface TmdbSearchResponse {
  results: SearchResult[]
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w200',
  searchMovies = async (query: string) => {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    if (!apiKey) throw new Error('Missing NEXT_PUBLIC_TMDB_API_KEY')
    const url = new URL('https://api.themoviedb.org/3/search/movie')
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('query', query)
    const response = await fetch(url)
    if (!response.ok) throw new Error('Search failed')
    const payload = (await response.json()) as TmdbSearchResponse
    const rows: SearchResult[] = []
    for (const m of payload.results)
      rows.push({
        id: m.id,
        overview: m.overview,
        poster_path: m.poster_path,
        release_date: m.release_date,
        title: m.title,
        tmdb_id: m.id,
        vote_average: m.vote_average
      })
    return rows
  },
  MovieCard = ({ movie }: { movie: SearchResult }) => (
    <div className='flex gap-3 rounded-lg border p-3' data-testid='movie-card'>
      {movie.poster_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={movie.title}
          className='h-32 w-20 shrink-0 rounded-sm object-cover'
          data-testid='movie-poster'
          src={`${TMDB_IMG}${movie.poster_path}`}
        />
      ) : (
        <div className='flex h-32 w-20 shrink-0 items-center justify-center rounded-sm bg-muted text-xs text-muted-foreground'>
          No image
        </div>
      )}
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <p className='font-medium' data-testid='movie-title'>
          {movie.title}
        </p>
        <p className='text-xs text-muted-foreground' data-testid='movie-meta'>
          {movie.release_date.slice(0, 4)} • {movie.vote_average.toFixed(1)} • ID: {movie.tmdb_id}
        </p>
        <p className='line-clamp-2 text-sm text-muted-foreground'>{movie.overview}</p>
      </div>
    </div>
  ),
  Page = () => {
    const [query, setQuery] = useState(''),
      [results, setResults] = useState<SearchResult[]>([]),
      [searchError, setSearchError] = useState(''),
      [pending, go] = useTransition()

    return (
      <div className='mx-auto flex max-w-2xl flex-col gap-4 p-4' data-testid='movie-search-page'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Movie Search</h1>
          <Link className='text-sm text-muted-foreground hover:text-foreground' href='/fetch'>
            Fetch by ID →
          </Link>
        </div>
        <form
          className='flex gap-2'
          data-testid='movie-search-form'
          onSubmit={e => {
            e.preventDefault()
            if (!query.trim()) return
            setSearchError('')
            go(async () => {
              try {
                setResults(await searchMovies(query.trim()))
              } catch {
                setResults([])
                setSearchError('Unable to search TMDB right now')
              }
            })
          }}>
          <Input
            data-testid='movie-search-input'
            onChange={e => setQuery(e.target.value)}
            placeholder={pending ? 'Searching...' : 'Search movies...'}
            value={query}
          />
        </form>
        {searchError ? <p className='text-sm text-destructive'>{searchError}</p> : null}
        {results.length ? (
          <div data-testid='movie-results'>
            {results.map(m => (
              <MovieCard key={m.tmdb_id} movie={m} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

export default Page
