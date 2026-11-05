import path from "node:path";

export interface ServerConfig {
  /** Only this machine can connect */
  host: string;
  port: number;

  /** Folder with vault.json and variants/ */
  dataDir: string;
}

const DEFAULT_PORT = 3001;
const MAX_PORT = 65535;

/** Reads the settings from environment variables (PORT, DATA_DIR) with safe defaults */
export function readConfig(
  env: Record<string, string | undefined>,
  cwd: string
): ServerConfig {
  const port = env.PORT ? Number(env.PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`PORT must be a whole number from 1 to ${MAX_PORT}.`);
  }
  return {
    host: "127.0.0.1",
    port,
    dataDir: path.resolve(cwd, env.DATA_DIR ?? "data"),
  };
}
