import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // *.test.mjs files use node:test and run under `node --test`, not Jest.
  testPathIgnorePatterns: ["/node_modules/", "\.test\.mjs$"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { strict: false } }],
  },
};

export default config;
