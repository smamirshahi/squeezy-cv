import { buildServer } from "@server/app";
import { readAiConfig } from "@server/ai/ai-config";
import { createAiClient } from "@server/ai/claude-client";
import { readConfig } from "@server/config";
import { PlaywrightPdfRenderer } from "@server/pdf/pdf-renderer";
import { FileCvStorage } from "@server/storage/file-cv-storage";

// Settings and secrets (e.g. ANTHROPIC_API_KEY) from .env, if there is one
try {
  process.loadEnvFile(".env");
} catch {
  // no .env: use the real environment only
}

const config = readConfig(process.env, process.cwd());
const aiConfig = readAiConfig(process.env);
const app = buildServer({
  storage: new FileCvStorage(config.dataDir),
  pdf: new PlaywrightPdfRenderer(config.webUrl),
  ai: aiConfig.apiKey ? createAiClient(aiConfig) : undefined,
  isLoggingEnabled: true,
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

app
  .listen({ host: config.host, port: config.port })
  .then(() => {
    app.log.info(`CV data folder: ${config.dataDir}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
