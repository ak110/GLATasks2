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
    emptyOutDir: false, // デプロイ時の影響を最小限にするため
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "appjs/main.ts"),
      },
      output: {
        // ファイル名は固定にする (デプロイ時の影響を最小限にするため)
        entryFileNames: "[name].mjs",
        chunkFileNames: "[name].mjs",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [tsconfigPaths(), tailwindcss()],
})
