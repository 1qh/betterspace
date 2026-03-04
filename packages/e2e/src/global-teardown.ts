// biome-ignore-all lint/style/noProcessEnv: e2e env
const globalTeardown = () => {
  process.env.SPACETIMEDB_TEST_MODE = 'false'
}

export default globalTeardown
