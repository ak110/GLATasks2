import path, { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: "./", // 相対パスを使用
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
  build: {
    outDir: "app/static/dist",
    emptyOutDir: true, // ビルド前に出力ディレクトリを空にする
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "appjs/main.ts"),
      },
      output: {
        entryFileNames: "[name].mjs",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [tsconfigPaths(), tailwindcss()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./appjs/vitest.setup.ts"],
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
})
