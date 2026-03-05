import { base } from '../../t'
import { cacheCrud } from './lazy'

const movieCrud = cacheCrud('movie', 'tmdbId', base.movie)

export { movieCrud }
