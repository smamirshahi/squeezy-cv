import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        // The prompts as bundled text instead of files read from disk, so the AI code can run in the
        // browser version (the Node server, run without Vite, reads the files)
        find: /^@server\/ai\/prompts$/,
        replacement: fileURLToPath(
          new URL(
            "src/web/store/persistence/browser/ai/browser-prompts.ts",
            import.meta.url
          )
        ),
      },
    ],
  },
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
