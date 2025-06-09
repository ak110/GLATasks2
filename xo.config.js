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
  rules: {
    "@stylistic/quotes": "off",
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/no-empty-function": "off",
    camelcase: "off",
    "import/no-cycle": "off",
    "no-alert": "off",
    "max-depth": ["warn", 6],
    "max-params": ["warn", 5],
  },
}

export default xoConfig
