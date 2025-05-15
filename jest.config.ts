import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/appjs/jest.setup.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  moduleDirectories: ["node_modules", "appjs"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
      },
    ],
  },
}

export default config
