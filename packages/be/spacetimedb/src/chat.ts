import { owned } from '../../t'
import { crud as makeCrud } from './lazy'

const chatCrud = makeCrud('chat', owned.chat)

export { chatCrud }
