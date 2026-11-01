module.exports = {
  rootDir: '..',
  roots: ['<rootDir>/electron'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/electron/SplashWindow.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/electron/tsconfig.splash-test.json',
    }],
  },
};
