export const maxDuration = 60

const withUnavailable = () => Response.json({ error: 'AI not available' }, { status: 503 }),
  POST = async () => withUnavailable(),
  DELETE = async () => withUnavailable()

export { DELETE, POST }
