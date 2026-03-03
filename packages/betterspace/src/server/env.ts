const isTestMode = () => process.env.SPACETIMEDB_TEST_MODE === 'true'

export { isTestMode }
