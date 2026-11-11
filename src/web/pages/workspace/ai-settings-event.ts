import { AiTask } from "@shared/ai/providers";

/** Fired to open the AI settings dialog, optionally on one task (from the "Settings…" link of an AI action) */
export const OPEN_AI_SETTINGS_EVENT = "cv-builder-open-ai-settings";

/** Opens the AI settings dialog (on `task` when given, else on "All tasks") */
export function openAiSettings(task?: AiTask): void {
  window.dispatchEvent(
    new CustomEvent<{ task?: AiTask }>(OPEN_AI_SETTINGS_EVENT, {
      detail: { task },
    })
  );
}
