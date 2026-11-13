import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AiSettingsData, AiSettingsStore } from "@server/ai/ai-registry";

/** A small JSON file (written atomically). A missing or unreadable file means "no choice made". */
export class FileAiSettings implements AiSettingsStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AiSettingsData> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  async save(settings: AiSettingsData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    await writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(temp, this.filePath);
  }
}
