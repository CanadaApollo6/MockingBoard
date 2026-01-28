/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/packages/shared/src/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': '@swc/jest',
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'bot',
      testMatch: ['<rootDir>/packages/bot/src/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': '@swc/jest',
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
  ],
};

export default config;
