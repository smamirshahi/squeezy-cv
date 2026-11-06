import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      // The local API server (pnpm dev:server)
      "/api": `http://127.0.0.1:${process.env.PORT ?? 3001}`,
    },
  },
  test: {
    environment: "node",
    // The editor tests render many form fields; a busy machine can exceed the 5 s default
    testTimeout: 20_000,
    include: ["src/**/*.test.{ts,tsx}"],
    // Real-browser tests: `pnpm test:e2e`
    exclude: ["**/node_modules/**", "src/e2e/**"],
  },
});
