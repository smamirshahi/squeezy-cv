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

/** Fired when the AI settings dialog closes, so screens that show the chosen provider read it again */
const AI_SETTINGS_CHANGED_EVENT = "squeezy-cv-ai-settings-changed";

/** Tells every screen that the AI settings may have changed */
export function announceAiSettingsChanged(): void {
  window.dispatchEvent(new Event(AI_SETTINGS_CHANGED_EVENT));
}

/** Calls `listener` whenever the AI settings may have changed; returns the unsubscribe function */
export function onAiSettingsChanged(listener: () => void): () => void {
  window.addEventListener(AI_SETTINGS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(AI_SETTINGS_CHANGED_EVENT, listener);
}
