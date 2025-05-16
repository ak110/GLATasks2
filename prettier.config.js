/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  plugins: ["prettier-plugin-jinja-template"],
  semi: false,
  useTabs: false,
  tabWidth: 2,
  trailingComma: "all",
  printWidth: 127,
  singleQuote: false,
  bracketSpacing: true,
  overrides: [
    {
      files: ["*.html"],
      options: {
        parser: "jinja-template",
      },
    },
  ],
}

export default config
