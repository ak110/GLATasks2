/**
 * @fileoverview Drizzle Kit 設定ファイル
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/src/lib/server/schema.ts",
  out: "./drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "mysql://glatasks:glatasks@localhost/glatasks",
  },
});
