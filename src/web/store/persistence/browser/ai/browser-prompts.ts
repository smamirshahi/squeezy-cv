/**
 * The same `loadPrompt` as `server/ai/prompts.ts`, for code that runs in the browser (and in
 * tests, which go through Vite): the prompt files are bundled as text. Vite swaps this in for
 * `@server/ai/prompts` (see `vite.config.ts`).
 */
const FILES = import.meta.glob<string>("/src/server/ai/prompts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function loadPrompt(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Invalid prompt name: ${name}`);
  }
  const text = FILES[`/src/server/ai/prompts/${name}.md`];
  if (text === undefined) {
    throw new Error(`There is no prompt ${name}.`);
  }
  return text.trim();
}
