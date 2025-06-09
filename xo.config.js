/**
 * @see https://github.com/xojs/xo
 * @type {import('xo').FlatXoConfig}
 */
const xoConfig = {
  ignores: [
    "./.cache/**",
    "./.local/**",
    "./.venv/**",
    "./app/static/**",
    "./app/templates/**",
    "./data/**",
    "./dist/**",
    "./node_modules/**",
  ],
  space: 2,
  semicolon: false,
  prettier: true,
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    globals: {
      window: "readonly",
      document: "readonly",
      navigator: "readonly",
      console: "readonly",
    },
  },
  rules: {
    "@stylistic/quotes": "off",
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/no-empty-function": "off",
    camelcase: "off",
    "import/no-cycle": "off", // あまりに重いので無効化
    "no-alert": "off",
    "max-depth": ["warn", 6],
    "max-params": ["warn", 5],
  },
}

export default xoConfig
