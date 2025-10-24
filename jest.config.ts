import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'], 
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}

export default createJestConfig(customJestConfig)