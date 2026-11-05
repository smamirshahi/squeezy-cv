import { buildServer } from "@server/app";
import { readConfig } from "@server/config";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const config = readConfig(process.env, process.cwd());
const app = buildServer({
  storage: new FileCvStorage(config.dataDir),
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
