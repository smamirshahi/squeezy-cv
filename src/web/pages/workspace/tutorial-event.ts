import type { TutorialId } from "@pages/workspace/how-it-works-dialog";

/** Fired to open the Tutorials dialog on one tutorial (from a "How does this work?" link) */
export const OPEN_TUTORIAL_EVENT = "squeezy-cv-open-tutorial";

/** Opens the Tutorials dialog on `tutorial`, from anywhere in the app */
export function openTutorial(tutorial: TutorialId): void {
  window.dispatchEvent(
    new CustomEvent<{ tutorial: TutorialId }>(OPEN_TUTORIAL_EVENT, {
      detail: { tutorial },
    })
  );
}
