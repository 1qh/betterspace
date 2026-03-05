import { children } from '../../t'
import { childCrud } from './lazy'

const messageCrud = childCrud('message', { foreignKey: 'chatId', table: 'chat' }, children.message.schema)

export { messageCrud }
