const globalTeardown = () => {
  process.env.SPACETIMEDB_TEST_MODE = 'false'
}

export default globalTeardown
