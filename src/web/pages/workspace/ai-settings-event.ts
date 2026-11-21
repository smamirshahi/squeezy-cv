import { AiTask } from "@shared/ai/providers";

/** Fired to open the AI settings dialog, optionally on one task (from the "Settings…" link of an AI action) */
export const OPEN_AI_SETTINGS_EVENT = "squeezy-cv-open-ai-settings";

/** Opens the AI settings dialog (on `task` when given, else on "All tasks"; "cost" opens Cost and usage) */
export function openAiSettings(task?: AiTask | "cost"): void {
  window.dispatchEvent(
    new CustomEvent<{ task?: AiTask | "cost" }>(OPEN_AI_SETTINGS_EVENT, {
      detail: { task },
    })
  );
}
