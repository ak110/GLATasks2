import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom", // ブラウザ向け想定
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", // eslint-disable-line @typescript-eslint/naming-convention
  },
  moduleDirectories: ["node_modules", "src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
}

export default config
