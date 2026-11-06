import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Tests that run the real server, the web app and Chromium: `pnpm test:e2e`.
// Needs `pnpm exec playwright install chromium` once.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/e2e/**/*.e2e.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // One browser and one app at a time
    fileParallelism: false,
  },
});
