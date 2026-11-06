import { readFileSync } from "node:fs";

/**
 * Prompts live as files in `ai/prompts/` (version-controlled, reviewable), not as strings
 * in code. `loadPrompt("json-only")` reads `prompts/json-only.md`.
 */
export function loadPrompt(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Invalid prompt name: ${name}`);
  }
  return readFileSync(
    new URL(`./prompts/${name}.md`, import.meta.url),
    "utf8"
  ).trim();
}
