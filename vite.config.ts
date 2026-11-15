import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { VitePWA } from "vite-plugin-pwa";

// The browser version (`pnpm build:browser`) is an installable app that works offline; the
// server version is not (a service worker would only get in the way of the API)
const isBrowserMode = process.env.VITE_STORAGE_MODE === "browser";
const MAX_PRECACHED_BYTES = 6 * 1024 * 1024;

// The short git commit of this build, shown next to the version (#460). Cloudflare Pages has no
// .git history to rely on, so it passes the commit in CF_PAGES_COMMIT_SHA
function readCommit(): string {
  const fromHost = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromHost) return fromHost.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_COMMIT__: JSON.stringify(readCommit()) },
  plugins: [
    react(),
    tsconfigPaths(),
    ...(isBrowserMode
      ? [
          VitePWA({
            // A new version waits until the open tabs are closed, so open work is never
            // interrupted; the next visit uses it
            registerType: "prompt",
            injectRegister: "script",
            includeAssets: ["icon.svg", "apple-touch-icon.png", "cities.txt"],
            manifest: {
              name: "CV Builder",
              // eslint-disable-next-line @typescript-eslint/naming-convention -- manifest field
              short_name: "CV Builder",
              description:
                "Build and tailor your CV. Your data stays in your browser.",
              // eslint-disable-next-line @typescript-eslint/naming-convention -- manifest field
              start_url: "/vault",
              scope: "/",
              display: "standalone",
              // eslint-disable-next-line @typescript-eslint/naming-convention -- manifest field
              theme_color: "#1e3a5f",
              // eslint-disable-next-line @typescript-eslint/naming-convention -- manifest field
              background_color: "#ffffff",
              icons: [
                { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
                {
                  src: "/icon-maskable-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,png,txt,woff,woff2}"],
              maximumFileSizeToCacheInBytes: MAX_PRECACHED_BYTES,
              // Every address of the app is index.html (see public/_redirects)
              navigateFallback: "/index.html",
              cleanupOutdatedCaches: true,
            },
          }),
        ]
      : []),
  ],
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
