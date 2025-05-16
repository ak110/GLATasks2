/** @type {import('xo').Options} */

const xoConfig = {
  ignores: [
    "./.cache/**",
    "./.local/**",
    "./.pnpm-store/**",
    "./.venv/**",
    "./app/static/**",
    "./app/template/**",
    "./data/**",
    "./dist/**",
    "./node_modules/**",
  ],
  prettier: true,
  space: 2,
  semicolon: false,
  envs: ["browser"],
  rules: {
    "@typescript-eslint/naming-convention": "off",
    "@stylistic/quotes": "off",
    camelcase: "off",
    "import/no-cycle": "off",
    "no-alert": "off",
    "max-depth": ["warn", 6],
    "max-params": ["warn", 5],
  },
}

export default xoConfig
