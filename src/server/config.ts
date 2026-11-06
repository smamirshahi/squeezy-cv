import path from "node:path";

export interface ServerConfig {
  /** Only this machine can connect */
  host: string;
  port: number;

  /** Folder with vault.json and variants/ */
  dataDir: string;

  /** Where the web app is served, which the PDF renderer opens. Must be this machine. */
  webUrl: string;
}

const DEFAULT_PORT = 3001;
const MAX_PORT = 65535;
const DEFAULT_WEB_URL = "http://localhost:5173";
const LOCAL_NAMES = ["127.0.0.1", "localhost", "[::1]"];

/** Reads the settings from environment variables (PORT, DATA_DIR, WEB_URL) with safe defaults */
export function readConfig(
  env: Record<string, string | undefined>,
  cwd: string
): ServerConfig {
  const port = env.PORT ? Number(env.PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`PORT must be a whole number from 1 to ${MAX_PORT}.`);
  }
  const webUrl = env.WEB_URL ?? DEFAULT_WEB_URL;
  let parsed: URL;
  try {
    parsed = new URL(webUrl);
  } catch {
    throw new Error(
      "WEB_URL must be a full address, e.g. http://localhost:5173"
    );
  }
  // The server drives a browser to this address, so it must not be a place on the internet
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !LOCAL_NAMES.includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error(
      "WEB_URL must point to this machine (localhost or 127.0.0.1)."
    );
  }
  return {
    host: "127.0.0.1",
    port,
    dataDir: path.resolve(cwd, env.DATA_DIR ?? "data"),
    webUrl,
  };
}
