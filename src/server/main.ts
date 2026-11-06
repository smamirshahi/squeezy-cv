import { buildServer } from "@server/app";
import { readAiConfig } from "@server/ai/ai-config";
import { createConfiguredAi } from "@server/ai/ai-provider";
import { readConfig } from "@server/config";
import { BackupService } from "@server/backup/backup-service";
import { GitDataRepo } from "@server/backup/data-repo";
import { VersionedCvStorage } from "@server/backup/versioned-storage";
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
const backup = new BackupService(new GitDataRepo(config.dataDir));
const app = buildServer({
  storage: new VersionedCvStorage(new FileCvStorage(config.dataDir), backup),
  backup,
  pdf: new PlaywrightPdfRenderer(config.webUrl),
  ai: createConfiguredAi(aiConfig),
  aiProvider: aiConfig.provider,
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
    app.log.info(
      backup.isEnabled
        ? "Data folder is a git repository: saves are committed."
        : "Data folder is not a git repository: saves are not versioned."
    );
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
