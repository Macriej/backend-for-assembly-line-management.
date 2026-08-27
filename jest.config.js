/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Testy odpalane sekwencyjnie (--runInBand), bo dzielą jedną bazę testową
  // i nie chcemy race conditions przy współbieżnych zapisach.
};
