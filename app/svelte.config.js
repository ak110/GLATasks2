import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: "build" }),
    // CSRF対策はhooks.server.tsのSec-Fetch-Siteチェックで行うため、
    // SvelteKit組み込みのOriginチェックは無効化（リバプロ経由で誤検知するため）
    csrf: { trustedOrigins: ["*"] },
  },
};

export default config;
